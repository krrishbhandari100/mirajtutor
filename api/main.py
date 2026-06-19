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
import edge_tts
import base64
import numpy as np
from faster_whisper import WhisperModel
from tutor_resp import generate_tutor_response
from document_parser import parse_document

import json
import json5
import re

print("⏳ Loading model... (This might take time if downloading)")
try:
    model = WhisperModel("medium", device="cpu", compute_type="int8")
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"❌ Error: {e}")


class UserSignUpSchema(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str


class UserLoginSchema(BaseModel):
    email: str
    password: str


class RoomSchema(BaseModel):
    token: str
    prompt: str
    roomname: str
    topic: str


app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

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


# ============================================================================
# UPLOAD DOCUMENT ENDPOINT
# ============================================================================

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


# ============================================================================
# TEXT-TO-SPEECH ENDPOINT (for connecting sentence playback)
# ============================================================================

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
active_audio_buffers = {}
session_contexts = {}
interruption_flags = {}
chat_histories = {} 
processing_flags = {}
session_board_pages = {}  # { sid: { current: 1, total: 1 } } 
uploaded_documents = {}  # { sid: { text, pages[], images[], type, filename } }
continue_teaching_sids = set()  # SIDs with active continuation background tasks

TTS_VOICES = {
    "hi": "hi-IN-SwaraNeural",
    "bn": "bn-IN-TanishaaNeural",
    "gu": "gu-IN-DhwaniNeural",
    "kn": "kn-IN-SapnaNeural",
    "ml": "ml-IN-SobhanaNeural",
    "mr": "mr-IN-AarohiNeural",
    "ta": "ta-IN-PallaviNeural",
    "te": "te-IN-ShrutiNeural",
    "ur": "ur-IN-GulNeural",
    "ne": "ne-NP-HemkalaNeural",
    "en": "en-IN-NeerjaNeural",
}

WELCOME_TEXTS = {
    "en": "Hello! Welcome to MirajTutor. I'm your AI tutor. What would you like to learn today?",
    "hi": "Namaste! MirajTutor mein aapka swagat hai. Main aapki AI tutor hoon. Aaj aap kya seekhna chahenge?",
    "bn": "Nomoshkar! MirajTutor-e apnake swagatom. Ami apnar AI tutor. Aaj aap ki shikhte chaan?",
    "gu": "Namaste! MirajTutor ma aapno swagat che. Hu aapni AI tutor chhu. Aaj tame shu shikhecha?",
    "kn": "Namaskara! MirajTutor-ge suswagata. Naanu nimma AI tutor. Ivattu neevu yenannu kaliyalike bayasuviri?",
    "ml": "Namaskaram! MirajTutor-il swagatam. Njan ningalude AI tutor aanu. Innu ningalkk enthu padikkanam?",
    "mr": "Namaskar! MirajTutor madhye aaple swagat ahe. Mi tumchi AI tutor ahe. Aaj tumhi kaya shiknyacha aahe?",
    "ne": "Namaste! MirajTutor-ma swagat chha. Ma timro AI tutor hu. Aaja timi ke sikna chahanchhau?",
    "ta": "Vanakkam! MirajTutor-kku varaveRkkiRom. Naan ungaL AI tutor. InRu neenga enna kaRRa virumbugiRgiRkaL?",
    "te": "Namaskaram! MirajTutor-ki suswagatam. Nenu mee AI tutor. IvuDu miru emi nerchukOvasukunnAru?",
    "ur": "Aadaab! MirajTutor mein aapka istaqbaal hai. Main aapki AI tutor hoon. Aaj aap kya seekhna chahenge?",
}


# ── JSON Utilities ──────────────────────────────────────────────────


def strip_markdown_fences(text):
    text = text.strip()
    if text.startswith('```'):
        text = re.sub(r'^```(?:json)?\s*\n?', '', text)
        text = re.sub(r'\n?```\s*$', '', text)
    return text.strip()

def extract_speaking_fallback(raw):
    m = re.search(r'content\s*:\s*["\']?(.*?)(?:["\']?\s*,\s*(?:\w+|"\w+")\s*:|\s*,\s*boardresponse)', raw, re.DOTALL)
    if m:
        return m.group(1).strip()
    m = re.search(r'(?:speakingresponse|"speakingresponse")\s*:\s*["\']?(.*?)["\']?\s*(?:,\s*(?:\w+|"\w+")\s*:|\Z)', raw, re.DOTALL)
    if m:
        return m.group(1).strip()
    return None

def parse_ollama_json(text):
    """Parse LLM output as JSON using JSON5 (handles comments, trailing commas, etc.)."""
    try:
        clean = strip_markdown_fences(text)
        match = re.search(r'\{.*\}', clean, re.DOTALL)
        if not match:
            return None, False
        parsed = json5.loads(match.group(0).strip())
        return parsed, True
    except Exception as e:
        print(f"🔍 parse_ollama_json FAILED: {e}")
        print(f"🔍 REPR of text:\n{repr(match.group(0).strip())}")
        return None, False


async def build_ai_reply_payload(text: str, lang="en"):
    print(f"🔊 Building AI reply payload for text: {text[:50]}...")
    voice = TTS_VOICES.get(lang, "en-IN-NeerjaNeural")
    communicate = edge_tts.Communicate(text, voice, boundary="WordBoundary")

    audio_data = b""
    word_boundaries = []

    chunk_count = 0
    async for chunk in communicate.stream():
        chunk_count += 1
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
            if chunk_count % 10 == 0:  # Log every 10 chunks to avoid spam
                print(f"🔊 Received audio chunk {chunk_count}, size: {len(chunk['data'])} bytes")
        elif chunk["type"] == "WordBoundary":
            word_boundaries.append({
                "word": chunk["text"],
                "time": chunk["offset"] / 10000000,
                "duration": chunk["duration"] / 10000000,
            })

    print(f"🔊 Finished building audio payload: {len(audio_data)} bytes audio, {len(word_boundaries)} word boundaries")
    
    if len(audio_data) == 0:
        print("⚠️ WARNING: No audio data received from Edge TTS!")
    
    return {
        "text": text,
        "audio": base64.b64encode(audio_data).decode("utf-8"),
        "words": [w["word"] for w in word_boundaries],
        "wtimes": [w["time"] for w in word_boundaries],
        "wdurations": [w["duration"] for w in word_boundaries],
    }


@sio.event
async def connect(sid, environ):
    print(f"🟢 User connected! SID: {sid}")
    active_audio_buffers[sid] = []
    interruption_flags[sid] = False
    session_contexts[sid] = {}
    chat_histories[sid] = [] 
    processing_flags[sid] = False
    session_board_pages[sid] = {"current": 1, "total": 1, "cmd_count": 0}


@sio.event
async def user_language(sid, data):
    lang = data.get('lang', 'en') if isinstance(data, dict) else data
    ctx = session_contexts.get(sid, {})
    ctx['speaking_lang'] = lang
    ctx['writing_lang'] = lang
    session_contexts[sid] = ctx
    welcome_text = WELCOME_TEXTS.get(lang, WELCOME_TEXTS['en'])
    payload = await build_ai_reply_payload(welcome_text, lang=lang)
    await sio.emit("ai_reply", payload, room=sid)
    print(f"🌐 Welcome sent in {lang}")


@sio.event
async def disconnect(sid):
    print(f"🔴 User disconnected! SID: {sid}")
    active_audio_buffers.pop(sid, None)
    interruption_flags.pop(sid, None)
    session_contexts.pop(sid, None)
    chat_histories.pop(sid, None) 
    processing_flags.pop(sid, None)
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
    print(f"🚫 Session cancelled for {sid} — flushing buffer.")
    active_audio_buffers[sid] = []
    interruption_flags[sid] = True
    chat_histories[sid] = [] 


@sio.event
async def speech_started(sid):
    # 💥 IGNORE if AI is currently thinking!
    if processing_flags.get(sid):
        return 
        
    print(f"👂 Student {sid} started speaking...")
    active_audio_buffers[sid] = []
    interruption_flags[sid] = False


@sio.event
async def audio_chunk(sid, data):
    # 💥 IGNORE background noise chunks if AI is thinking!
    if processing_flags.get(sid):
        return 
        
    try:
        audio_array = np.frombuffer(data, dtype=np.float32)
        if sid not in active_audio_buffers:
            active_audio_buffers[sid] = []
        if audio_array.size > 0:
            active_audio_buffers[sid].append(audio_array)
    except Exception as e:
        print(f"❌ audio_chunk error for {sid}: {e}")


@sio.event
async def user_interrupted(sid):
    print(f"🛑 Student {sid} interrupted the AI!")
    interruption_flags[sid] = True
    processing_flags[sid] = False  # Allow new speech to flow immediately
    continue_teaching_sids.discard(sid)  # Stop background continuation
    # Advance to a new page if the current one has content
    if session_board_pages[sid]['cmd_count'] > 0:
        session_board_pages[sid]['total'] += 1
        session_board_pages[sid]['current'] = session_board_pages[sid]['total']
        session_board_pages[sid]['cmd_count'] = 0


@sio.event
async def speech_ended(sid):
    print(f"🛑 {sid} stopped speaking")

    # Guard against double-triggers
    if processing_flags.get(sid) or interruption_flags.get(sid):
        return

    if sid not in active_audio_buffers or len(active_audio_buffers[sid]) == 0:
        return

    # 💥 LOCK THE MIC: The AI is busy now!
    processing_flags[sid] = True 

    try:
        full_audio = np.concatenate(active_audio_buffers[sid]).astype(np.float32)
        active_audio_buffers[sid] = []

        if full_audio.size == 0:
            return

        print("🎤 Transcribing...")
        session_lang = session_contexts.get(sid, {}).get('speaking_lang', 'en')
        segments, info = await asyncio.to_thread(
            model.transcribe,
            full_audio,
            language=session_lang,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
            condition_on_previous_text=False,
            temperature=0.0,
        )

        user_text = "".join(segment.text for segment in segments).strip()
        user_lang = info.language
        print(f"📝 Raw Whisper Output ({user_lang}): {user_text}")

        # 💥 The Ghost Filter (Blacklist) — only for English
        if user_lang == "en":
            clean_text = user_text.lower().replace(".", "").replace("!", "").replace("?", "").strip()
            ghost_phrases = ["thank you", "okay", "ok", "thanks for watching", "subscribe", "bye", "thank you so much", "yeah"]

            if not clean_text or len(clean_text) <= 1 or clean_text in ghost_phrases:
                print("👻 Whisper hallucination detected and ignored.")
                return

        print("✅ Clean User Text:", user_text)

        if interruption_flags.get(sid):
            return

        print("🧠 Generating AI response (first chunk)...")
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

        ai_response_text = await asyncio.to_thread(
            generate_tutor_response,
            '', topic, system_prompt, current_history, user_text,
            board_context=board_ctx,
            document_images=doc_images,
            is_continuation=False,
            speaking_lang=speaking_lang,
            writing_lang=writing_lang,
        )

        try:
            import re as _re
            _match = _re.search(r'\{.*\}', ai_response_text, _re.DOTALL)
            if _match:
                _parsed, _ = json.JSONDecoder().raw_decode(_match.group(0).strip())
                print(f"\n{'='*60}\n📦 MODEL JSON RESPONSE:\n{json.dumps(_parsed, indent=2, ensure_ascii=False)}\n{'='*60}")
            else:
                print(f"\n{'='*60}\n📦 MODEL RAW (no JSON found):\n{ai_response_text}\n{'='*60}")
        except Exception as _dbg_e:
            print(f"\n{'='*60}\n📦 MODEL RAW (parse failed: {_dbg_e}):\n{ai_response_text}\n{'='*60}")

        if not ai_response_text or interruption_flags.get(sid):
            return

        # --- ROBUST JSON EXTRACTION (single chunk) ---
        chunk = None
        chunk_has_more = False
        parsed, ok = parse_ollama_json(ai_response_text)
        if ok and isinstance(parsed, dict):
            chunk = parsed
            chunk_has_more = parsed.get('has_more', False)
            print(f"📦 PARSED single chunk (has_more={chunk_has_more})")
        else:
            print("⚠️ JSON parse failed — trying fallback extraction")
            fallback_text = extract_speaking_fallback(ai_response_text)
            speaking_text = fallback_text if fallback_text else "I heard you, but I could not generate a proper response."
            if speaking_text:
                chunk = {'speakingresponse': speaking_text, 'boardresponse': {}}

        if not chunk or not chunk.get('speakingresponse', '').strip():
            speaking_text = "I heard you, but I could not generate a response."
            chunk = {'speakingresponse': speaking_text, 'boardresponse': {}}
            chunk_has_more = False

        chunk['speakingresponse'] = re.sub(r'[\*_#]+', '', chunk['speakingresponse']).strip()

        # Update board state from this chunk
        br = chunk.get('boardresponse', {})
        if isinstance(br, dict) and br.get('action') == 'newpage':
            if session_board_pages[sid]['cmd_count'] > 0:
                session_board_pages[sid]['total'] += 1
                session_board_pages[sid]['current'] = session_board_pages[sid]['total']
            session_board_pages[sid]['cmd_count'] = 0
        elif isinstance(br, dict) and br.get('action') == 'gotopage':
            target = br.get('page', 0)
            if isinstance(target, int) and 0 < target <= session_board_pages[sid]['total']:
                session_board_pages[sid]['current'] = target

        chunk['_targetPage'] = session_board_pages[sid]['current']

        if isinstance(br, dict):
            action = br.get('action', '')
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
        chat_histories[sid].append({"role": "assistant", "content": chunk['speakingresponse']})
        if len(chat_histories[sid]) > 10:
            first = chat_histories[sid][:2]
            rest = chat_histories[sid][2:]
            chat_histories[sid] = first + rest[-8:]

        print(f"🎯 EXTRACTED SPEAKING_TEXT:\n{chunk['speakingresponse'][:300]}\n{'='*60}")

        # TTS and emit first chunk
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
        
    finally:
        # 💥 UNLOCK THE MIC: AI is done, user can speak again!
        processing_flags[sid] = False


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

            # Debug: print raw model output
            try:
                import re as _re
                _match = _re.search(r'\{.*\}', ai_response_text, _re.DOTALL)
                if _match:
                    _parsed = json5.loads(_match.group(0).strip())
                    print(f"\n{'='*60}\n📦 CONTINUATION MODEL RESPONSE:\n{json.dumps(_parsed, indent=2, ensure_ascii=False)}\n{'='*60}")
                else:
                    print(f"\n{'='*60}\n📦 CONTINUATION RAW (no JSON):\n{ai_response_text}\n{'='*60}")
            except Exception as _dbg_e:
                print(f"\n{'='*60}\n📦 CONTINUATION RAW (parse failed: {_dbg_e}):\n{ai_response_text}\n{'='*60}")

            # Parse the single chunk using shared utilities
            chunk = None
            has_more = False
            parsed, ok = parse_ollama_json(ai_response_text)
            if ok and isinstance(parsed, dict):
                chunk = parsed
                has_more = parsed.get('has_more', False)
            else:
                print(f"⚠️ Continuation parse failed — trying fallback extraction")
                fallback_text = extract_speaking_fallback(ai_response_text)
                if fallback_text:
                    chunk = {'speakingresponse': fallback_text, 'boardresponse': {}, '_targetPage': session_board_pages.get(sid, {}).get('current', 1)}
                    has_more = False
                else:
                    print(f"⚠️ Fallback also failed — stopping continuation")
                    break

            if not chunk or not chunk.get('speakingresponse', '').strip():
                break

            chunk['speakingresponse'] = re.sub(r'[\*_#]+', '', chunk['speakingresponse']).strip()

            # Update board state
            br = chunk.get('boardresponse', {})
            if isinstance(br, dict) and br.get('action') == 'newpage':
                if session_board_pages[sid]['cmd_count'] > 0:
                    session_board_pages[sid]['total'] += 1
                    session_board_pages[sid]['current'] = session_board_pages[sid]['total']
                session_board_pages[sid]['cmd_count'] = 0
            elif isinstance(br, dict) and br.get('action') == 'gotopage':
                target = br.get('page', 0)
                if isinstance(target, int) and 0 < target <= session_board_pages[sid]['total']:
                    session_board_pages[sid]['current'] = target

            chunk['_targetPage'] = session_board_pages[sid]['current']

            if isinstance(br, dict):
                action = br.get('action', '')
                if action in ('clear', 'erasepage'):
                    session_board_pages[sid]['cmd_count'] = 0
                elif action != 'newpage':
                    commands = br.get('commands', [])
                    if commands:
                        new_items = sum(1 for cmd in commands if cmd.get('type') not in ('erase', 'clear'))
                        session_board_pages[sid]['cmd_count'] = session_board_pages[sid].get('cmd_count', 0) + new_items

            # Save to chat history
            if sid in chat_histories:
                chat_histories[sid].append({"role": "assistant", "content": chunk['speakingresponse']})
                if len(chat_histories[sid]) > 10:
                    first = chat_histories[sid][:2]
                    rest = chat_histories[sid][2:]
                    chat_histories[sid] = first + rest[-8:]

            print(f"🎯 CONTINUATION ({chunk_index}): {chunk['speakingresponse'][:200]}")

            # TTS and emit
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