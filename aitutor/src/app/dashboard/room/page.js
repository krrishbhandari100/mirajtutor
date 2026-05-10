'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { socket } from './socket';

// Dynamically import the 3D Avatar so it doesn't break Next.js Server-Side Rendering
const TalkingTutor = dynamic(() => import('@/Components/TalkingTutor'), {
  ssr: false,
});

const Page = () => {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');

  // =====================================================================
  // CHAPTER 1: REFS (The Hidden Memory)
  // Why Refs? React 'useState' triggers a visual screen refresh every time it changes. 
  // In a fast audio loop running 60 times a second, 'useState' would crash the app.
  // Refs let us store changing data silently in the background.
  // =====================================================================

  // DOM Elements
  const videoRef = useRef(null);       // The <video> tag showing the student
  const tutorInstance = useRef(null);  // The 3D Avatar object

  // Hardware Streams
  const cameraStreamRef = useRef(null); // Holds the raw camera data
  const micStreamRef = useRef(null);    // Holds the raw microphone data

  // Web Audio API Elements (The Audio Engine)
  const audioContextRef = useRef(null); // The master audio engine
  const analyserRef = useRef(null);     // The tool that measures volume/frequency
  const processorRef = useRef(null);    // The tool that chops audio into chunks
  const animationFrameRef = useRef(null); // The loop that runs 60 times a second
  const silenceTimeoutRef = useRef(null); // The countdown timer for when you stop talking

  // Status Flags (True/False switches)
  const isSpeakingRef = useRef(false);      // Is the student currently talking?
  const isSessionActiveRef = useRef(false); // Has the "Start" button been clicked?
  const sessionStartingRef = useRef(false); // Prevents clicking "Start" twice quickly
  const sessionStoppedRef = useRef(false);  // Forces everything to shut down

  // VAD (Voice Activity Detection) - Math variables to measure room noise
  const noiseFloorRef = useRef(0);
  const calibrationFramesRef = useRef(0);
  const CALIBRATION_FRAMES = 45; // Wait ~1.5 seconds to measure room silence
  const NOISE_MULTIPLIER = 1.4;  // You must speak 40% louder than the room to trigger the mic

  // AI Guard Rails
  const isTutorSpeakingRef = useRef(false); // Mutes the mic when the AI talks (prevents echoes)
  const tutorCooldownRef = useRef(null);    // A small delay after the AI stops before mic turns on

  // =====================================================================
  // CHAPTER 2: STATE (The Visible UI)
  // These variables DO trigger screen refreshes. Use them for UI text, buttons, etc.
  // =====================================================================

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isTutorReady, setIsTutorReady] = useState(false);
  const [statusText, setStatusText] = useState('Idle');
  const [roomInfo, setRoomInfo] = useState({ subject: '', topic: '', prevCtx: '' });
  const [messages, setMessages] = useState([
    { sender: 'AI', text: 'Hello! Start the session whenever you are ready.' },
  ]);

  const addMessage = (sender, text) => {
    setMessages((prev) => [...prev, { sender, text }]);
  };

  // =====================================================================
  // CHAPTER 3: AI SPEECH CONTROLS
  // Functions to safely start and stop the 3D Avatar from talking
  // =====================================================================

  const setTutorSpeaking = (speaking) => {
    if (speaking) {
      // AI started talking! Turn off the mic so it doesn't hear itself.
      if (tutorCooldownRef.current) {
        clearTimeout(tutorCooldownRef.current);
        tutorCooldownRef.current = null;
      }
      isTutorSpeakingRef.current = true;
    } else {
      // AI stopped talking! Wait 600ms for the echo to fade, then turn mic back on.
      tutorCooldownRef.current = setTimeout(() => {
        isTutorSpeakingRef.current = false;
        tutorCooldownRef.current = null;
      }, 600);
    }
  };

  const stopTutorSpeech = async () => {
    const tutor = tutorInstance.current;
    if (!tutor) return;
    try {
      // Brutally force the 3D model to stop animating and playing sound
      if (typeof tutor.stop === 'function') await tutor.stop();
      if (typeof tutor.stopSpeaking === 'function') await tutor.stopSpeaking();
      if (typeof tutor.cancelSpeech === 'function') await tutor.cancelSpeech();
      if (tutor.audio) {
        try { tutor.audio.pause(); tutor.audio.currentTime = 0; } catch { }
      }
      if (tutor.audioCtx && tutor.audioCtx.state === 'running') {
        await tutor.audioCtx.suspend();
      }
    } catch (error) {
      console.error('Error stopping tutor speech:', error);
    } finally {
      setTutorSpeaking(false);
    }
  };

  // =====================================================================
  // CHAPTER 4: CLEANUP (Garbage Collection)
  // Prevents your browser from crashing by safely destroying old memory
  // =====================================================================

  const cleanupSpeechDetection = () => {
    // Kill all timers and loops
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (tutorCooldownRef.current) clearTimeout(tutorCooldownRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    // Destroy the audio engine parts
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch { }
      processorRef.current = null;
    }
    analyserRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => { });
      audioContextRef.current = null;
    }

    // Reset switches
    isSpeakingRef.current = false;
    isTutorSpeakingRef.current = false;
    noiseFloorRef.current = 0;
    calibrationFramesRef.current = 0;
  };

  const cleanupMic = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    cleanupSpeechDetection();
  };

  const cleanupCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current?.srcObject) videoRef.current.srcObject = null;
    setIsCameraOn(false);
  };

  // =====================================================================
  // CHAPTER 5: THE MICROPHONE PIPELINE (The hardest part of the app)
  // This takes raw audio, ignores background noise, chops it up, and sends it
  // =====================================================================

  const setupPCMStreaming = (stream) => {
    // 1. Create the engine and connect the microphone
    const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);

    // 2. Setup the Analyser (measures the volume of specific frequencies)
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024; // Creates 512 slices of audio frequencies
    source.connect(analyser);

    // 3. Setup the Processor (Chops the audio into tiny chunks to send to Python)
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    source.connect(processor);
    processor.connect(audioContext.destination);

    // 🌟 THE "FIRST SYLLABLE" FIX: Keeps the last split-second of audio in memory
    let lastAudioChunk = null;

    // 4. The Chopping Loop: Runs constantly as audio flows in
    processor.onaudioprocess = (event) => {
      if (!isSessionActiveRef.current) return;

      const input = event.inputBuffer.getChannelData(0);
      const chunk = new Float32Array(input);

      if (isSpeakingRef.current) {
        // You are talking loud enough, send the audio normally!
        socket.emit('audio_chunk', chunk.buffer);
      } else {
        // You are quiet, but keep the last split-second in memory just in case
        lastAudioChunk = new Float32Array(chunk);
      }
    };

    // 5. Isolating Human Voices: Calculate which frequency bins = human speech (300Hz–3400Hz).
    const sampleRate = audioContext.sampleRate;
    const binCount = analyser.frequencyBinCount;
    const nyquist = sampleRate / 2;
    const speechLowBin = Math.floor(300 / nyquist * binCount);
    const speechHighBin = Math.floor(3400 / nyquist * binCount);
    const dataArray = new Uint8Array(binCount);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    processorRef.current = processor;

    // 6. The Volume Loop (Voice Activity Detection): Runs 60 times a second
    const detectSpeech = () => {
      if (!analyserRef.current || !isSessionActiveRef.current) return;

      // Look at the current volume of the room
      analyserRef.current.getByteFrequencyData(dataArray);

      // Only average the volume of human speech frequencies (ignores fans/hissing)
      const speechBins = dataArray.slice(speechLowBin, speechHighBin);
      const volume = speechBins.reduce((sum, v) => sum + v, 0) / speechBins.length;

      // Phase A: Calibration (First 1.5 seconds)
      // Learn how loud the room naturally is.
      if (calibrationFramesRef.current < CALIBRATION_FRAMES) {
        if (volume > noiseFloorRef.current) noiseFloorRef.current = volume;
        calibrationFramesRef.current++;
        animationFrameRef.current = requestAnimationFrame(detectSpeech);
        return;
      }

      // Calculate the final target to beat (40% louder than background noise)
      const threshold = Math.max(noiseFloorRef.current * NOISE_MULTIPLIER, 8);

      // Phase B: AI Guard 
      // If AI is talking, don't listen to anything.
      if (isTutorSpeakingRef.current) {
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        animationFrameRef.current = requestAnimationFrame(detectSpeech);
        return;
      }

      // Phase C: Listening!
      if (volume > threshold) {
        // Student is speaking loud enough!
        console.log("The volume is", volume);
        if (!isSpeakingRef.current) {
          isSpeakingRef.current = true;
          setStatusText('Listening...');
          socket.emit('speech_started');

          // 🌟 THE "FIRST SYLLABLE" FIX: Instantly send the memory buffer to the backend!
          if (lastAudioChunk) {
            socket.emit('audio_chunk', lastAudioChunk.buffer);
            lastAudioChunk = null;
          }
        }
        // If they were about to be marked "silent", cancel it because they kept talking
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
      } else if (isSpeakingRef.current && !silenceTimeoutRef.current) {
        // Volume dropped below threshold! Start a 1.2 second countdown.
        // If they don't speak again before 1.2s, tell Python they finished their sentence.
        silenceTimeoutRef.current = setTimeout(() => {
          if (!isSessionActiveRef.current || sessionStoppedRef.current || isTutorSpeakingRef.current) {
            silenceTimeoutRef.current = null;
            return;
          }
          isSpeakingRef.current = false;
          setStatusText('Processing...');
          socket.emit('speech_ended'); // Send the audio to Whisper!
          silenceTimeoutRef.current = null;
        }, 800);
      }

      // Loop forever
      animationFrameRef.current = requestAnimationFrame(detectSpeech);
    };

    detectSpeech();
  };

  // =====================================================================
  // CHAPTER 6: START / STOP SESSION BUTTONS
  // =====================================================================

  const startCameraPreview = async () => {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      cameraStreamRef.current = cameraStream;
      if (videoRef.current) videoRef.current.srcObject = cameraStream;
      setIsCameraOn(true);
    } catch (error) {
      console.error('Camera preview failed:', error);
      setStatusText(`Camera failed: ${error.message}`);
    }
  };

  const startSession = async () => {
    if (sessionStartingRef.current || isSessionActiveRef.current) return;
    sessionStartingRef.current = true;

    try {
      sessionStoppedRef.current = false;
      isTutorSpeakingRef.current = false;
      noiseFloorRef.current = 0;
      calibrationFramesRef.current = 0;
      setStatusText('Starting session...');

      if (!socket.connected) socket.connect();

      // Ask user for Mic Permissions
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });

      micStreamRef.current = micStream;
      isSessionActiveRef.current = true;
      setIsSessionActive(true);

      setupPCMStreaming(micStream);

      setStatusText('Calibrating mic...');
      addMessage('AI', 'Session started. Speak whenever you want.');

      // Tell Python what subject we are learning today
      const contextPayload = { topic: roomInfo.topic, prevCtx: roomInfo.prevCtx };
      if (socket.connected) {
        socket.emit('session_context', contextPayload);
      } else {
        socket.once('connect', () => socket.emit('session_context', contextPayload));
      }

      setTimeout(() => {
        if (isSessionActiveRef.current && !sessionStoppedRef.current) setStatusText('Session active');
      }, (CALIBRATION_FRAMES / 60) * 1000 + 200);

    } catch (error) {
      console.error('Error starting session:', error);
      setStatusText(`Failed to start session: ${error.message}`);
      cleanupMic();
      if (socket.connected) socket.disconnect();
      isSessionActiveRef.current = false;
      setIsSessionActive(false);
    } finally {
      sessionStartingRef.current = false;
    }
  };

  const stopSession = async () => {
    sessionStoppedRef.current = true;
    setStatusText('Stopping session...');

    try {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (tutorCooldownRef.current) clearTimeout(tutorCooldownRef.current);
      silenceTimeoutRef.current = null;
      tutorCooldownRef.current = null;

      isSpeakingRef.current = false;
      isTutorSpeakingRef.current = false;

      // Tell Python to delete any audio it was holding
      if (socket.connected) socket.emit('session_cancelled');

      await stopTutorSpeech();
      cleanupMic();
      if (socket.connected) socket.disconnect();

      isSessionActiveRef.current = false;
      setIsSessionActive(false);
      setStatusText('Idle');
    } catch (error) {
      console.error('Error stopping session:', error);
      setStatusText('Stop failed');
    }
  };

  const handleSessionToggle = async () => {
    if (!isSessionActiveRef.current) {
      await startSession();
    } else {
      await stopSession();
    }
  };

  // =====================================================================
  // CHAPTER 7: REACT LIFECYCLES (UseEffects)
  // Stuff that runs automatically when the page loads
  // =====================================================================

  // 1. Fetch the Room details from FastAPI on load
  useEffect(() => {
    const fetchRoomInfo = async () => {
      if (!roomId) return;
      try {
        const res = await fetch(`http://localhost:8000/get_room_info?room_id=${roomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        setRoomInfo({
          subject: data.subject || '',
          topic: data.topic || '',
          prevCtx: data.prompt || '',
        });
      } catch (error) {
        console.error('Error fetching room info:', error);
      }
    };
    fetchRoomInfo();
  }, [roomId]);

  // 2. Start the Camera on load
  useEffect(() => {
    startCameraPreview();
    return () => { cleanupCamera(); };
  }, []);

  // 3. Setup the WebSocket Listeners
  useEffect(() => {
    const handleConnect = () => {
      setStatusText((prev) => prev === 'Starting session...' ? 'Connected' : prev);
    };

    const handleDisconnect = () => {
      setStatusText((prev) => isSessionActiveRef.current ? 'Disconnected' : 'Idle');
    };

    // When Python sends EdgeTTS Audio back!
    const handleAIReply = async (data) => {
      if (sessionStoppedRef.current) return;

      if (data?.text) addMessage('AI', data.text);
      if (!data?.audio || !tutorInstance.current) {
        setStatusText('Session active');
        return;
      }

      try {
        setStatusText('Tutor speaking...');
        setTutorSpeaking(true);

        // Decode audio
        const binaryString = atob(data.audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i) & 0xff;
        }

        const tutor = tutorInstance.current;
        const audioCtx = tutor.audioCtx || new AudioContext();
        if (audioCtx.state === 'suspended') await audioCtx.resume();

        const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));

        // Create audio object with viseme data
        const audioObject = {
          audio: audioBuffer,
          words: data.words || [],
          wtimes: (data.wtimes || []).map((t) => t / 2),
          wdurations: (data.wdurations || []).map((d) => d / 2),
        };

        // Speak with lip sync
        await tutor.speakAudio(
          audioObject,
          { lipsyncLang: 'en', pcmSampleRate: audioBuffer.sampleRate },
          (subtitle) => { console.log('Subtitle:', subtitle); }
        );

        setTutorSpeaking(false);
        if (!sessionStoppedRef.current) setStatusText('Session active');
      } catch (error) {
        console.error('Error while tutor speaking:', error);
        setTutorSpeaking(false);
        if (!sessionStoppedRef.current) setStatusText('Session active');
      }
    };

    const handleBoardUpdate = (data) => {
      if (sessionStoppedRef.current) return;
      console.log('Board update received:', data);
    };

    socket.off('connect');
    socket.off('disconnect');
    socket.off('ai_reply');
    socket.off('board_update');

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('ai_reply', handleAIReply);
    socket.on('board_update', handleBoardUpdate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('ai_reply', handleAIReply);
      socket.off('board_update', handleBoardUpdate);
    };
  }, []);

  // 4. Final Cleanup when leaving the page entirely
  useEffect(() => {
    return () => {
      sessionStoppedRef.current = true;
      isSessionActiveRef.current = false;
      stopTutorSpeech();
      cleanupMic();
      cleanupCamera();
      if (socket.connected) socket.disconnect();
    };
  }, []);

  // =====================================================================
  // CHAPTER 8: RENDER (The HTML UI)
  // =====================================================================

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden text-slate-900">
      <header className="p-4 bg-white flex justify-between items-center border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isSessionActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <h1 className="font-bold text-lg text-slate-800">
            Room: {roomId || 'Unknown'}
          </h1>
        </div>
        <div className="px-4 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-widest border border-indigo-100">
          {statusText}
        </div>
      </header>

      <main className="flex-1 relative p-6 flex gap-6 overflow-auto">
        <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 relative overflow-hidden shadow-xl">
          <div className="absolute top-6 left-6 z-10 bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className="text-indigo-600">●</span> AI Tutor
            </p>
          </div>
          <div className="w-full h-full bg-slate-100">
            <TalkingTutor
              avatarPath="/avatars/david.glb"
              onReady={(instance) => {
                tutorInstance.current = instance;
                console.log('🎯 TalkingTutor instance received:', instance);
                setIsTutorReady(true);
              }}
            />
          </div>
        </div>

        <div className="w-80 flex flex-col gap-6">
          <div className="aspect-video bg-white rounded-3xl border border-slate-200 relative overflow-hidden shadow-lg">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            {!isCameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                <p className="text-xs text-slate-400">Camera Off</p>
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-[10px] font-bold text-slate-700 border border-slate-100">
              YOU (Student)
            </div>
          </div>

          <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 p-6 flex flex-col shadow-sm">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Conversation</h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-sm text-slate-600">
              {messages.map((msg, index) => (
                <div key={index} className={`p-3 rounded-2xl ${msg.sender === 'AI' ? 'bg-slate-50 rounded-tl-none' : 'bg-indigo-50 rounded-tr-none ml-6'}`}>
                  <p><b className={msg.sender === 'AI' ? 'text-indigo-600' : 'text-slate-700'}>{msg.sender}:</b> {msg.text}</p>
                </div>
              ))}
              <p className="opacity-50 italic text-xs text-center pt-2">
                {isSessionActive ? 'Mic is active. Speak naturally...' : 'Start the session to begin.'}
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-6 bg-white border-t border-slate-200">
        <div className="flex justify-center">
          <button
            onClick={handleSessionToggle}
            disabled={!isTutorReady && !isSessionActive}
            className={`
              px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg
              ${!isTutorReady && !isSessionActive ? 'opacity-50 cursor-not-allowed' : ''}
              ${isSessionActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}
            `}
          >
            {isSessionActive ? '⏹ Stop Session' : isTutorReady ? '▶ Start Session' : '⏳ Loading...'}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Page;