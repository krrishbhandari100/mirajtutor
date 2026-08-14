import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from Collection import (
    add_user,
    check_exists,
    add_room,
    delete_room,
    get_rooms,
    JWT_SECRET,
    JWT_ALGO,
    get_rooms_by_id,
    init_db,
)

from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import bcrypt
from os import environ
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / '.env')
BCRYPT_SALT = environ.get('BCRYPT_SALT', '$2b$12$76p17W.S2Ic6vBqXpE.8p.').encode('utf-8')
import time
import jwt
import socketio
import asyncio
import threading
import edge_tts
import base64
from tutor_resp import generate_tutor_response, generate_tutor_response_stream
from document_parser import parse_document

import json
import re


class UserSignUpSchema(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str


class UserLoginSchema(BaseModel):
    first_name: str = None
    last_name: str = None
    email: str
    password: str


class RoomSchema(BaseModel):
    token: str
    prompt: str
    roomname: str
    topic: str


app = FastAPI()

origins = [o.strip() for o in environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


def validate_signup_input(first_name: str, last_name: str, email: str, password: str):
    if not first_name.strip() or not last_name.strip():
        raise HTTPException(status_code=400, detail="First and last name are required")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if '@' not in email or '.' not in email.split('@')[-1]:
        raise HTTPException(status_code=400, detail="Invalid email address")


ALLOWED_DOC_EXTENSIONS = {".pdf"}
MAX_DOC_SIZE = 50 * 1024 * 1024  # 50 MB


@app.on_event("startup")
async def startup():
    await init_db()


def sign_jwt(email: str, first_name: str, last_name: str):
    payload = {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "expires": time.time() + 60 * 24,
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)
    return token


@app.post("/signup")
@limiter.limit("3/minute")
async def signup(request: Request, user: UserSignUpSchema):
    validate_signup_input(user.first_name, user.last_name, user.email, user.password)

    hashed_password = bcrypt.hashpw(
        user.password.encode("utf-8"),
        BCRYPT_SALT
    ).decode("utf-8")

    check_ex = await check_exists(user.email, hashed_password)
    if check_ex[0]:
        return {"jwt": None, "msg": "The user already exists", "status": "error"}
    else:
        jwt_token = sign_jwt(user.email, user.first_name, user.last_name)
        my_user = await add_user(
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            password=hashed_password,
        )
        return {"jwt": jwt_token, "msg": my_user["msg"], "status": my_user["status"]}


@app.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, user: UserLoginSchema):
    if '@' not in user.email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    hashed_password = bcrypt.hashpw(
        user.password.encode("utf-8"),
        BCRYPT_SALT
    ).decode("utf-8")

    check_ex = await check_exists(user.email, hashed_password)
    if check_ex[0]:
        jwt_token = sign_jwt(
            email=user.email,
            first_name=check_ex[1][0].first_name,
            last_name=check_ex[1][0].last_name,
        )
        return {"jwt": jwt_token, "status": "Success"}
    else:
        return {"message": "Incorrect Username and password", "status": "Error"}


@app.post("/add_rooms")
async def add_rooms(room_data: RoomSchema):
    my_room = await add_room(
        token=room_data.token,
        prompt=room_data.prompt,
        roomname=room_data.roomname,
        topic=room_data.topic,
    )
    all_rooms = await get_rooms(token=room_data.token)
    return {"status": my_room["status"], "allRooms": all_rooms}


@app.post("/fetch_rooms")
async def fetch_rooms(token: str):
    all_rooms = await get_rooms(token=token)
    return {"allRooms": all_rooms}


@app.post("/get_room_info")
async def get_room_info(room_id: str):
    return await get_rooms_by_id(room_id)


class DeleteRoomSchema(BaseModel):
    token: str
    room_id: str


@app.post("/delete_room")
async def delete_room_route(data: DeleteRoomSchema):
    result = await delete_room(token=data.token, room_id=data.room_id)
    return result


from fastapi import File, UploadFile, Form


@app.post("/upload_doc")
async def upload_document(file: UploadFile = File(...), sid: str = Form(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_DOC_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Allowed: {', '.join(ALLOWED_DOC_EXTENSIONS)}")

    try:
        file_bytes = await file.read()
        if len(file_bytes) > MAX_DOC_SIZE:
            raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_DOC_SIZE // (1024*1024)}MB")

        parsed = parse_document(file_bytes, file.filename)
        uploaded_documents[sid] = parsed
        print(f"Document uploaded for {sid}: {file.filename} (PDF, "
              f"{parsed['total_pages']} pages)")

        total_pages = len(parsed.get("pages", []))
        ack_text = f"Got it! I have received your document {file.filename}. It has {total_pages} pages. I can now answer questions from your study material. Go ahead and ask me anything."

        payload = await build_ai_reply_payload(ack_text)
        await sio.emit("ai_reply", payload, room=sid)

        return {
            "status": "success",
            "filename": file.filename,
            "doc_type": parsed["type"],
            "total_pages": total_pages,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse document")


class TTSRequest(BaseModel):
    text: str

@app.post("/tts")
async def generate_tts(request: TTSRequest):
    try:
        payload = await build_ai_reply_payload(request.text)
        return payload
    except Exception as e:
        print(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail="TTS generation failed")


# ============================================================================
# SOCKET.IO SERVER
# ============================================================================

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*"
)

# --- IN-MEMORY STATE ---
session_contexts = {}
interruption_flags = {}
chat_histories = {}
session_board_pages = {}
uploaded_documents = {}
continue_teaching_sids = set()

TTS_VOICES = {
    "hi": "hi-IN-SwaraNeural",
    "bn": "bn-IN-TanishaaNeural",
    "gu": "gu-IN-DhwaniNeural",
    "kn": "kn-IN-SapnaNeural",
    "ml": "ml-IN-SobhanaNeural",
    "mr": "mr-IN-AarohiNeural",
    "ta": "ta-IN-PallaviNeural",
    "te": "te-IN-ShrutiNeural",
    "en": "en-IN-NeerjaNeural",
}

WELCOME_TEXTS = {
    "en": "Hello! Welcome to MirajTutor. I'm your AI tutor. What would you like to learn today?",
    "hi": "नमस्ते! मिराजट्यूटर में आपका स्वागत है। मैं आपकी AI ट्यूटर हूँ। आज आप क्या सीखना चाहेंगे?",
    "bn": "নমস্কার! মিরাজটউটরে আপনাকে স্বাগত। আমি আপনার AI টিউটর। আজ আপনি কি শিখতে চান?",
    "gu": "નમસ્તે! મિરાજટ્યુટરમાં આપનું સ્વાગત છે. હું તમારી AI ટ્યુટર છું. આજે તમે શું શીખવા માંગો છો?",
    "kn": "ನಮಸ್ಕಾರ! ಮಿರಾಜ್‌ಟ್ಯೂಟರ್‌ಗೆ ಸುಸ್ವಾಗತ. ನಾನು ನಿಮ್ಮ AI ಟ್ಯೂಟರ್. ಇಂದು ನೀವು ಏನನ್ನು ಕಲಿಯಲು ಬಯಸುತ್ತೀರಿ?",
    "ml": "നമസ്കാരം! മിരാജ്‌ട്യൂട്ടറിലേക്ക് സ്വാഗതം. ഞാൻ നിങ്ങളുടെ AI ട്യൂട്ടർ ആണ്. ഇന്ന് നിങ്ങൾക്ക് എന്താണ് പഠിക്കേണ്ടത്?",
    "mr": "नमस्कार! मिराजट्युटर मध्ये आपले स्वागत आहे. मी तुमची AI ट्युटर आहे. आज तुम्ही काय शिकू इच्छिता?",
    "ta": "வணக்கம்! மிராஜ்ટூட்டருக்கு உங்களை வரவேற்கிறோம். நான் உங்கள் AI ஆசிரியர். இன்று நீங்கள் என்ன கற்றுக்கொள்ள விரும்புகிறீர்கள்?",
    "te": "నమస్కారం! మిరాజ్ ట్యూటర్‌కు సుస్వాగతం. నేను మీ AI ట్యూటర్. ఈరోజు మీరు ఏమి నేర్చుకోవాలనుకుంటున్నారు?",
}


# ── JSON Utilities (using json-repair) ────────────────────────────


from json_repair import repair_json


def strip_markdown_fences(text):
    text = text.strip()
    if text.startswith('```'):
        text = re.sub(r'^```[a-z]*\s*\n?', '', text)
        text = re.sub(r'\n?```\s*$', '', text)
    return text.strip()


def normalize_keys(d):
    key_map = {
        'speech_response': 'speakingresponse',
        'speech': 'speakingresponse',
        'response': 'speakingresponse',
        'board': 'boardresponse',
        'board_response': 'boardresponse',
        'board_data': 'boardresponse',
    }
    if isinstance(d, dict):
        for old, new in key_map.items():
            if old in d and new not in d:
                d[new] = d.pop(old)
        if 'boardresponse' in d and isinstance(d['boardresponse'], dict):
            normalize_keys(d['boardresponse'])
    return d


def parse_ollama_json(text):
    try:
        clean = strip_markdown_fences(text)
        match = re.search(r'\{.*\}', clean, re.DOTALL)
        if not match:
            return None, False
        parsed = repair_json(match.group(0).strip(), return_objects=True)
        if isinstance(parsed, dict):
            parsed = normalize_keys(parsed)
        return parsed, True
    except Exception as e:
        print(f"❌ json-repair failed: {e}")
        print(f"  Text: {text[:200]}...")
        # Last resort: fallback regex extraction
        m = re.search(r'"speakingresponse"\s*:\s*"((?:[^"\\]|\\.)*)"', text, re.DOTALL)
        if m:
            speaking = re.sub(r'[\*_#]+', '', m.group(1)).strip()
            return {'speakingresponse': speaking, 'boardresponse': {}, 'has_more': False, 'discardQueue': False}, True
        return None, False


def _try_extract_speakingresponse(buffer):
    try:
        match = re.search(r'"speakingresponse"\s*:\s*"((?:[^"\\]|\\.)*)"', buffer, re.DOTALL)
        if match:
            text = re.sub(r'[\*_#]+', '', match.group(1)).strip()
            return text
    except:
        pass
    return None


async def build_ai_reply_payload(text: str, lang="en"):
    print(f"🔊 Building AI reply payload for text: {text[:50]}...")
    voice = TTS_VOICES.get(lang, "en-IN-NeerjaNeural")
    communicate = edge_tts.Communicate(text, voice, boundary="WordBoundary")

    audio_data = b""
    word_boundaries = []

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
        elif chunk["type"] == "WordBoundary":
            word_boundaries.append({
                "word": chunk["text"],
                "time": chunk["offset"] / 10000000,
                "duration": chunk["duration"] / 10000000,
            })

    if len(audio_data) == 0:
        print("⚠️ WARNING: No audio data received from Edge TTS!")

    return {
        "text": text,
        "audio": base64.b64encode(audio_data).decode("utf-8"),
        "words": [w["word"] for w in word_boundaries],
        "wtimes": [w["time"] for w in word_boundaries],
        "wdurations": [w["duration"] for w in word_boundaries],
    }


async def _stream_ollama_response(subject, topic, system_prompt, chat_history, msg,
                                   board_context="", document_images=None,
                                   speaking_lang="en", writing_lang="en"):
    loop = asyncio.get_running_loop()
    queue = asyncio.Queue()

    def _run():
        try:
            for token in generate_tutor_response_stream(
                subject, topic, system_prompt, chat_history, msg,
                board_context=board_context, document_images=document_images,
                speaking_lang=speaking_lang, writing_lang=writing_lang,
            ):
                loop.call_soon_threadsafe(queue.put_nowait, token)
        except Exception as e:
            print(f"❌ Stream error: {e}")
            loop.call_soon_threadsafe(queue.put_nowait, None)
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()

    while True:
        token = await queue.get()
        if token is None:
            break
        yield token


# ── Socket.IO Events ────────────────────────────────────────────────


@sio.event
async def connect(sid, environ):
    print(f"🟢 User connected! SID: {sid}")
    interruption_flags[sid] = False
    session_contexts[sid] = {}
    chat_histories[sid] = []
    session_board_pages[sid] = {"current": 1, "total": 1, "cmd_count": 0}


@sio.event
async def user_language(sid, data):
    lang = data.get('lang', 'en') if isinstance(data, dict) else data
    ctx = session_contexts.get(sid, {})
    ctx['speaking_lang'] = lang
    session_contexts[sid] = ctx
    welcome_text = WELCOME_TEXTS.get(lang, WELCOME_TEXTS['en'])
    payload = await build_ai_reply_payload(welcome_text, lang=lang)
    await sio.emit("ai_reply", payload, room=sid)
    print(f"🌐 Welcome sent in {lang}")


@sio.event
async def disconnect(sid):
    print(f"🔴 User disconnected! SID: {sid}")
    interruption_flags.pop(sid, None)
    session_contexts.pop(sid, None)
    chat_histories.pop(sid, None)
    session_board_pages.pop(sid, None)
    uploaded_documents.pop(sid, None)
    continue_teaching_sids.discard(sid)


@sio.event
async def request_board_image(sid, data):
    page_num = data.get("page", 1) if isinstance(data, dict) else data
    doc_info = uploaded_documents.get(sid)
    if doc_info and doc_info.get("type") == "pdf":
        pages = doc_info.get("pages", [])
        for p in pages:
            if p["number"] == page_num:
                await sio.emit("board_image", {
                    "page": page_num,
                    "image_base64": p["image_base64"],
                }, room=sid)
                print(f"Sent board image page {page_num} to {sid}")
                return
        print(f"Page {page_num} not found in document for {sid}")
    else:
        print(f"No document or unsupported type for board_image request from {sid}")


@sio.event
async def session_context(sid, data):
    print(f"📚 Session context received for {sid}: {data}")
    session_contexts[sid] = data or {}


@sio.event
async def session_cancelled(sid):
    print(f"🚫 Session cancelled for {sid}")
    interruption_flags[sid] = True
    chat_histories[sid] = []


@sio.event
async def speech_started(sid):
    print(f"👂 Student {sid} started speaking...")
    interruption_flags[sid] = False


@sio.event
async def user_interrupted(sid):
    print(f"🛑 Student {sid} interrupted the AI!")
    interruption_flags[sid] = True
    continue_teaching_sids.discard(sid)
    if session_board_pages[sid]['cmd_count'] > 0:
        session_board_pages[sid]['total'] += 1
        session_board_pages[sid]['current'] = session_board_pages[sid]['total']
        session_board_pages[sid]['cmd_count'] = 0


@sio.event
async def speech_ended(sid, data=None):
    print(f"🛑 {sid} stopped speaking")

    if interruption_flags.get(sid):
        return

    user_text = (data.get('text', '') if isinstance(data, dict) else '').strip()
    if not user_text:
        print("⚠️ speech_ended: no transcript received")
        return

    print(f"📝 User said: {user_text}")

    try:
        ctx = session_contexts.get(sid, {})
        topic = ctx.get('topic', '')
        system_prompt = ctx.get('prevCtx', '')
        speaking_lang = ctx.get('speaking_lang', 'en')
        writing_lang = ctx.get('writing_lang', 'en')
        current_history = chat_histories.get(sid, [])

        board_pages = session_board_pages.get(sid, {"current": 1, "total": 1, "cmd_count": 0})
        cmd_count = board_pages.get('cmd_count', 0)
        board_ctx = f"Page {board_pages['current']} of {board_pages['total']} ({cmd_count} items on board, LIMIT ~8 items before overwriting)"

        doc_info = uploaded_documents.get(sid, {})
        doc_images = [p["image_base64"] for p in doc_info.get("pages", [])]

        if interruption_flags.get(sid):
            return

        # ── STREAMING OLLAMA + PARALLEL TTS ──
        buffer = ""
        tts_task = None
        speaking_response_early = None

        async for token in _stream_ollama_response(
            '', topic, system_prompt, current_history, user_text,
            board_context=board_ctx, document_images=doc_images,
            speaking_lang=speaking_lang, writing_lang=writing_lang,
        ):
            if interruption_flags.get(sid):
                if tts_task:
                    tts_task.cancel()
                return
            buffer += token
            if tts_task is None:
                text = _try_extract_speakingresponse(buffer)
                if text:
                    speaking_response_early = text
                    print(f"🎯 Speaking text detected early ({len(text)} chars), starting TTS in parallel...")
                    tts_task = asyncio.create_task(
                        build_ai_reply_payload(text, lang=speaking_lang)
                    )

        ai_response_text = buffer

        if interruption_flags.get(sid):
            if tts_task:
                tts_task.cancel()
            return

        # Debug: print raw model output
        print(f"\n{'='*60}\n📦 MODEL RAW OUTPUT:\n{ai_response_text}\n{'='*60}")

        if not ai_response_text or interruption_flags.get(sid):
            return

        chunk = None
        chunk_has_more = False
        parsed, ok = parse_ollama_json(ai_response_text)
        if ok and isinstance(parsed, dict):
            chunk = parsed
            chunk_has_more = parsed.get('has_more', False)
            print(f"📦 PARSED chunk (has_more={chunk_has_more})")
        else:
            print("⚠️ JSON parse failed")
            chunk = {'speakingresponse': "I heard you, but I could not generate a proper response.", 'boardresponse': {}, 'has_more': False, 'discardQueue': False}

        if not chunk.get('speakingresponse', '').strip():
            chunk['speakingresponse'] = "I heard you, but I could not generate a response."

        if chunk.get('discardQueue'):
            print("🧹 Model says: discard queue — flushing old chunks")
            asyncio.create_task(sio.emit("queue_clear", {}, room=sid))

        chunk['speakingresponse'] = re.sub(r'[\*_#]+', '', chunk['speakingresponse']).strip()

        # Update board state from this chunk
        br = chunk.get('boardresponse', {})
        action = br.get('action', 'draw') if isinstance(br, dict) else 'draw'
        if action == 'newpage':
            if session_board_pages[sid]['cmd_count'] > 0:
                session_board_pages[sid]['total'] += 1
                session_board_pages[sid]['current'] = session_board_pages[sid]['total']
            session_board_pages[sid]['cmd_count'] = 0
        elif action == 'gotopage':
            target = br.get('page', 0)
            if isinstance(target, int) and 0 < target <= session_board_pages[sid]['total']:
                session_board_pages[sid]['current'] = target

        chunk['_targetPage'] = session_board_pages[sid]['current']

        if isinstance(br, dict):
            if action in ('clear', 'erasepage'):
                session_board_pages[sid]['cmd_count'] = 0
            elif action != 'newpage':
                commands = br.get('commands', [])
                if commands:
                    new_items = sum(1 for cmd in commands if cmd.get('type') not in ('erase', 'clear'))
                    session_board_pages[sid]['cmd_count'] = session_board_pages[sid].get('cmd_count', 0) + new_items

        # Save chat history
        if sid not in chat_histories:
            chat_histories[sid] = []
        chat_histories[sid].append({"role": "user", "content": user_text})
        chat_histories[sid].append({"role": "assistant", "content": ai_response_text})
        if len(chat_histories[sid]) > 10:
            first = chat_histories[sid][:2]
            rest = chat_histories[sid][2:]
            chat_histories[sid] = first + rest[-8:]

        print(f"🎯 SPEAKING:\n{chunk['speakingresponse'][:300]}\n{'='*60}")

        if tts_task:
            print("⏳ Waiting for early TTS to complete...")
            payload = await tts_task
            payload['text'] = chunk['speakingresponse']
        else:
            print(f"🔊 Generating TTS for first chunk...")
            payload = await build_ai_reply_payload(chunk['speakingresponse'], lang=speaking_lang)

        payload['boardresponse'] = chunk.get('boardresponse')
        payload['itemIndex'] = 0
        payload['totalItems'] = 'more' if chunk_has_more else 1
        payload['targetPage'] = chunk.get('_targetPage', 1)
        await sio.emit("ai_reply", payload, room=sid)

        # Spawn background continuation if more chunks
        if chunk_has_more:
            continue_teaching_sids.add(sid)
            asyncio.create_task(continue_teaching(sid, topic, system_prompt, doc_images, chunk_index=1, speaking_lang=speaking_lang, writing_lang=writing_lang))

    except Exception as e:
        print(f"❌ speech_ended error for {sid}: {e}")


async def continue_teaching(sid, topic, system_prompt, doc_images, chunk_index=1, speaking_lang="en", writing_lang="en"):
    try:
        while sid in continue_teaching_sids and not interruption_flags.get(sid):
            print(f"🧠 Generating AI response (continuation chunk {chunk_index})...")

            board_pages = session_board_pages.get(sid, {"current": 1, "total": 1, "cmd_count": 0})
            cmd_count = board_pages.get('cmd_count', 0)
            board_ctx = f"Page {board_pages['current']} of {board_pages['total']} ({cmd_count} items on board, LIMIT ~8 items before overwriting)"

            current_history = chat_histories.get(sid, [])

            ai_response_text = await asyncio.to_thread(
                generate_tutor_response,
                '', topic, system_prompt, current_history, '',
                board_context=board_ctx,
                document_images=doc_images,
                is_continuation=True,
                speaking_lang=speaking_lang,
                writing_lang=writing_lang,
            )

            if not ai_response_text or interruption_flags.get(sid):
                break

            print(f"\n{'='*60}\n📦 CONTINUATION RAW OUTPUT:\n{ai_response_text}\n{'='*60}")

            chunk = None
            has_more = False
            parsed, ok = parse_ollama_json(ai_response_text)
            if ok and isinstance(parsed, dict):
                chunk = parsed
                has_more = parsed.get('has_more', False)
            else:
                print(f"⚠️ Continuation parse failed — stopping")
                break

            if not chunk or not chunk.get('speakingresponse', '').strip():
                break

            chunk['speakingresponse'] = re.sub(r'[\*_#]+', '', chunk['speakingresponse']).strip()

            # Update board state
            br = chunk.get('boardresponse', {})
            action = br.get('action', 'draw') if isinstance(br, dict) else 'draw'
            if action == 'newpage':
                if session_board_pages[sid]['cmd_count'] > 0:
                    session_board_pages[sid]['total'] += 1
                    session_board_pages[sid]['current'] = session_board_pages[sid]['total']
                session_board_pages[sid]['cmd_count'] = 0
            elif action == 'gotopage':
                target = br.get('page', 0)
                if isinstance(target, int) and 0 < target <= session_board_pages[sid]['total']:
                    session_board_pages[sid]['current'] = target

            chunk['_targetPage'] = session_board_pages[sid]['current']

            if isinstance(br, dict):
                if action in ('clear', 'erasepage'):
                    session_board_pages[sid]['cmd_count'] = 0
                elif action != 'newpage':
                    commands = br.get('commands', [])
                    if commands:
                        new_items = sum(1 for cmd in commands if cmd.get('type') not in ('erase', 'clear'))
                        session_board_pages[sid]['cmd_count'] = session_board_pages[sid].get('cmd_count', 0) + new_items

            # Save to chat history
            if sid in chat_histories:
                chat_histories[sid].append({"role": "assistant", "content": ai_response_text})
                if len(chat_histories[sid]) > 10:
                    first = chat_histories[sid][:2]
                    rest = chat_histories[sid][2:]
                    chat_histories[sid] = first + rest[-8:]

            print(f"🎯 CONTINUATION ({chunk_index}): {chunk['speakingresponse'][:200]}")

            payload = await build_ai_reply_payload(chunk['speakingresponse'], lang=speaking_lang)
            payload['boardresponse'] = chunk.get('boardresponse')
            payload['itemIndex'] = chunk_index
            payload['totalItems'] = 'more' if has_more else chunk_index
            payload['targetPage'] = chunk.get('_targetPage', 1)
            await sio.emit("ai_reply", payload, room=sid)

            chunk_index += 1

            if not has_more:
                break

    finally:
        continue_teaching_sids.discard(sid)


app = socketio.ASGIApp(sio, app)
