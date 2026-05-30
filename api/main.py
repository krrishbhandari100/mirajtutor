from fastapi import FastAPI
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
)

from fastapi.middleware.cors import CORSMiddleware
import bcrypt
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
def signup(user: UserSignUpSchema):
    hashed_password = bcrypt.hashpw(
        user.password.encode("utf-8"),
        b"$2b$12$76p17W.S2Ic6vBqXpE.8p."
    ).decode("utf-8")

    if check_exists(user.email, hashed_password)[0]:
        return {"jwt": None, "msg": "The user already exists", "status": "error"}
    else:
        jwt_token = sign_jwt(user.email, user.first_name, user.last_name)
        my_user = add_user(
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            password=hashed_password,
        )
        return {"jwt": jwt_token, "msg": my_user["msg"], "status": my_user["status"]}


@app.post("/login")
def login(user: UserLoginSchema):
    hashed_password = bcrypt.hashpw(
        user.password.encode("utf-8"),
        b"$2b$12$76p17W.S2Ic6vBqXpE.8p."
    ).decode("utf-8")

    check_ex = check_exists(user.email, hashed_password)
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
def add_rooms(room_data: RoomSchema):
    my_room = add_room(
        token=room_data.token,
        prompt=room_data.prompt,
        roomname=room_data.roomname,
        topic=room_data.topic,
    )
    all_rooms = get_rooms(token=room_data.token)
    return {"status": my_room["status"], "allRooms": all_rooms}


@app.post("/fetch_rooms")
def fetch_rooms(token: str):
    all_rooms = get_rooms(token=token)
    return {"allRooms": all_rooms}


@app.post("/get_room_info")
def get_room_info(room_id: str):
    return get_rooms_by_id(room_id)


class DeleteRoomSchema(BaseModel):
    token: str
    room_id: str


@app.post("/delete_room")
def delete_room_route(data: DeleteRoomSchema):
    result = delete_room(token=data.token, room_id=data.room_id)
    return result


# ============================================================================
# UPLOAD DOCUMENT ENDPOINT
# ============================================================================

from fastapi import File, UploadFile, Form, HTTPException


@app.post("/upload_doc")
async def upload_document(file: UploadFile = File(...), sid: str = Form(...)):
    try:
        file_bytes = await file.read()
        parsed = parse_document(file_bytes, file.filename)
        uploaded_documents[sid] = parsed
        print(f"Document uploaded for {sid}: {file.filename} ({parsed['type']}, "
              f"{len(parsed.get('text', ''))} chars, "
              f"{len(parsed.get('pages', parsed.get('images', [])))} pages/images)")

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


async def build_ai_reply_payload(text: str):
    print(f"🔊 Building AI reply payload for text: {text[:50]}...")
    voice = "en-IN-NeerjaNeural"
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
    session_board_pages[sid] = {"current": 1, "total": 1}

    welcome_text = "Hello! Welcome to MirajTutor. I'm your AI tutor. What would you like to learn today?"
    payload = await build_ai_reply_payload(welcome_text)
    await sio.emit("ai_reply", payload, room=sid)


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
        segments, info = await asyncio.to_thread(
            model.transcribe,
            full_audio,
            language="en",
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
            condition_on_previous_text=False,
            temperature=0.0,
            # 💥 The Initial Prompt Anchor
            initial_prompt="Hello, I am a student asking a technical question about the topic." 
        )

        user_text = "".join(segment.text for segment in segments).strip()
        print("📝 Raw Whisper Output:", user_text)

        # 💥 The Ghost Filter (Blacklist)
        clean_text = user_text.lower().replace(".", "").replace("!", "").replace("?", "").strip()
        ghost_phrases = ["thank you", "okay", "ok", "thanks for watching", "subscribe", "bye", "thank you so much", "yeah"]

        if not clean_text or len(clean_text) <= 1 or clean_text in ghost_phrases:
            print("👻 Whisper hallucination detected and ignored.")
            return

        print("✅ Clean User Text:", user_text)

        if interruption_flags.get(sid):
            return

        print("🧠 Generating AI response...")
        ctx = session_contexts.get(sid, {})
        topic = ctx.get('topic', '')
        system_prompt = ctx.get('prevCtx', '')
        current_history = chat_histories.get(sid, [])
        
        board_pages = session_board_pages.get(sid, {"current": 1, "total": 1, "cmd_count": 0})
        cmd_count = board_pages.get('cmd_count', 0)
        board_ctx = f"Page {board_pages['current']} of {board_pages['total']} ({cmd_count} items on board, LIMIT ~8 items before overwriting)"

        doc_info = uploaded_documents.get(sid, {})
        doc_text = doc_info.get("text", "")
        doc_images = [p["image_base64"] for p in doc_info.get("pages", [])[:4]
                     ] if doc_info.get("type") == "pdf" else [
            img["image_base64"] for img in doc_info.get("images", [])[:4]
        ]

        ai_response_text = await asyncio.to_thread(
            generate_tutor_response,
            '', topic, system_prompt, current_history, user_text,
            board_context=board_ctx,
            document_text=doc_text,
            document_images=doc_images
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

        # --- ROBUST JSON EXTRACTION ---
        speaking_text = ai_response_text 
        clean_json_str = None
        chunks = None

        def strip_markdown_fences(text):
            text = text.strip()
            if text.startswith('```'):
                text = re.sub(r'^```(?:json)?\s*\n?', '', text)
                text = re.sub(r'\n?```\s*$', '', text)
            return text.strip()

        def sanitize_json_newlines(text):
            """Replace literal newlines inside JSON string values with \\n."""
            result = []
            in_string = False
            escape = False
            for ch in text:
                if escape:
                    result.append(ch)
                    escape = False
                    continue
                if ch == '\\' and in_string:
                    escape = True
                    result.append(ch)
                    continue
                if ch == '"':
                    in_string = not in_string
                    result.append(ch)
                    continue
                if in_string and ch in '\n\r':
                    result.append('\\n')
                    continue
                result.append(ch)
            return ''.join(result)

        def repair_json(text):
            """Fix common JSON issues from LLM output."""
            text = re.sub(r',\s*([}\]])', r'\1', text)
            text = re.sub(r'\}\s*\{', '},{', text)
            text = re.sub(r'\]\s*\[', '],[', text)
            return text

        def extract_speaking_fallback(raw):
            m = re.search(r'content\s*:\s*["\']?(.*?)(?:["\']?\s*,\s*(?:\w+|"\w+")\s*:|\s*,\s*boardresponse)', raw, re.DOTALL)
            if m:
                return m.group(1).strip()
            m = re.search(r'(?:speakingresponse|"speakingresponse")\s*:\s*["\']?(.*?)["\']?\s*(?:,\s*(?:\w+|"\w+")\s*:|\Z)', raw, re.DOTALL)
            if m:
                return m.group(1).strip()
            return None

        try:
            clean_for_parse = strip_markdown_fences(ai_response_text)
            match = re.search(r'\{.*\}', clean_for_parse, re.DOTALL)
            if match:
                clean_json_str = repair_json(match.group(0).strip())
                clean_json_str = sanitize_json_newlines(clean_json_str)
                ai_response, _ = json.JSONDecoder().raw_decode(clean_json_str)

                # New format: data array of teaching chunks
                if 'data' in ai_response and isinstance(ai_response['data'], list):
                    chunks = ai_response['data']
                    speaking_text = ' '.join(
                        c.get('speakingresponse', '') for c in chunks if c.get('speakingresponse')
                    )
                    print(f"📦 PARSED {len(chunks)} teaching chunks from data array")
                else:
                    # Old format: flat speakingresponse + boardresponse
                    speaking_text = ai_response.get('speakingresponse', "I am ready to help.")
                    single_board = ai_response.get('boardresponse')
                    if single_board:
                        chunks = [{'speakingresponse': speaking_text, 'boardresponse': single_board}]
            else:
                print("⚠️ No JSON block found — trying fallback extraction")
                fallback = extract_speaking_fallback(ai_response_text)
                speaking_text = fallback if fallback else "I heard you, but I could not generate a proper response."
                if speaking_text:
                    chunks = [{'speakingresponse': speaking_text, 'boardresponse': {}}]
        except Exception as e:
            print(f"❌ Failed to parse Ollama JSON: {e}")
            fallback = extract_speaking_fallback(ai_response_text)
            speaking_text = fallback if fallback else "I heard you, but I could not generate a proper response."
            if speaking_text:
                chunks = [{'speakingresponse': speaking_text, 'boardresponse': {}}]

        if not speaking_text.strip():
            speaking_text = "I heard you, but I could not generate a response."
            chunks = [{'speakingresponse': speaking_text, 'boardresponse': {}}]

        if chunks:
            for chunk in chunks:
                text = chunk.get('speakingresponse', '')
                chunk['speakingresponse'] = re.sub(r'[\*_#]+', '', text).strip()

                br = chunk.get('boardresponse', {})
                if isinstance(br, dict) and br.get('action') == 'newpage':
                    session_board_pages[sid]['total'] += 1
                    session_board_pages[sid]['current'] = session_board_pages[sid]['total']
                    session_board_pages[sid]['cmd_count'] = 0
                elif isinstance(br, dict) and br.get('action') == 'gotopage':
                    target = br.get('page', 0)
                    if isinstance(target, int) and 0 < target <= session_board_pages[sid]['total']:
                        session_board_pages[sid]['current'] = target

                # Capture the target page AFTER action is applied
                chunk['_targetPage'] = session_board_pages[sid]['current']

                if isinstance(br, dict):
                    action = br.get('action', '')
                    if action in ('clear', 'erasepage'):
                        session_board_pages[sid]['cmd_count'] = 0
                    elif action == 'newpage':
                        pass
                    else:
                        commands = br.get('commands', [])
                        if commands:
                            new_items = sum(1 for cmd in commands if cmd.get('type') not in ('erase', 'clear'))
                            session_board_pages[sid]['cmd_count'] = session_board_pages[sid].get('cmd_count', 0) + new_items
                        elif br.get('content'):
                            session_board_pages[sid]['cmd_count'] = session_board_pages[sid].get('cmd_count', 0) + 1

            # 💥 SAVE TO HISTORY FOR THE NEXT TURN
            if clean_json_str:
                if sid not in chat_histories:
                    chat_histories[sid] = []

                chat_histories[sid].append({"role": "user", "content": user_text})
                chat_histories[sid].append({"role": "assistant", "content": speaking_text})

                if len(chat_histories[sid]) > 10:
                    first = chat_histories[sid][:2]
                    rest = chat_histories[sid][2:]
                    chat_histories[sid] = first + rest[-8:]

            print(f"🎯 EXTRACTED SPEAKING_TEXT:\n{speaking_text[:300]}\n{'='*60}")

            # Generate TTS for all chunks in parallel
            print(f"🔊 Generating TTS for {len(chunks)} chunks in parallel...")
            tts_tasks = [build_ai_reply_payload(c['speakingresponse']) for c in chunks]
            payloads = await asyncio.gather(*tts_tasks)
            print(f"🔊 All {len(payloads)} TTS payloads ready!")

            # Emit each chunk immediately (frontend queues and plays sequentially)
            for i, (chunk, payload) in enumerate(zip(chunks, payloads)):
                payload['boardresponse'] = chunk.get('boardresponse')
                payload['itemIndex'] = i
                payload['totalItems'] = len(chunks)
                payload['targetPage'] = chunk.get('_targetPage', 1)
                await sio.emit("ai_reply", payload, room=sid)

    except Exception as e:
        print(f"❌ speech_ended error for {sid}: {e}")
        
    finally:
        # 💥 UNLOCK THE MIC: AI is done, user can speak again!
        processing_flags[sid] = False


app = socketio.ASGIApp(sio, app)