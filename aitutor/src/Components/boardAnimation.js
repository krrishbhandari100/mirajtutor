import opentype from 'opentype.js';

let loadedFont = null;

export async function initFont(fontPath = '/fonts/PatrickHand-Regular.ttf') {
  if (loadedFont) return loadedFont;
  try {
    const response = await fetch(fontPath);
    const buffer = await response.arrayBuffer();
    loadedFont = opentype.parse(buffer);
  } catch (err) {
    console.warn('Handwriting font load failed, using fillText fallback:', err);
    loadedFont = null;
  }
  return loadedFont;
}

export function isFontReady() {
  return loadedFont !== null;
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function cubicBezierLength(ax, ay, bx, by, cx, cy, dx, dy) {
  let length = 0;
  let px = ax, py = ay;
  for (let i = 1; i <= 20; i++) {
    const t = i / 20;
    const u = 1 - t;
    const x = u * u * u * ax + 3 * u * u * t * bx + 3 * u * t * t * cx + t * t * t * dx;
    const y = u * u * u * ay + 3 * u * u * t * by + 3 * u * t * t * cy + t * t * t * dy;
    length += dist(px, py, x, y);
    px = x; py = y;
  }
  return length;
}

function quadBezierLength(ax, ay, bx, by, cx, cy) {
  let length = 0;
  let px = ax, py = ay;
  for (let i = 1; i <= 20; i++) {
    const t = i / 20;
    const u = 1 - t;
    const x = u * u * ax + 2 * u * t * bx + t * t * cx;
    const y = u * u * ay + 2 * u * t * by + t * t * cy;
    length += dist(px, py, x, y);
    px = x; py = y;
  }
  return length;
}

function measureCommandsLength(commands) {
  let length = 0;
  let cx = 0, cy = 0;
  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
        cx = cmd.x; cy = cmd.y; break;
      case 'L':
        length += dist(cx, cy, cmd.x, cmd.y);
        cx = cmd.x; cy = cmd.y; break;
      case 'C':
        length += cubicBezierLength(cx, cy, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        cx = cmd.x; cy = cmd.y; break;
      case 'Q':
        length += quadBezierLength(cx, cy, cmd.x1, cmd.y1, cmd.x, cmd.y);
        cx = cmd.x; cy = cmd.y; break;
    }
  }
  return length;
}

function commandsToCanvas(ctx, commands, ox = 0, oy = 0) {
  ctx.beginPath();
  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
        ctx.moveTo(cmd.x + ox, cmd.y + oy); break;
      case 'L':
        ctx.lineTo(cmd.x + ox, cmd.y + oy); break;
      case 'C':
        ctx.bezierCurveTo(
          cmd.x1 + ox, cmd.y1 + oy,
          cmd.x2 + ox, cmd.y2 + oy,
          cmd.x + ox, cmd.y + oy
        ); break;
      case 'Q':
        ctx.quadraticCurveTo(
          cmd.x1 + ox, cmd.y1 + oy,
          cmd.x + ox, cmd.y + oy
        ); break;
    }
  }
}

function getPointAtFraction(stroke, fraction) {
  const commands = stroke.commands;
  const totalLength = stroke.length;
  if (totalLength === 0) return null;
  const target = totalLength * Math.min(Math.max(fraction, 0), 1);
  let accumulated = 0;
  let cx = 0, cy = 0;

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
        cx = cmd.x; cy = cmd.y; break;
      case 'L': {
        const segLen = dist(cx, cy, cmd.x, cmd.y);
        if (accumulated + segLen >= target) {
          const t = (target - accumulated) / (segLen || 0.001);
          return { x: cx + (cmd.x - cx) * t, y: cy + (cmd.y - cy) * t };
        }
        accumulated += segLen;
        cx = cmd.x; cy = cmd.y; break;
      }
      case 'C': {
        const samples = 30;
        let px = cx, py = cy;
        for (let i = 1; i <= samples; i++) {
          const t = i / samples;
          const u = 1 - t;
          const x = u * u * u * cx + 3 * u * u * t * cmd.x1 + 3 * u * t * t * cmd.x2 + t * t * t * cmd.x;
          const y = u * u * u * cy + 3 * u * u * t * cmd.y1 + 3 * u * t * t * cmd.y2 + t * t * t * cmd.y;
          const segLen = dist(px, py, x, y);
          if (accumulated + segLen >= target) return { x, y };
          accumulated += segLen;
          px = x; py = y;
        }
        cx = cmd.x; cy = cmd.y; break;
      }
      case 'Q': {
        const samples = 20;
        let px = cx, py = cy;
        for (let i = 1; i <= samples; i++) {
          const t = i / samples;
          const u = 1 - t;
          const x = u * u * cx + 2 * u * t * cmd.x1 + t * t * cmd.x;
          const y = u * u * cy + 2 * u * t * cmd.y1 + t * t * cmd.y;
          const segLen = dist(px, py, x, y);
          if (accumulated + segLen >= target) return { x, y };
          accumulated += segLen;
          px = x; py = y;
        }
        cx = cmd.x; cy = cmd.y; break;
      }
    }
  }
  return null;
}

export function analyzeText(text, fontSize) {
  if (!loadedFont) return null;
  const scale = fontSize / loadedFont.unitsPerEm;
  const chars = [];
  let cursorX = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === ' ' || char === '\n') {
      cursorX += char === ' ' ? fontSize * 0.35 : 0;
      if (char === '\n') cursorX = 0;
      continue;
    }

    const glyph = loadedFont.charToGlyph(char);
    const path = glyph.getPath(0, 0, fontSize);
    const advanceWidth = (glyph.advanceWidth || 0) * scale;

    const strokes = [];
    let currentStroke = null;

    for (const cmd of path.commands) {
      if (cmd.type === 'M') {
        if (currentStroke && currentStroke.commands.length > 0) {
          const cmds = currentStroke.commands;
          strokes.push({ commands: cmds, length: measureCommandsLength(cmds) });
        }
        currentStroke = { commands: [cmd] };
      } else if (currentStroke) {
        currentStroke.commands.push(cmd);
      }
    }
    if (currentStroke && currentStroke.commands.length > 0) {
      const cmds = currentStroke.commands;
      strokes.push({ commands: cmds, length: measureCommandsLength(cmds) });
    }

    chars.push({
      char, strokes,
      width: advanceWidth,
      xOffset: cursorX,
      totalStrokes: strokes.length,
      totalLength: strokes.reduce((s, st) => s + st.length, 0),
    });

    cursorX += advanceWidth;
  }

  return {
    chars,
    totalWidth: cursorX,
    totalStrokes: chars.reduce((s, c) => s + c.totalStrokes, 0),
    totalLength: chars.reduce((s, c) => s + c.totalLength, 0),
  };
}

export function drawAnimatedText(ctx, glyphData, progress, opts = {}) {
  if (!glyphData || glyphData.totalLength === 0) return;
  const {
    x = 0, y = 0, color = '#FFFFFF',
    lineWidth = 3, showCursor = false, cursorColor
  } = opts;

  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const targetLength = glyphData.totalLength * clampedProgress;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lineWidth;

  let drawnSoFar = 0;
  let cursorPos = null;

  for (const ch of glyphData.chars) {
    const cxOff = x + ch.xOffset;
    for (const stroke of ch.strokes) {
      const start = drawnSoFar;
      const end = drawnSoFar + stroke.length;

      if (start >= targetLength) {
        drawnSoFar = end;
        continue;
      }

      if (end <= targetLength) {
        commandsToCanvas(ctx, stroke.commands, cxOff, y);
        ctx.stroke();
        const last = stroke.commands[stroke.commands.length - 1];
        cursorPos = { x: cxOff + last.x, y: y + last.y };
      } else {
        const strokeProgress = (targetLength - start) / stroke.length;
        commandsToCanvas(ctx, stroke.commands, cxOff, y);
        ctx.setLineDash([stroke.length]);
        ctx.lineDashOffset = stroke.length * (1 - strokeProgress);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        const pt = getPointAtFraction(stroke, strokeProgress);
        if (pt) cursorPos = { x: cxOff + pt.x, y: y + pt.y };

        drawnSoFar = end;
        continue;
      }

      drawnSoFar = end;
    }
  }

  if (showCursor && cursorPos && clampedProgress < 1) {
    const blink = Math.sin(Date.now() / 250) > 0;
    if (blink) {
      ctx.beginPath();
      ctx.arc(cursorPos.x, cursorPos.y, lineWidth * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = cursorColor || color;
      ctx.globalAlpha = 0.5;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
}

export function drawFullText(ctx, glyphData, opts = {}) {
  drawAnimatedText(ctx, glyphData, 1, opts);
}
