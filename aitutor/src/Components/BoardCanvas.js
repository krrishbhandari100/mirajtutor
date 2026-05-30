"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  initFont, isFontReady, analyzeText, drawAnimatedText, drawFullText
} from './boardAnimation.js';

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `@font-face { font-family: 'Patrick Hand'; src: url('/fonts/PatrickHand-Regular.ttf') format('truetype'); }`;
  document.head.appendChild(style);
}

const BOARD_W = 800;
const BOARD_H = 600;
const CHAR_DRAW_DURATION = 0.055;

export default function BoardCanvas({ onReady }) {
  const boardCanvasRef = useRef(null);

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

  const startBoardAnimationLoop = useCallback(() => {
    if (boardAnimFrameRef.current) cancelAnimationFrame(boardAnimFrameRef.current);

    if (animatingCmdsRef.current.length === 0) return;

    const animate = () => {
      const elapsed = (performance.now() - animStartTimeRef.current) / 1000;

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
  }, [renderPage]);

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
      animStartTimeRef.current = performance.now();
      startBoardAnimationLoop();
    }
  }, [startBoardAnimationLoop]);

  const drawOnBoard = useCallback((boardresponse, targetPage) => {
    if (!boardresponse || typeof boardresponse !== 'object') return;

    const { action, commands } = boardresponse;

    let targetPageIndex;

    if (action === 'newpage') {
      boardPagesRef.current.push({ id: pageIdCounterRef.current++, commands: [] });
      targetPageIndex = boardPagesRef.current.length - 1;
    } else if (action === 'gotopage') {
      const target = Number(boardresponse.page) || 1;
      if (target >= 1 && target <= boardPagesRef.current.length) {
        currentPageIndexRef.current = target - 1;
      }
      targetPageIndex = currentPageIndexRef.current;
    } else if (action === 'erasepage') {
      const idx = targetPage != null ? targetPage - 1 : currentPageIndexRef.current;
      if (idx >= 0 && idx < boardPagesRef.current.length) {
        boardPagesRef.current[idx].commands = [];
      }
      targetPageIndex = currentPageIndexRef.current;
    } else {
      if (targetPage != null) {
        targetPageIndex = targetPage - 1;
        if (targetPageIndex < 0 || targetPageIndex >= boardPagesRef.current.length) {
          targetPageIndex = currentPageIndexRef.current;
        }
      } else {
        targetPageIndex = currentPageIndexRef.current;
      }
    }

    if (!commands || !Array.isArray(commands)) {
      renderPage(currentPageIndexRef.current);
      return;
    }

    const page = boardPagesRef.current[targetPageIndex];
    if (!page) {
      renderPage(currentPageIndexRef.current);
      return;
    }

    const isVisible = targetPageIndex === currentPageIndexRef.current;
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
        if (isVisible && (cmd.type === 'text' || cmd.type === 'header')) {
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

    if (isVisible && animatedCmds.length > 0) {
      animatingCmdsRef.current = animatedCmds;
      animStartTimeRef.current = performance.now();
      startBoardAnimationLoop();
    }
  }, [renderPage, startBoardAnimationLoop]);

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
    initFont().then(() => {
      fontLoadedRef.current = isFontReady();
    });
  }, []);

  useEffect(() => {
    sizeCanvas();
    const onResize = () => sizeCanvas();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      drawTimersRef.current.forEach(t => clearTimeout(t));
      if (boardAnimFrameRef.current) cancelAnimationFrame(boardAnimFrameRef.current);
    };
  }, [sizeCanvas]);

  useEffect(() => {
    if (onReady) {
      onReady({
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
  }, [onReady, drawOnBoard, displayBoardImage, clearBoard, saveBoardAsImage, saveAllPages, navigateToPage, getBoardState]);

  return (
    <div className="w-full h-full rounded-[2rem] overflow-hidden relative shadow-2xl">
      <canvas
        ref={boardCanvasRef}
        width={800}
        height={600}
        className="absolute inset-0 w-full h-full"
        style={{ background: '#1a1a2e', display: 'block' }}
      />
    </div>
  );
}
