'use client';

import React, { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { socket } from './socket';

const TalkingTutor = dynamic(() => import('@/Components/TalkingTutor'), {
  ssr: false,
});
const BoardCanvas = dynamic(() => import('@/Components/BoardCanvas'), {
  ssr: false,
});

function RoomContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');

  // =====================================================================
  // REFS
  // =====================================================================

  const avatarRef = useRef(null);
  const boardRef = useRef(null);

  // Speech Recognition (webkitSpeechRecognition)
  const recognitionRef = useRef(null);
  const recognitionRestartRef = useRef(true);
  const silenceTimeoutRef = useRef(null);
  const SILENCE_DELAY = 1500;
  const speakingRef = useRef(false);

  // Interrupt detection (AnalyserNode RMS loop during AI speech)
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const interruptAnimationRef = useRef(null);

  // AI speech state
  const isTutorSpeakingRef = useRef(false);
  const tutorCooldownRef = useRef(null);
  const COOLDOWN_DELAY = 1200;

  // Session
  const isSessionActiveRef = useRef(false);
  const sessionStartingRef = useRef(false);
  const sessionStoppedRef = useRef(false);
  const interruptedRef = useRef(false);

  // Queue
  const itemQueueRef = useRef([]);
  const isProcessingRef = useRef(false);
  const interruptedQueueBackupRef = useRef([]);

  // =====================================================================
  // STATE
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

  useEffect(() => {
    if (socket.connected) {
      socket.emit('user_language', { lang: speakingLang });
    }
  }, [speakingLang]);

  // =====================================================================
  // SPEECH RECOGNITION (webkitSpeechRecognition)
  // =====================================================================

  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      const oldRec = recognitionRef.current;
      oldRec.onend = null;
      try { oldRec.stop(); } catch {}
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speakingLang + '-IN';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      if (!isSessionActiveRef.current || sessionStoppedRef.current) return;
      if (isMutedRef.current) return;

      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      const last = event.results[event.results.length - 1];
      if (!last.isFinal) return;

      const text = last[0].transcript.trim();
      if (!text) return;

      if (!speakingRef.current) {
        speakingRef.current = true;
        socket.emit('speech_started');
      }

      silenceTimeoutRef.current = setTimeout(() => {
        speakingRef.current = false;
        setStatusText('Processing...');
        socket.emit('speech_ended', { text });
        silenceTimeoutRef.current = null;
      }, SILENCE_DELAY);
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') return;
      if (event.error === 'aborted') return;
      if (event.error === 'network') {
        alert('Speech recognition failed due to a network issue. Please use Chrome, Edge, or Opera for better support.');
        recognitionRestartRef.current = false;
        return;
      }
      if (recognitionRestartRef.current && isSessionActiveRef.current && !sessionStoppedRef.current) {
        setTimeout(() => startRecognition(), 500);
      }
    };

    recognition.onend = () => {
      if (recognitionRestartRef.current && isSessionActiveRef.current && !sessionStoppedRef.current && !isTutorSpeakingRef.current) {
        setTimeout(() => startRecognition(), 100);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopRecognition = () => {
    recognitionRestartRef.current = false;
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    speakingRef.current = false;
  };

  // =====================================================================
  // INTERRUPT DETECTION (AnalyserNode RMS loop during AI speech)
  // =====================================================================

  const startInterruptDetection = () => {
    if (!audioContextRef.current || !analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const detect = async () => {
      if (!isTutorSpeakingRef.current || !isSessionActiveRef.current || sessionStoppedRef.current || isMutedRef.current) {
        interruptAnimationRef.current = requestAnimationFrame(detect);
        return;
      }

      analyserRef.current.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / dataArray.length);

      if (rms > 0.08) {
        interruptedQueueBackupRef.current = itemQueueRef.current.splice(0);
        isProcessingRef.current = false;
        interruptedRef.current = true;

        if (!recognitionRef.current) {
          recognitionRestartRef.current = true;
          startRecognition();
        }

        await stopTutorSpeech();

        if (tutorCooldownRef.current) {
          clearTimeout(tutorCooldownRef.current);
          tutorCooldownRef.current = null;
        }
        isTutorSpeakingRef.current = false;

        socket.emit('user_interrupted');
        setStatusText('Listening...');
        interruptAnimationRef.current = requestAnimationFrame(detect);
        return;
      }

      interruptAnimationRef.current = requestAnimationFrame(detect);
    };

    interruptAnimationRef.current = requestAnimationFrame(detect);
  };

  const stopInterruptDetection = () => {
    if (interruptAnimationRef.current) {
      cancelAnimationFrame(interruptAnimationRef.current);
      interruptAnimationRef.current = null;
    }
  };

  // =====================================================================
  // AI SPEECH CONTROLS
  // =====================================================================

  const setTutorSpeaking = (speaking) => {
    if (speaking) {
      if (tutorCooldownRef.current) {
        clearTimeout(tutorCooldownRef.current);
        tutorCooldownRef.current = null;
      }
      isTutorSpeakingRef.current = true;
      stopRecognition();
      startInterruptDetection();
    } else {
      isTutorSpeakingRef.current = false;
      stopInterruptDetection();

      tutorCooldownRef.current = setTimeout(() => {
        tutorCooldownRef.current = null;
        recognitionRestartRef.current = true;
        startRecognition();
        if (!isMutedRef.current) {
          setStatusText('Session active');
        }
      }, COOLDOWN_DELAY);
    }
  };

  const stopTutorSpeech = async () => {
    const avatar = avatarRef.current;
    if (!avatar) return;
    try {
      if (typeof avatar.stop === 'function') await avatar.stop();
      if (typeof avatar.stopSpeaking === 'function') await avatar.stopSpeaking();
      if (typeof avatar.cancelSpeech === 'function') await avatar.cancelSpeech();
      if (avatar.audio) {
        try { avatar.audio.pause(); avatar.audio.currentTime = 0; } catch {}
      }
    } catch (error) {
      console.error('Error stopping tutor speech:', error);
    } finally {
      setTutorSpeaking(false);
    }
  };

  // =====================================================================
  // SEQUENTIAL CHUNK QUEUE
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

      if (sessionStoppedRef.current) {
        setTutorSpeaking(false);
        setStatusText('Session active');
        isProcessingRef.current = false;
        return;
      }

      await avatar.speakAudio(
        audioObject,
        { lipsyncLang: 'en', pcmSampleRate: audioBuffer.sampleRate },
        (subtitle) => { console.log('Subtitle:', subtitle); },
        true
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
  // SESSION START / STOP
  // =====================================================================

  const startSession = async () => {
    if (sessionStartingRef.current || isSessionActiveRef.current) return;
    sessionStartingRef.current = true;

    try {
      sessionStoppedRef.current = false;
      isTutorSpeakingRef.current = false;
      speakingRef.current = false;
      setStatusText('Starting session...');

      if (!socket.connected) socket.connect();
      socket.emit('user_language', { lang: speakingLang });

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micStreamRef.current = micStream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(micStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      isSessionActiveRef.current = true;
      setIsSessionActive(true);

      recognitionRestartRef.current = true;
      startRecognition();

      setStatusText('Session active');

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
    } catch (error) {
      console.error('Error starting session:', error);
      setStatusText(`Failed: ${error.message}`);
      cleanupSession();
      isSessionActiveRef.current = false;
      setIsSessionActive(false);
    } finally {
      sessionStartingRef.current = false;
    }
  };

  const stopSession = async () => {
    sessionStoppedRef.current = true;
    setStatusText('Stopping session...');

    itemQueueRef.current = [];
    isProcessingRef.current = false;
    interruptedQueueBackupRef.current = [];
    speakingRef.current = false;

    stopRecognition();
    stopInterruptDetection();
    isTutorSpeakingRef.current = false;

    if (tutorCooldownRef.current) {
      clearTimeout(tutorCooldownRef.current);
      tutorCooldownRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (socket.connected) socket.emit('session_cancelled');

    await stopTutorSpeech();

    cleanupSession();

    if (socket.connected) socket.disconnect();

    isSessionActiveRef.current = false;
    setIsSessionActive(false);
    setStatusText('Idle');
  };

  const cleanupSession = () => {
    stopRecognition();
    stopInterruptDetection();
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    if (tutorCooldownRef.current) {
      clearTimeout(tutorCooldownRef.current);
      tutorCooldownRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    speakingRef.current = false;
  };

  const toggleMute = () => {
    const newMuted = !isMutedRef.current;
    isMutedRef.current = newMuted;
    setIsMuted(newMuted);
    if (newMuted) {
      setStatusText('Muted');
      if (speakingRef.current) {
        speakingRef.current = false;
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
      }
      stopRecognition();
    } else {
      setStatusText('Session active');
      recognitionRestartRef.current = true;
      startRecognition();
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
  // REACT LIFECYCLES
  // =====================================================================

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

  useEffect(() => {
    const handleConnect = () => {
      setStatusText((prev) => prev === 'Starting session...' ? 'Connected' : prev);
    };

    const handleDisconnect = () => {
      setStatusText((prev) => isSessionActiveRef.current ? 'Disconnected' : 'Idle');
    };

    const handleAIReply = (data) => {
      if (sessionStoppedRef.current) return;
      itemQueueRef.current.push(data);
      if (!isProcessingRef.current) processNextItem();
    };

    const handleBoardImage = (data) => {
      if (sessionStoppedRef.current) return;
      const board = boardRef.current;
      if (board?.displayBoardImage && data) board.displayBoardImage(data);
    };

    const handleQueueClear = () => {
      itemQueueRef.current = [];
      isProcessingRef.current = false;
    };

    socket.off('connect');
    socket.off('disconnect');
    socket.off('ai_reply');
    socket.off('board_image');
    socket.off('queue_clear');

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('ai_reply', handleAIReply);
    socket.on('board_image', handleBoardImage);
    socket.on('queue_clear', handleQueueClear);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('ai_reply', handleAIReply);
      socket.off('board_image', handleBoardImage);
      socket.off('queue_clear', handleQueueClear);
    };
  }, []);

  useEffect(() => {
    docInfoRef.current = docInfo;
  }, [docInfo]);

  useEffect(() => {
    return () => {
      sessionStoppedRef.current = true;
      isSessionActiveRef.current = false;
      stopTutorSpeech();
      cleanupSession();
      if (socket.connected) socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================================================
  // RENDER
  // =====================================================================

  return (
    <div className="h-screen w-full relative flex flex-col overflow-hidden select-none"
      style={{ background: 'linear-gradient(180deg, #F5F0E8 0%, #EDE5D8 60%, #E0D5C5 100%)' }}>

      {/* ===== CEILING TRIM ===== */}
      <div className="absolute top-0 left-0 right-0 h-3 pointer-events-none z-[1]"
        style={{ background: 'linear-gradient(180deg, #D4C9B8, transparent)' }} />

      {/* ===== FLOOR ===== */}
      <div className="absolute bottom-0 left-0 right-0 h-[18vh] pointer-events-none z-[1]"
        style={{ background: 'linear-gradient(180deg, #C4A882 0%, #B8956E 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ background: 'repeating-linear-gradient(90deg, transparent, transparent 60px, #8B6914 60px, #8B6914 61px)' }} />
      </div>
      <div className="absolute bottom-[18vh] left-0 right-0 h-3 pointer-events-none z-[1]"
        style={{ background: 'linear-gradient(180deg, #B8956E, #A07850)' }} />

      {/* ===== LEFT WINDOW ===== */}
      <div className="absolute top-[8%] left-[6%] w-[18%] h-[55%] rounded-t-2xl overflow-hidden border-2 pointer-events-none z-[1]"
        style={{ borderColor: '#D4C9B8' }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #E8F4F8 0%, #D4E8F0 100%)' }} />
        <div className="absolute left-1/2 top-0 bottom-0 w-[3px]" style={{ background: '#D4C9B8' }} />
        <div className="absolute top-1/2 left-0 right-0 h-[3px]" style={{ background: '#D4C9B8' }} />
        <div className="absolute -right-10 top-0 w-20 h-full bg-amber-400/10 blur-3xl animate-sunlight" />
        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-amber-200/20 to-transparent" />
      </div>

      {/* ===== RIGHT WINDOW ===== */}
      <div className="absolute top-[8%] right-[6%] w-[18%] h-[55%] rounded-t-2xl overflow-hidden border-2 pointer-events-none z-[1]"
        style={{ borderColor: '#D4C9B8' }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #E8F4F8 0%, #D4E8F0 100%)' }} />
        <div className="absolute left-1/2 top-0 bottom-0 w-[3px]" style={{ background: '#D4C9B8' }} />
        <div className="absolute top-1/2 left-0 right-0 h-[3px]" style={{ background: '#D4C9B8' }} />
        <div className="absolute -left-10 top-0 w-20 h-full bg-amber-400/10 blur-3xl animate-sunlight" style={{ animationDelay: '-4s' }} />
        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-amber-200/20 to-transparent" />
      </div>

      {/* ===== SUNLIGHT RAYS ===== */}
      <div className="absolute top-[15%] left-[10%] w-full h-[40%] pointer-events-none z-[1] overflow-hidden">
        <div className="absolute top-0 left-0 w-[60%] h-full bg-gradient-to-r from-amber-300/5 to-transparent blur-3xl animate-sunlight"
          style={{ transform: 'rotate(15deg)', transformOrigin: 'top left' }} />
      </div>

      {/* ===== CLOCK ===== */}
      <div className="absolute top-[4%] right-[15%] w-[3.5%] aspect-square rounded-full bg-white/30 border border-white/10 flex items-center justify-center pointer-events-none z-[1]">
        <div className="w-[2px] h-[30%] bg-amber-600/30 rounded-full absolute bottom-1/2 left-1/2 -translate-x-1/2 rotate-[45deg] origin-bottom" />
        <div className="w-[2px] h-[22%] bg-amber-600/20 rounded-full absolute bottom-1/2 left-1/2 -translate-x-1/2 rotate-[90deg] origin-bottom" />
      </div>

      {/* ===== WALL ART ===== */}
      <div className="absolute top-[6%] left-[1%] w-[4%] aspect-[3/4] border border-amber-300/10 rounded-sm pointer-events-none z-[1] flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.05), rgba(245,158,11,0.08))' }}>
        <svg className="w-4 h-4 text-amber-400/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>

      {/* ===== TEACHER'S TABLE ===== */}
      <div className="absolute bottom-[20%] left-[30%] right-[22%] h-[1.5%] rounded-sm pointer-events-none z-[1] shadow-md"
        style={{ background: 'linear-gradient(180deg, #6B4226, #5C3A1E)' }} />
      <div className="absolute bottom-[21.5%] left-[31%] right-[23%] h-[0.5%] pointer-events-none z-[1]"
        style={{ background: '#4A2E15' }} />

      {/* ===== BLACKBOARD FRAME (wooden) ===== */}
      <div className="absolute top-[7%] left-[28%] right-[20%] bottom-[30%] rounded-lg overflow-hidden shadow-2xl z-[3]"
        style={{ background: '#1A1A1A', border: '8px solid #5C3A1E' }}>
        {/* Chalk tray */}
        <div className="absolute -bottom-4 left-0 right-0 h-4 z-10"
          style={{ background: 'linear-gradient(180deg, #5C3A1E, #4A2E15)', borderRadius: '0 0 4px 4px' }} />
        {/* Board content */}
        <div className="absolute inset-0">
          {/* AI Tutor badge */}
          <div className="absolute top-2 left-2 z-10 bg-white/10 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
            <p className="text-xs font-bold text-amber-300/80 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-ring" />
              AI Tutor
            </p>
          </div>
          <BoardCanvas
            onReady={(boardInstance) => {
              boardRef.current = boardInstance;
              console.log('BoardCanvas instance received:', boardInstance);
              updateBoardPageState();
            }}
          />
          {/* Page controls */}
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-xs">
            <button
              onClick={() => {
                boardRef.current?.navigateToPage?.(boardCurrentPage - 1);
                updateBoardPageState();
              }}
              disabled={boardCurrentPage <= 1}
              className="disabled:opacity-30 hover:text-amber-300 transition-colors"
            >◀</button>
            <span className="font-medium min-w-[70px] text-center select-none">
              {isSessionActive ? `Page ${boardCurrentPage}/${boardTotalPages}` : 'Board'}
            </span>
            <button
              onClick={() => {
                boardRef.current?.navigateToPage?.(boardCurrentPage + 1);
                updateBoardPageState();
              }}
              disabled={boardCurrentPage >= boardTotalPages}
              className="disabled:opacity-30 hover:text-amber-300 transition-colors"
            >▶</button>
            <span className="w-px h-3 bg-white/20 mx-0.5" />
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
              className="text-xs hover:text-amber-300 transition-colors"
              title="Save all board pages as PDF"
            >💾</button>
          </div>
        </div>
      </div>

      {/* ===== TUTOR AVATAR (beside board) ===== */}
      <div className="absolute bottom-[20%] right-[7%] w-[12%] aspect-[3/4] z-[3] flex flex-col items-center">
        <div className="relative w-full h-full flex flex-col items-center">
          {/* TalkingTutor container */}
          <div className="relative w-full h-full rounded-t-full overflow-hidden shadow-2xl">
            {!isTutorReady && (
              <div className="absolute inset-0 z-10 bg-[#0A0A0F]/70 flex items-center justify-center rounded-t-full">
                <div className="text-center">
                  <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-white text-[10px] font-medium">Loading avatar...</p>
                </div>
              </div>
            )}
            <TalkingTutor
              avatarPath="/avatars/female-avatar4.glb"
              onReady={handleAvatarReady}
            />
          </div>
        </div>
        <div className="mt-1.5 text-[9px] font-mono tracking-wider text-amber-700/50 uppercase">AI Tutor</div>
      </div>

      {/* ===== STATUS PILL ===== */}
      <div className="absolute bottom-[7.5%] left-1/2 -translate-x-1/2 z-[5]">
        {isLoadingRoom ? (
          <div className="px-4 py-1.5 rounded-full backdrop-blur-md bg-white/40 border border-white/30 animate-pulse">
            <div className="h-2.5 w-20 bg-amber-200/40 rounded-full" />
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-md bg-white/40 border border-white/30">
            <span className={`w-1.5 h-1.5 rounded-full ${isSessionActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-glow-pulse'}`} />
            <span className="text-[11px] font-mono text-amber-800/60 tracking-wider uppercase">{statusText}</span>
          </div>
        )}
      </div>

      {/* ===== FLOATING CONTROLS BAR ===== */}
      <div className="absolute bottom-[2%] left-1/2 -translate-x-1/2 z-[5] w-[92%] max-w-4xl">
        <div className="backdrop-blur-2xl bg-[#0A0A0F]/80 rounded-2xl border border-white/[0.06] px-5 py-3 shadow-2xl flex items-center justify-between gap-3 flex-wrap">
          
          {/* Left: Room info + Language */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 pr-3 border-r border-white/[0.06]">
              <span className={`w-2 h-2 rounded-full ${isSessionActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500/50'}`} />
              <span className="text-xs font-mono text-amber-200/50 tracking-tight">Room: {roomId?.substring(0, 8) || '---'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-wider uppercase text-amber-300/50">Speak</span>
              <select value={speakingLang} onChange={(e) => setSpeakingLang(e.target.value)}
                disabled={isSessionActive}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-amber-200/70 focus:outline-none focus:border-amber-400/30 appearance-none cursor-pointer disabled:opacity-40">
                {LANG_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-[#0A0A0F]">{o.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-wider uppercase text-amber-300/50">Write</span>
              <select value={writingLang} onChange={(e) => setWritingLang(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-amber-200/70 focus:outline-none focus:border-amber-400/30 appearance-none cursor-pointer">
                {LANG_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-[#0A0A0F]">{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Right: Upload + Session controls */}
          <div className="flex items-center gap-2">
            {/* Upload */}
            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer
              ${isUploading ? 'opacity-50 pointer-events-none border-white/[0.04] text-amber-200/30' :
              docInfo ? 'border-emerald-400/20 text-emerald-300/70 bg-emerald-400/5' :
              'border-white/[0.08] text-amber-200/50 hover:bg-white/[0.04] hover:text-amber-200'}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
              {isUploading ? 'Uploading...' : docInfo ? docInfo.filename?.substring(0, 12) + '...' : 'PDF'}
              <input type="file" accept=".pdf" onChange={handleUploadDoc} className="hidden" disabled={isUploading} />
            </label>
            {docInfo && (
              <button onClick={() => { setDocInfo(null); }} className="text-xs text-amber-200/30 hover:text-red-400 transition-colors px-1" title="Remove document">✕</button>
            )}
            {isUploading && (
              <div className="w-12 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full bg-amber-400/60 rounded-full animate-upload-bar" />
              </div>
            )}

            <span className="w-px h-5 bg-white/[0.06]" />

            {/* Mute */}
            <button
              onClick={toggleMute}
              disabled={!isSessionActive}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs transition-all
                ${!isSessionActive ? 'opacity-20 cursor-not-allowed border-white/[0.04]' :
                isMuted ? 'border-red-400/30 text-red-400/60 bg-red-400/5' :
                'border-white/[0.08] text-amber-200/50 hover:border-amber-400/30 hover:text-amber-200 bg-white/[0.04]'}`}
            >
              {isMuted ? '🔇' : '🎙️'}
            </button>

            {/* Start / Stop Session */}
            <button
              onClick={handleSessionToggle}
              disabled={!isTutorReady && !isSessionActive}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg
                ${!isTutorReady && !isSessionActive ? 'opacity-30 cursor-not-allowed' : 'hover:-translate-y-0.5 active:scale-95'}
                ${isSessionActive
                  ? 'bg-red-500/80 text-white hover:bg-red-500/90 shadow-red-500/20'
                  : 'bg-white text-[#0A0A0F] hover:bg-white/90 shadow-amber-500/20'}`}
            >
              {isSessionActive ? '⏹ Stop' : isTutorReady ? '▶ Start' : '⏳'}
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};

export default function Page() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-[#F5F0E8] flex items-center justify-center">
        <div className="text-amber-200/60 text-sm font-medium">Loading room...</div>
      </div>
    }>
      <RoomContent />
    </Suspense>
  );
}
