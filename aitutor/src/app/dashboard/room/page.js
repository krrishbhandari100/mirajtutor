'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { socket } from './socket';

// Dynamically import the 3D Avatar and Board so they don't break Next.js Server-Side Rendering
const TalkingTutor = dynamic(() => import('@/Components/TalkingTutor'), {
  ssr: false,
});
const BoardCanvas = dynamic(() => import('@/Components/BoardCanvas'), {
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
  const avatarRef = useRef(null);      // The 3D Avatar object
  const boardRef = useRef(null);       // The Board Canvas object

  // Hardware Streams
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
  const interruptedRef = useRef(false);     // True when student interrupts, checked before playing audio

  // VAD (Voice Activity Detection) - Math variables to measure room noise
  const noiseFloorRef = useRef(0);
  const calibrationFramesRef = useRef(0);
  const CALIBRATION_FRAMES = 45; // Wait ~1.5 seconds to measure room silence
  const NOISE_MULTIPLIER = 1.15; // Must speak 15% louder than room to trigger

  // AI Guard Rails
  const isTutorSpeakingRef = useRef(false); // Mutes the mic when the AI talks (prevents echoes)
  const tutorCooldownRef = useRef(null);    // A small delay after the AI stops before mic turns on

  // =====================================================================
  // CHAPTER 2: STATE (The Visible UI)
  // These variables DO trigger screen refreshes. Use them for UI text, buttons, etc.
  // =====================================================================

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isTutorReady, setIsTutorReady] = useState(false);
  const [statusText, setStatusText] = useState('Idle');
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [roomInfo, setRoomInfo] = useState({ subject: '', topic: '', prevCtx: '' });

  const [isMuted, setIsMuted] = useState(true);
  const isMutedRef = useRef(true);

  const [docInfo, setDocInfo] = useState(null);
  const docInfoRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const [boardCurrentPage, setBoardCurrentPage] = useState(0);
  const [boardTotalPages, setBoardTotalPages] = useState(0);
  const boardCurrentPageRef = useRef(0);
  const boardTotalPagesRef = useRef(0);

  // Language settings
  const [speakingLang, setSpeakingLang] = useState('en');
  const [writingLang, setWritingLang] = useState('en');
  const LANG_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'Hindi' },
    { value: 'bn', label: 'Bengali' },
    { value: 'gu', label: 'Gujarati' },
    { value: 'kn', label: 'Kannada' },
    { value: 'ml', label: 'Malayalam' },
    { value: 'mr', label: 'Marathi' },
    { value: 'ne', label: 'Nepali' },
    { value: 'ta', label: 'Tamil' },
    { value: 'te', label: 'Telugu' },
    { value: 'ur', label: 'Urdu' },
  ];

  // Send language preference to backend and get welcome message in that language
  useEffect(() => {
    if (socket.connected) {
      socket.emit('user_language', { lang: speakingLang });
    }
  }, [speakingLang]);

  // Sequential chunk queue for AI replies
  const itemQueueRef = useRef([]);
  const isProcessingRef = useRef(false);
  const interruptedQueueBackupRef = useRef([]);

  const updateBoardPageState = () => {
    const board = boardRef.current;
    if (!board) return;
    const cp = board.getCurrentPage?.() || 1;
    const tp = board.getTotalPages?.() || 1;
    boardCurrentPageRef.current = cp;
    boardTotalPagesRef.current = tp;
    setBoardCurrentPage(cp);
    setBoardTotalPages(tp);
  };

  const handleAvatarReady = useCallback((avatarInstance) => {
    avatarRef.current = avatarInstance;
    setIsTutorReady(true);
  }, []);

  const handleUploadDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sid', socket.id || '');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/upload_doc`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.status === 'success') {
        setDocInfo(data);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
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
      }, 1200);
    }
  };

  const stopTutorSpeech = async () => {
    const avatar = avatarRef.current;
    if (!avatar) return;
    try {
      // Brutally force the 3D model to stop animating and playing sound
      if (typeof avatar.stop === 'function') await avatar.stop();
      if (typeof avatar.stopSpeaking === 'function') await avatar.stopSpeaking();
      if (typeof avatar.cancelSpeech === 'function') await avatar.cancelSpeech();
      if (avatar.audio) {
        try { avatar.audio.pause(); avatar.audio.currentTime = 0; } catch { }
      }
    } catch (error) {
      console.error('Error stopping tutor speech:', error);
    } finally {
      setTutorSpeaking(false);
    }
  };

  // =====================================================================
  // CHAPTER 3.5: SEQUENTIAL CHUNK QUEUE
  // Processes multiple ai_reply events one at a time: draw board → play audio → next
  // =====================================================================

  const processNextItem = async () => {
    if (isProcessingRef.current) return;
    if (itemQueueRef.current.length === 0) return;

    if (sessionStoppedRef.current) {
      itemQueueRef.current = [];
      return;
    }

    isProcessingRef.current = true;
    const data = itemQueueRef.current.shift();

    try {
      // Draw board (if present) BEFORE audio starts
      if (data.boardresponse) {
        const board = boardRef.current;
        if (board) {
          const usedYSlots = new Set();
          if (data.boardresponse.commands) {
            for (const cmd of data.boardresponse.commands) {
              if (cmd.type === 'text' || cmd.type === 'header') {
                while (usedYSlots.has(cmd.y) && cmd.y < 540) cmd.y += 50;
                usedYSlots.add(cmd.y);
              }
            }
          }
          board.drawOnBoard(data.boardresponse, data.targetPage);
          if (data.boardresponse.action === 'showimage' && data.boardresponse.page && docInfoRef.current?.total_pages) {
            socket.emit('request_board_image', { page: data.boardresponse.page });
          }
          updateBoardPageState();
        }
      }

      // Check if interrupted while board was drawing
      if (sessionStoppedRef.current) {
        setStatusText('Session active');
        isProcessingRef.current = false;
        return;
      }

      if (!data.audio || !avatarRef.current) {
        setStatusText('Session active');
        isProcessingRef.current = false;
        setTutorSpeaking(false);
        processNextItem();
        return;
      }

      setStatusText('Tutor speaking...');
      setTutorSpeaking(true);

      // Decode audio
      const binaryString = atob(data.audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i) & 0xff;
      }

      const avatar = avatarRef.current;
      const audioCtx = avatar.audioCtx || new AudioContext();
      if (audioCtx.state === 'suspended') await audioCtx.resume();

      const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));

      const audioObject = {
        audio: audioBuffer,
        words: data.words || [],
        wtimes: data.wtimes || [],
        wdurations: data.wdurations || [],
      };

      // Check if session stopped while decoding
      if (sessionStoppedRef.current) {
        setTutorSpeaking(false);
        setStatusText('Session active');
        isProcessingRef.current = false;
        return;
      }

      // Speak with lip sync
      await avatar.speakAudio(
        audioObject,
        { lipsyncLang: 'en', pcmSampleRate: audioBuffer.sampleRate },
        (subtitle) => { console.log('Subtitle:', subtitle); }
      );

      setTutorSpeaking(false);
      if (!sessionStoppedRef.current) setStatusText('Session active');
    } catch (error) {
      console.error('Error processing queue item:', error);
      setTutorSpeaking(false);
      if (!sessionStoppedRef.current) setStatusText('Session active');
    } finally {
      isProcessingRef.current = false;
      if (interruptedRef.current) {
        interruptedRef.current = false;
        setTutorSpeaking(false);
        if (!sessionStoppedRef.current) setStatusText('Session active');
        return;
      }
      if (itemQueueRef.current.length === 0 && interruptedQueueBackupRef.current.length > 0) {
        resumeInterruptedTeaching();
        return;
      }
      processNextItem();
    }
  };

  const resumeInterruptedTeaching = async () => {
    try {
      setStatusText('Continuing...');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Now, continuing with what I was explaining earlier.' }),
      });
      if (!res.ok) throw new Error(`TTS status ${res.status}`);
      const ttsData = await res.json();
      itemQueueRef.current = [{
        audio: ttsData.audio,
        words: ttsData.words || [],
        wtimes: ttsData.wtimes || [],
        wdurations: ttsData.wdurations || [],
        boardresponse: null,
        targetPage: null,
      }, ...interruptedQueueBackupRef.current];
    } catch (err) {
      console.error('Failed to generate connecting sentence:', err);
      itemQueueRef.current = interruptedQueueBackupRef.current;
    }
    interruptedQueueBackupRef.current = [];
    processNextItem();
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
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;

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
    processor.connect(audioContext.destination); // something like connection speakers

    // 🌟 THE "FIRST SYLLABLE" FIX: Keeps the last split-second of audio in memory
    let lastAudioChunk = null;

    // 4. The Chopping Loop: Runs constantly as audio flows in
    processor.onaudioprocess = (event) => {
      if (!isSessionActiveRef.current) return;
      if (isMutedRef.current) return;

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

      // Measure RMS energy of human speech frequencies (ignores fans/hissing)
      const speechBins = dataArray.slice(speechLowBin, speechHighBin);
      const rms = Math.sqrt(speechBins.reduce((sum, v) => sum + v * v, 0) / speechBins.length);

      // Phase A: Learn noise floor via exponential moving average
      // Smoothly adapts to room noise — a single loud spike barely moves it.
      if (calibrationFramesRef.current < CALIBRATION_FRAMES) {
        noiseFloorRef.current = noiseFloorRef.current * 0.9 + rms * 0.1;
        calibrationFramesRef.current++;
        animationFrameRef.current = requestAnimationFrame(detectSpeech);
        return;
      }
      // Only update noise floor when tutor is NOT speaking — locks baseline during AI playback
      if (!isTutorSpeakingRef.current) {
        noiseFloorRef.current = noiseFloorRef.current * 0.99 + rms * 0.01;
      }

      // Calculate the final target to beat (15% louder than background noise)
      const threshold = Math.max(noiseFloorRef.current * NOISE_MULTIPLIER, 8);

      // Phase B: Mute Guard
      // If muted, don't send any audio and finalize any in-progress speech
      if (isMutedRef.current) {
        if (isSpeakingRef.current) {
          isSpeakingRef.current = false;
          setStatusText('Muted');
          socket.emit('speech_ended');
        }
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        animationFrameRef.current = requestAnimationFrame(detectSpeech);
        return;
      }

      // Phase C: AI Guard (Interruptible)
      // Once interrupted, threshold drops back to normal.
      if (isTutorSpeakingRef.current) {
        const interruptThreshold = noiseFloorRef.current;
        console.log("My RMS", rms);
        console.log("interruptThreshold", interruptThreshold);
        if (rms > interruptThreshold) {
          // Student interrupted! Stop tutor immediately
          interruptedQueueBackupRef.current = itemQueueRef.current.splice(0);
          isProcessingRef.current = false;
          stopTutorSpeech();
          interruptedRef.current = true;
          if (tutorCooldownRef.current) {
            clearTimeout(tutorCooldownRef.current);
            tutorCooldownRef.current = null;
          }
          isTutorSpeakingRef.current = false;

          socket.emit('user_interrupted');

          // Begin capturing student speech immediately
          isSpeakingRef.current = true;
          setStatusText('Listening...');
          socket.emit('speech_started');
          if (lastAudioChunk) {
            socket.emit('audio_chunk', lastAudioChunk.buffer);
            lastAudioChunk = null;
          }
        }

        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        animationFrameRef.current = requestAnimationFrame(detectSpeech);
        return;
      }

      // Phase C: Listening!
      if (rms > threshold) {
        // Student is speaking loud enough!
        console.log("The rms is", rms);
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
        }, 700);
      }

      // Loop forever
      animationFrameRef.current = requestAnimationFrame(detectSpeech);
    };

    detectSpeech();
  };

  // =====================================================================
  // CHAPTER 6: START / STOP SESSION BUTTONS
  // =====================================================================

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
      socket.emit('user_language', { lang: speakingLang });

      // Ask user for Mic Permissions
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });

      micStreamRef.current = micStream;
      isSessionActiveRef.current = true;
      setIsSessionActive(true);

      setupPCMStreaming(micStream);

      setStatusText('Calibrating mic...');

      // Tell Python what subject we are learning today
      const contextPayload = {
        topic: roomInfo.topic,
        prevCtx: roomInfo.prevCtx,
        boardCurrentPage: 1,
        boardTotalPages: 1,
        speaking_lang: speakingLang,
        writing_lang: writingLang,
      };
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
      itemQueueRef.current = [];
      isProcessingRef.current = false;
      interruptedQueueBackupRef.current = [];

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

  const toggleMute = () => {
    const newMuted = !isMutedRef.current;
    isMutedRef.current = newMuted;
    setIsMuted(newMuted);
    if (newMuted) {
      setStatusText('Muted');
      // Finalize any in-progress speech so backend doesn't hang
      if (isSpeakingRef.current) {
        isSpeakingRef.current = false;
        socket.emit('speech_ended');
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    } else {
      setStatusText('Session active');
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
      setIsLoadingRoom(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/get_room_info?room_id=${roomId}`, {
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
      } finally {
        setIsLoadingRoom(false);
      }
    };
    fetchRoomInfo();
  }, [roomId]);

  // 2. Setup the WebSocket Listeners
  useEffect(() => {
    const handleConnect = () => {
      setStatusText((prev) => prev === 'Starting session...' ? 'Connected' : prev);
    };

    const handleDisconnect = () => {
      setStatusText((prev) => isSessionActiveRef.current ? 'Disconnected' : 'Idle');
    };

    // When Python sends EdgeTTS Audio back!
    const handleAIReply = (data) => {
      if (sessionStoppedRef.current) return;

      itemQueueRef.current.push(data);

      if (!isProcessingRef.current) {
        processNextItem();
      }
    };

    const handleBoardImage = (data) => {
      if (sessionStoppedRef.current) return;
      const board = boardRef.current;
      if (board?.displayBoardImage && data) {
        board.displayBoardImage(data);
      }
    };

    socket.off('connect');
    socket.off('disconnect');
    socket.off('ai_reply');
    socket.off('board_image');

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('ai_reply', handleAIReply);
    socket.on('board_image', handleBoardImage);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('ai_reply', handleAIReply);
      socket.off('board_image', handleBoardImage);
    };
  }, []);

  // Sync docInfo to ref for use in socket closures
  useEffect(() => {
    docInfoRef.current = docInfo;
  }, [docInfo]);

  // 3. Final Cleanup when leaving the page entirely
  useEffect(() => {
    return () => {
      sessionStoppedRef.current = true;
      isSessionActiveRef.current = false;
      stopTutorSpeech();
      cleanupMic();
      if (socket.connected) socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================================================
  // CHAPTER 8: RENDER (The HTML UI)
  // =====================================================================

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden text-slate-900">
      <header className="p-4 bg-white flex flex-wrap gap-2 justify-between items-center border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isSessionActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <h1 className="font-bold text-lg text-slate-800">
            Room: {roomId || 'Unknown'}
          </h1>
          <span className="w-px h-5 bg-slate-200" />
          <label className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            isUploading ? 'opacity-50 pointer-events-none bg-slate-100 text-slate-400' :
            docInfo ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' :
            'bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100'
          }`}>
            {isUploading ? '⏳ Uploading...' : docInfo ? `📄 ${docInfo.filename}` : '📄 Upload Material'}
            <input type="file" accept=".pdf" onChange={handleUploadDoc} className="hidden" disabled={isUploading} />
          </label>
          {isUploading && (
            <div className="w-20 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full animate-upload-bar" />
            </div>
          )}
          {docInfo && (
            <button onClick={() => { setDocInfo(null); }} className="text-xs text-red-400 hover:text-red-600 transition-colors" title="Remove document">
              ✕
            </button>
          )}
        </div>
        {!isSessionActive && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Speak</span>
              <select value={speakingLang} onChange={(e) => setSpeakingLang(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {LANG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Write</span>
              <select value={writingLang} onChange={(e) => setWritingLang(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {LANG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        )}
        {isLoadingRoom ? (
          <div className="px-4 py-1 rounded-full animate-pulse">
            <div className="h-3 w-24 bg-slate-200 rounded-full" />
          </div>
        ) : (
          <div className="px-4 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-widest border border-indigo-100">
            {statusText}
          </div>
        )}
      </header>

      <main className="flex-1 relative p-2 sm:p-4 md:p-6 flex flex-col overflow-hidden">
        <div className="flex-1 bg-white rounded-xl sm:rounded-2xl md:rounded-[2.5rem] border border-slate-200 relative overflow-hidden shadow-xl">
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 md:top-6 md:left-6 z-10 bg-white/80 backdrop-blur-md px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-lg sm:rounded-xl md:rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1 sm:gap-2">
              <span className="text-indigo-600">●</span> AI Tutor
            </p>
          </div>
          <div className="w-full h-full bg-slate-100 relative">
            <BoardCanvas
              onReady={(boardInstance) => {
                boardRef.current = boardInstance;
                console.log('BoardCanvas instance received:', boardInstance);
                updateBoardPageState();
              }}
            />
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 sm:gap-3 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 text-white text-xs sm:text-sm">
              <button
                onClick={() => {
                  boardRef.current?.navigateToPage?.(boardCurrentPage - 1);
                  updateBoardPageState();
                }}
                disabled={boardCurrentPage <= 1}
                className="disabled:opacity-30 hover:text-indigo-300 transition-colors"
              >
                ◀
              </button>
              <span className="font-medium min-w-[80px] text-center select-none">
                {isSessionActive ? `Page ${boardCurrentPage}/${boardTotalPages}` : 'Board'}
              </span>
              <button
                onClick={() => {
                  boardRef.current?.navigateToPage?.(boardCurrentPage + 1);
                  updateBoardPageState();
                }}
                disabled={boardCurrentPage >= boardTotalPages}
                className="disabled:opacity-30 hover:text-indigo-300 transition-colors"
              >
                ▶
              </button>
              <span className="w-px h-4 bg-white/20 mx-1" />
              <button
                onClick={async () => {
                  const board = boardRef.current;
                  if (!board?.saveAllPages) return;
                  const pages = board.saveAllPages();
                  if (!pages || pages.length === 0) return;
                  const { jsPDF } = await import('jspdf');
                  const pdf = new jsPDF('l', 'mm', [297, 210]);
                  pages.forEach((dataUrl, i) => {
                    if (i > 0) pdf.addPage([297, 210]);
                    pdf.addImage(dataUrl, 'PNG', 10, 10, 277, 190);
                  });
                  pdf.save('board.pdf');
                }}
                className="text-xs hover:text-indigo-300 transition-colors"
                title="Save all board pages as PDF"
              >
                💾
              </button>
            </div>
          </div>
          <div className="absolute bottom-14 sm:bottom-12 md:bottom-10 left-1/2 -translate-x-1/2 z-30 w-24 h-36 sm:w-36 sm:h-48 md:w-44 md:h-56 lg:w-56 lg:h-72 rounded-xl sm:rounded-2xl md:rounded-[2rem] overflow-hidden shadow-2xl">
            {!isTutorReady && (
              <div className="absolute inset-0 z-10 bg-slate-900/70 flex items-center justify-center rounded-[2rem]">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white text-sm font-medium">Loading avatar...</p>
                </div>
              </div>
            )}
            <TalkingTutor
              avatarPath="/avatars/female-avatar4.glb"
              onReady={handleAvatarReady}
            />
          </div>
        </div>
      </main>

      <footer className="p-3 sm:p-4 md:p-6 bg-white border-t border-slate-200">
        <div className="flex justify-center items-center gap-4">
          <button
            onClick={toggleMute}
            disabled={!isSessionActive}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            className={`
              p-2 sm:p-3 md:p-4 rounded-full font-bold text-xs sm:text-sm md:text-lg transition-all shadow-lg
              ${!isSessionActive ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105'}
              ${isMuted ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
            `}
          >
            {isMuted ? '🔇' : '🎙️'}
          </button>
          <button
            onClick={handleSessionToggle}
            disabled={!isTutorReady && !isSessionActive}
            className={`
              px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 rounded-full font-bold text-xs sm:text-sm md:text-lg transition-all shadow-lg
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