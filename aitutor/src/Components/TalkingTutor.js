"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LipsyncEn } from './lipsync-en.mjs';
import {
  initFont, isFontReady, analyzeText, drawAnimatedText, drawFullText
} from './boardAnimation.js';

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `@font-face { font-family: 'Patrick Hand'; src: url('/fonts/PatrickHand-Regular.ttf') format('truetype'); }`;
  document.head.appendChild(style);
}

const lipsync = new LipsyncEn();

const VISEME_TARGETS = [
  'viseme_sil','viseme_PP','viseme_FF','viseme_TH','viseme_DD','viseme_kk',
  'viseme_CH','viseme_SS','viseme_nn','viseme_RR','viseme_aa','viseme_E',
  'viseme_I','viseme_O','viseme_U'
];

const BOARD_W = 800;
const BOARD_H = 600;
const CHAR_DRAW_DURATION = 0.055;

export default function TalkingTutor({ avatarPath, onReady }) {
  const containerRef = useRef(null);
  const boardCanvasRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const modelRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const gainNodeRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isPlayingRef = useRef(false);
  const audioStartTimeRef = useRef(0);
  const visemeTimelineRef = useRef([]);

  const boardPagesRef = useRef([{ id: 1, commands: [], image: null }]);
  const currentPageIndexRef = useRef(0);
  const pageIdCounterRef = useRef(2);
  const drawTimersRef = useRef([]);

  const fontLoadedRef = useRef(false);
  const boardAnimFrameRef = useRef(null);
  const animStartTimeRef = useRef(0);
  const animatingCmdsRef = useRef([]);

  const getCtx = useCallback(() => {
    const canvas = boardCanvasRef.current;
    return canvas ? canvas.getContext('2d') : null;
  }, []);

  function drawCommand(ctx, cmd, cw, ch, progress = 1) {
    const sx = cw / BOARD_W;
    const sy = ch / BOARD_H;
    const color = cmd.color || '#FFFFFF';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (cmd.type) {
      case 'header':
      case 'text': {
        const content = cmd.content || '';
        const fontSize = cmd.size * sy || 32 * sy;
        const px = cmd.x * sx;
        const py = cmd.y * sy;

        if (cmd._glyphData && fontLoadedRef.current) {
          drawAnimatedText(ctx, cmd._glyphData, progress, {
            x: px, y: py, color, lineWidth: Math.max(2, fontSize * 0.1),
            showCursor: progress > 0 && progress < 1,
          });
        } else {
          ctx.font = `bold ${fontSize}px "Patrick Hand", "Segoe UI", Arial, sans-serif`;
          ctx.textBaseline = 'top';
          ctx.shadowColor = 'rgba(255,255,255,0.08)';
          ctx.shadowBlur = 2 * sy;
          ctx.globalAlpha = progress;
          ctx.fillText(content, px, py);
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
        }
        break;
      }
      case 'line': {
        ctx.lineWidth = 4 * sy;
        ctx.globalAlpha = progress;
        ctx.beginPath();
        ctx.moveTo(cmd.x1 * sx, cmd.y1 * sy);
        ctx.lineTo(cmd.x2 * sx, cmd.y2 * sy);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case 'arrow': {
        ctx.lineWidth = 4 * sy;
        const ax = cmd.x1 * sx, ay = cmd.y1 * sy;
        const bx = cmd.x2 * sx, by = cmd.y2 * sy;
        const angle = Math.atan2(by - ay, bx - ax);
        const headLen = 12 * sy;
        ctx.globalAlpha = progress;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - headLen * Math.cos(angle - 0.4), by - headLen * Math.sin(angle - 0.4));
        ctx.lineTo(bx - headLen * Math.cos(angle + 0.4), by - headLen * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case 'rect': {
        ctx.lineWidth = 4 * sy;
        const rx = cmd.x * sx, ry = cmd.y * sy;
        const rw = cmd.w * sx, rh = cmd.h * sy;
        ctx.globalAlpha = progress;
        if (cmd.fill) {
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.15 * progress;
          ctx.fillRect(rx, ry, rw, rh);
        }
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.globalAlpha = 1;
        break;
      }
      case 'circle': {
        ctx.lineWidth = 4 * sy;
        ctx.globalAlpha = progress;
        ctx.beginPath();
        ctx.arc(cmd.cx * sx, cmd.cy * sy, cmd.r * sx, 0, Math.PI * 2);
        if (cmd.fill) {
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.15 * progress;
          ctx.fill();
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case 'curve': {
        ctx.lineWidth = 4 * sy;
        const pts = cmd.points || [];
        if (pts.length >= 4) {
          ctx.globalAlpha = progress;
          ctx.beginPath();
          ctx.moveTo(pts[0][0] * sx, pts[0][1] * sy);
          ctx.bezierCurveTo(
            pts[2][0] * sx, pts[2][1] * sy,
            pts[3][0] * sx, pts[3][1] * sy,
            pts[1][0] * sx, pts[1][1] * sy
          );
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        break;
      }
      case 'showimage': {
        const page = boardPagesRef.current[currentPageIndexRef.current];
        if (page?.image) {
          const img = new Image();
          img.onload = () => {
            const dx = (cmd.x || 0) * sx;
            const dy = (cmd.y || 0) * sy;
            const dw = (cmd.w || BOARD_W) * sx;
            const dh = (cmd.h || BOARD_H) * sy;
            ctx.globalAlpha = (cmd.opacity ?? 0.7) * progress;
            ctx.drawImage(img, dx, dy, dw, dh);
            ctx.globalAlpha = 1;
          };
          img.src = page.image;
        }
        break;
      }
    }
  }

  const renderPage = useCallback((pageIndex) => {
    const ctx = getCtx();
    const canvas = boardCanvasRef.current;
    if (!ctx || !canvas) return;

    const pages = boardPagesRef.current;
    if (pageIndex < 0 || pageIndex >= pages.length) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const page = pages[pageIndex];
    if (page.image) {
      const img = new Image();
      img.src = page.image;
      ctx.globalAlpha = 1;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    for (const cmd of page.commands) {
      const prog = cmd._progress !== undefined ? cmd._progress : 1;
      drawCommand(ctx, cmd, canvas.width, canvas.height, prog);
    }
  }, [getCtx]);

  function startBoardAnimationLoop() {
    if (boardAnimFrameRef.current) cancelAnimationFrame(boardAnimFrameRef.current);

    if (animatingCmdsRef.current.length === 0) return;

    const animate = () => {
      const elapsed = isPlayingRef.current && audioContextRef.current
        ? audioContextRef.current.currentTime - audioStartTimeRef.current
        : (performance.now() - animStartTimeRef.current) / 1000;

      let allDone = true;

      for (const cmd of animatingCmdsRef.current) {
        const cmdTime = cmd.time || 0;
        const dur = cmd._duration || Math.max(0.5, (cmd.content || '').length * CHAR_DRAW_DURATION);
        const localElapsed = elapsed - cmdTime;

        if (localElapsed <= 0) {
          cmd._progress = 0;
          allDone = false;
        } else if (localElapsed >= dur) {
          cmd._progress = 1;
        } else {
          cmd._progress = localElapsed / dur;
          allDone = false;
        }
      }

      renderPage(currentPageIndexRef.current);

      if (!allDone) {
        boardAnimFrameRef.current = requestAnimationFrame(animate);
      } else {
        boardAnimFrameRef.current = null;
        animatingCmdsRef.current = [];
        for (const cmd of (boardPagesRef.current[currentPageIndexRef.current]?.commands || [])) {
          delete cmd._progress;
        }
      }
    };

    boardAnimFrameRef.current = requestAnimationFrame(animate);
  }

  const scheduleTimedDraws = useCallback((commands) => {
    drawTimersRef.current.forEach(t => clearTimeout(t));
    drawTimersRef.current = [];

    const animCmds = [];
    for (const cmd of commands) {
      if ((cmd.type === 'text' || cmd.type === 'header') && cmd._glyphData) {
        cmd._progress = 0;
        cmd._duration = cmd._duration || Math.max(0.5, (cmd.content || '').length * CHAR_DRAW_DURATION);
        animCmds.push(cmd);
      }
    }

    if (animCmds.length > 0) {
      animatingCmdsRef.current = animCmds;
      animStartTimeRef.current = isPlayingRef.current && audioContextRef.current
        ? audioContextRef.current.currentTime
        : performance.now();
      startBoardAnimationLoop();
    }
  }, []);

  const drawOnBoard = useCallback((boardresponse) => {
    if (!boardresponse || typeof boardresponse !== 'object') return;

    const { action, commands } = boardresponse;

    if (action === 'newpage') {
      boardPagesRef.current.push({ id: pageIdCounterRef.current++, commands: [] });
      currentPageIndexRef.current = boardPagesRef.current.length - 1;
    } else if (action === 'gotopage') {
      const target = Number(boardresponse.page) || 1;
      if (target >= 1 && target <= boardPagesRef.current.length) {
        currentPageIndexRef.current = target - 1;
      }
    } else if (action === 'erasepage') {
      boardPagesRef.current[currentPageIndexRef.current].commands = [];
    }

    if (!commands || !Array.isArray(commands)) {
      renderPage(currentPageIndexRef.current);
      return;
    }

    const page = boardPagesRef.current[currentPageIndexRef.current];
    const animatedCmds = [];

    for (const cmd of commands) {
      if (cmd.type === 'erase') {
        if (cmd.target === 'last' && page.commands.length > 0) {
          page.commands.pop();
        } else if (cmd.target === 'all') {
          page.commands = [];
        } else if (cmd.target === 'index' && typeof cmd.index === 'number') {
          page.commands.splice(cmd.index, 1);
        }
      } else if (cmd.type === 'clear') {
        page.commands = [];
      } else {
        if (cmd.type === 'text' || cmd.type === 'header') {
          const fontSize = cmd.size || 32;
          const glyphData = isFontReady() ? analyzeText(cmd.content || '', fontSize) : null;
          if (glyphData) {
            cmd._glyphData = glyphData;
            cmd._progress = 0;
            cmd._duration = Math.max(0.5, (cmd.content || '').length * CHAR_DRAW_DURATION);
            animatedCmds.push(cmd);
          }
        }
        page.commands.push(cmd);
      }
    }

    renderPage(currentPageIndexRef.current);

    if (animatedCmds.length > 0) {
      animatingCmdsRef.current = animatedCmds;
      animStartTimeRef.current = isPlayingRef.current && audioContextRef.current
        ? audioContextRef.current.currentTime
        : performance.now();
      startBoardAnimationLoop();
    } else {
      scheduleTimedDraws(commands);
    }
  }, [renderPage, scheduleTimedDraws]);

  const displayBoardImage = useCallback(({ page, image_base64 }) => {
    const idx = currentPageIndexRef.current;
    boardPagesRef.current[idx] = {
      ...boardPagesRef.current[idx],
      commands: boardPagesRef.current[idx]?.commands || [],
      image: image_base64,
    };
    renderPage(idx);
  }, [renderPage]);

  const clearBoard = useCallback(() => {
    boardPagesRef.current[currentPageIndexRef.current].commands = [];
    renderPage(currentPageIndexRef.current);
  }, [renderPage]);

  const saveBoardAsImage = useCallback(() => {
    const canvas = boardCanvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  }, []);

  const saveAllPages = useCallback(() => {
    const pages = boardPagesRef.current;
    return pages.map((_, idx) => {
      const offscreen = document.createElement('canvas');
      offscreen.width = BOARD_W;
      offscreen.height = BOARD_H;
      const octx = offscreen.getContext('2d');
      if (!octx) return null;

      octx.fillStyle = '#1a1a2e';
      octx.fillRect(0, 0, BOARD_W, BOARD_H);

      for (const cmd of pages[idx].commands) {
        if (cmd._glyphData) {
          const color = cmd.color || '#FFFFFF';
          const fontSize = cmd.size || 32;
          drawFullText(octx, cmd._glyphData, {
            x: cmd.x, y: cmd.y, color,
            lineWidth: Math.max(2, fontSize * 0.1),
          });
        } else {
          drawCommand(octx, cmd, BOARD_W, BOARD_H);
        }
      }

      return offscreen.toDataURL('image/png');
    });
  }, []);

  const navigateToPage = useCallback((n) => {
    if (n < 1 || n > boardPagesRef.current.length) return;
    if (boardAnimFrameRef.current) {
      cancelAnimationFrame(boardAnimFrameRef.current);
      boardAnimFrameRef.current = null;
    }
    animatingCmdsRef.current = [];
    currentPageIndexRef.current = n - 1;
    renderPage(n - 1);
  }, [renderPage]);

  const getBoardState = useCallback(() => ({
    currentPage: currentPageIndexRef.current + 1,
    totalPages: boardPagesRef.current.length,
  }), []);

  function getInterpolatedVisemes(time) {
    const timeline = visemeTimelineRef.current;
    if (!timeline || timeline.length === 0) return {};

    let before = timeline[0];
    let after = timeline[timeline.length - 1];

    for (let i = 0; i < timeline.length - 1; i++) {
      if (time >= timeline[i].time && time <= timeline[i + 1].time) {
        before = timeline[i];
        after = timeline[i + 1];
        break;
      }
    }

    if (time <= before.time) return before.visemes;
    if (time >= after.time) return after.visemes;

    const t = (time - before.time) / (after.time - before.time);
    const result = {};
    const allKeys = new Set([...Object.keys(before.visemes), ...Object.keys(after.visemes)]);

    allKeys.forEach(key => {
      const v1 = before.visemes[key] || 0;
      const v2 = after.visemes[key] || 0;
      result[key] = v1 + (v2 - v1) * t;
    });

    return result;
  }

  function applyVisemesToModel(visemes) {
    if (!modelRef.current) return;

    modelRef.current.traverse((child) => {
      if (!child.isMesh || !child.morphTargetDictionary || !child.morphTargetInfluences) return;

      const dict = child.morphTargetDictionary;
      const influences = child.morphTargetInfluences;

      VISEME_TARGETS.forEach(name => {
        const idx = dict[name];
        if (idx !== undefined) influences[idx] = 0;
      });
      if (dict['jawOpen'] !== undefined) influences[dict['jawOpen']] = 0;
      if (dict['mouthOpen'] !== undefined) influences[dict['mouthOpen']] = 0;

      Object.entries(visemes).forEach(([key, weight]) => {
        const w = Math.max(0, Math.min(1, weight || 0));
        const idx = dict[key];
        if (idx !== undefined) influences[idx] = w;
      });
    });
  }

  function startAnimationLoop() {
    const animate = () => {
      if (isPlayingRef.current && audioContextRef.current && visemeTimelineRef.current.length > 0) {
        const elapsed = audioContextRef.current.currentTime - audioStartTimeRef.current;
        const visemes = getInterpolatedVisemes(elapsed);
        applyVisemesToModel(visemes);
      }
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
  }

  function initAudioSystem() {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = 0.8;
      gainNodeRef.current.connect(audioContextRef.current.destination);
    } catch (err) {
      console.error('Failed to initialize audio system:', err);
      throw err;
    }
  }

  function initThreeJS() {
    sceneRef.current = new THREE.Scene();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    sceneRef.current.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(4, 8, 6);
    sceneRef.current.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.6);
    fillLight.position.set(-5, 5, 4);
    sceneRef.current.add(fillLight);

    cameraRef.current = new THREE.PerspectiveCamera(48, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 100);
    cameraRef.current.position.set(0, 1.65, 3.4);
    cameraRef.current.lookAt(0, 1.35, 0);

    rendererRef.current = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current.shadowMap.enabled = true;

    containerRef.current.appendChild(rendererRef.current.domElement);
  }

  function loadAvatarModel(url) {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf) => {
          modelRef.current = gltf.scene || gltf.scenes[0];
          sceneRef.current.add(modelRef.current);

          const box = new THREE.Box3().setFromObject(modelRef.current);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          modelRef.current.position.set(0, 0, 0);
          modelRef.current.position.x -= center.x;
          modelRef.current.position.z -= center.z;
          modelRef.current.position.y = -center.y + 0.1;

          const maxDim = Math.max(size.x, size.y, size.z);
          modelRef.current.scale.setScalar(2.2 / maxDim);

          resolve();
        },
        null,
        (error) => reject(error)
      );
    });
  }

  function generateVisemeTimeline(words, wtimes, wdurations) {
    visemeTimelineRef.current = [];

    words.forEach((word, i) => {
      const wordStart = wtimes[i] || 0;
      const wordDur = wdurations[i] || 0.25;
      const result = lipsync.wordsToVisemes(word);

      if (result.visemes.length > 0) {
        const totalDur = result.times[result.times.length - 1] +
          result.durations[result.durations.length - 1];
        const scale = totalDur > 0 ? wordDur / totalDur : 1;

        result.visemes.forEach((viseme, j) => {
          const t = wordStart + result.times[j] * scale;
          const d = result.durations[j] * scale;
          const visemeKey = 'viseme_' + viseme;

          visemeTimelineRef.current.push({
            time: t,
            visemes: { [visemeKey]: 1.0, jawOpen: 0.6 }
          });
          visemeTimelineRef.current.push({
            time: t + d * 0.7,
            visemes: { [visemeKey]: 0.4, jawOpen: 0.2 }
          });
        });
      }
    });
  }

  function generateSimpleVisemeTimeline(audioBuffer) {
    visemeTimelineRef.current = [];
    const sampleRate = audioBuffer.sampleRate;
    const data = audioBuffer.getChannelData(0);
    const chunkSize = Math.floor(sampleRate / 10);

    for (let i = 0; i < data.length; i += chunkSize) {
      const time = i / sampleRate;
      let sum = 0;
      for (let j = 0; j < chunkSize && i + j < data.length; j++) {
        sum += data[i + j] * data[i + j];
      }
      const rms = Math.sqrt(sum / chunkSize);
      const jawOpen = Math.min(rms * 4, 1.0);

      visemeTimelineRef.current.push({
        time,
        visemes: { jawOpen: jawOpen }
      });
    }
  }

  function stopSpeaking() {
    if (isPlayingRef.current && audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) { }
      isPlayingRef.current = false;
    }
    applyVisemesToModel({});
  }

  function cancelSpeaking() {
    stopSpeaking();
    visemeTimelineRef.current = [];
    applyVisemesToModel({});
  }

  async function speakAudio(audioObject, options, callback) {
    if (!audioObject || !audioObject.audio) {
      console.warn('No audio data provided');
      return;
    }

    try {
      stopSpeaking();

      const audioBuffer = audioObject.audio;

      if (audioObject.words && audioObject.wtimes && audioObject.wdurations) {
        generateVisemeTimeline(audioObject.words, audioObject.wtimes, audioObject.wdurations);
      } else {
        generateSimpleVisemeTimeline(audioBuffer);
      }

      audioSourceRef.current = audioContextRef.current.createBufferSource();
      audioSourceRef.current.buffer = audioBuffer;
      audioSourceRef.current.connect(gainNodeRef.current);

      const startTime = audioContextRef.current.currentTime + 0.01;
      audioSourceRef.current.start(startTime);

      audioStartTimeRef.current = startTime;
      isPlayingRef.current = true;

      audioSourceRef.current.onended = () => {
        isPlayingRef.current = false;
        applyVisemesToModel({});
        callback && callback(null);
      };

    } catch (err) {
      console.error('speakAudio error:', err);
      throw err;
    }
  }

  function initAvatarSystem() {
    initThreeJS();
    return loadAvatarModel(avatarPath).then(() => {
      initAudioSystem();
      startAnimationLoop();
      return initFont();
    }).then(() => {
      fontLoadedRef.current = isFontReady();
    });
  }

  const sizeCanvas = useCallback(() => {
    const canvas = boardCanvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    canvas.width = Math.round(rect.width * window.devicePixelRatio);
    canvas.height = Math.round(rect.height * window.devicePixelRatio);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    renderPage(currentPageIndexRef.current);
  }, [renderPage]);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    containerRef.current.innerHTML = '';

    initAvatarSystem().then(() => {
      if (cancelled) return;
      setIsReady(true);
      if (onReady) {
        onReady({
          speakAudio,
          stop: stopSpeaking,
          stopSpeaking,
          cancelSpeech: cancelSpeaking,
          drawOnBoard,
          displayBoardImage,
          clearBoard,
          saveBoardAsImage,
          saveAllPages,
          navigateToPage,
          getCurrentPage: () => currentPageIndexRef.current + 1,
          getTotalPages: () => boardPagesRef.current.length,
          getBoardState,
        });
      }
    }).catch(err => {
      if (cancelled) return;
      console.error('Failed to initialize avatar system:', err);
      setError(err.message);
    });

    sizeCanvas();

    return () => {
      cancelled = true;
      drawTimersRef.current.forEach(t => clearTimeout(t));
      cancelAnimationFrame(animationFrameRef.current);
      if (boardAnimFrameRef.current) cancelAnimationFrame(boardAnimFrameRef.current);
      if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch (e) { }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [avatarPath]);

  return (
    <div className="w-full h-[600px] rounded-[2rem] overflow-hidden relative shadow-2xl">
      <canvas
        ref={boardCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: '#1a1a2e', display: 'block' }}
      />
      <div
        ref={containerRef}
        className="pointer-events-none"
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
      />
      <div className="absolute inset-0 bg-black/10 pointer-events-none shadow-inner" style={{ zIndex: 2 }} />
    </div>
  );
}
