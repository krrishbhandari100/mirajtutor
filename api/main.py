from fastapi import FastAPI
from pydantic import BaseModel
from Collection import (
    add_user,
    check_exists,
    add_room,
    get_rooms,
    JWT_SECRET,
    JWT_ALGO,
    SALT,
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
# 💥 NEW: The safety lock to prevent phantom mic triggers
processing_flags = {} 


async def build_ai_reply_payload(text: str):
    print(f"🔊 Building AI reply payload for text: {text[:50]}...")
    voice = "en-US-GuyNeural"
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
                "time": chunk["offset"] / 10000,
                "duration": chunk["duration"] / 10000,
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
    processing_flags[sid] = False # Initialize the lock

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
        
        ai_response_text = await asyncio.to_thread(
            generate_tutor_response,
            '', topic, system_prompt, current_history, user_text
        )

        if not ai_response_text or interruption_flags.get(sid):
            return

        # --- ROBUST JSON EXTRACTION ---
        speaking_text = ai_response_text 
        clean_json_str = None
        board_update = {'writingresponse': '', 'visualresponse': None}

        try:
            match = re.search(r'\{.*\}', ai_response_text, re.DOTALL)
            if match:
                clean_json_str = match.group(0)
                ai_response = json.loads(clean_json_str)
                speaking_text = ai_response.get('speakingresponse', "I am ready to help.")
                board_update['writingresponse'] = ai_response.get('writingresponse', '')
                board_update['visualresponse'] = ai_response.get('visualresponse', None)
            else:
                print("⚠️ No JSON block found in AI response!")
                speaking_text = speaking_text.replace("{", "").replace("}", "").replace('"', '').replace("\\n", " ")
        except Exception as e:
            print(f"❌ Failed to parse Ollama JSON: {e}")
            speaking_text = speaking_text.replace("{", "").replace("}", "").replace('"', '').replace("\\n", " ")

        if not speaking_text.strip():
            speaking_text = "I heard you, but I could not generate a response."

        # 💥 SAVE TO HISTORY FOR THE NEXT TURN
        if clean_json_str:
            if sid not in chat_histories:
                chat_histories[sid] = []
            
            chat_histories[sid].append({"role": "user", "content": user_text})
            chat_histories[sid].append({"role": "assistant", "content": clean_json_str})
            
            if len(chat_histories[sid]) > 10:
                chat_histories[sid] = chat_histories[sid][-10:]

        print("🔊 Generating speech...")
        payload = await build_ai_reply_payload(speaking_text)
        await sio.emit("ai_reply", payload, room=sid)
        await sio.emit("board_update", board_update, room=sid)

    except Exception as e:
        print(f"❌ speech_ended error for {sid}: {e}")
        
    finally:
        # 💥 UNLOCK THE MIC: AI is done, user can speak again!
        processing_flags[sid] = False


app = socketio.ASGIApp(sio, app)