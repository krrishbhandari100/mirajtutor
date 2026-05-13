# TTS Exploration Notes (May 12, 2026)

## Current Setup
- `api/main.py:175-208` — `build_ai_reply_payload()` uses **edge-tts** with voice `en-IN-PrabhatNeural`
- Returns: `{ text, audio(base64), words[], wtimes[], wdurations[] }` — word timestamps used for avatar lip-sync

## Problem
User not satisfied with Edge-TTS voice quality. Wants better free TTS.

## Options Evaluated

### 1. ttsfm (OpenAI voices, free reverse-engineered API)
- **Voices**: ALLOY, ASH, BALLAD, CORAL, ECHO, FABLE, NOVA, ONYX, SAGE, SHIMMER, VERSE
- **Install**: `pip install ttsfm`
- **Usage**: `TTSClient().generate_speech(text, voice=Voice.NOVA, response_format=AudioFormat.WAV)`
- **Demo tried**: Nova voice — file saved to `test_tts_output.wav`
- **Caveat**: No word-level timestamps (needed for lip-sync)
- **Playback issue**: `winsound.PlaySound` gave Windows default sound instead of voice. Use `os.system("start")` to open in media player.
 opencode -s ses_1e34ffefbffeg9VQh4IjvOMFXl

### 2. FreeTTS API (400+ Azure Neural voices)
- REST API, returns SRT subtitles with word timestamps
- Free tier: 1000 chars/req, 2000 chars/day, 5000 chars/month
- 20 req/min rate limit

### 3. KittenTTS (local CPU, ONNX-based)
- 8 voices, 25-80MB models, fully offline
- No word timestamps

### 4. Coqui TTS (XTTSv2, best local quality)
- Voice cloning, word timestamps possible
- Heavy (PyTorch), slow on CPU

## Test File
- `test.py` — switched from edge-tts to ttsfm for trying voices
- Update `VOICE = Voice.NOVA` on line 9 to change voice

## Decision Status
- **PENDING** — user was testing ttsfm voices to decide. If ttsfm chosen, need solution for word-level timestamps (estimate from character count? Or use FreeTTS API instead for SRT timestamps.)
