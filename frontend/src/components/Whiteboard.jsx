import React, { useRef, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSocket } from '../context/SocketContext';

const FLOWCHART_SHAPES = ['rect', 'circle', 'diamond', 'parallelogram', 'cylinder', 'hexagon', 'rounded-rect'];

const Whiteboard = ({ boardId, elements, setElements, activeUsers, cursors, tool, color, bgColor, strokeWidth, user, boardTheme, fillColor, opacity, fontSize, fontFamily, showGrid }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { emit } = useSocket();

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState(null);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [inputPos, setInputPos] = useState(null);

  // Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const lastPan = useRef({ x: 0, y: 0 });

  // Undo/Redo
  const [history, setHistory] = useState([[]]);
  const [historyIdx, setHistoryIdx] = useState(0);

  // Connector arrow drawing
  const [connectingFrom, setConnectingFrom] = useState(null);

  const isDarkCanvas = boardTheme === 'black';
  const canvasBackground = boardTheme === 'black' ? '#0d0d1a' : '#ffffff';

  // ── Undo / Redo ──────────────────────────────────────────────
  const pushHistory = useCallback((newElements) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIdx + 1);
      return [...trimmed, newElements];
    });
    setHistoryIdx(prev => prev + 1);
  }, [historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const prev = history[historyIdx - 1];
    setHistoryIdx(i => i - 1);
    setElements(prev);
    emit('board-replace', { boardId, elements: prev });
  }, [history, historyIdx, setElements, emit, boardId]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const next = history[historyIdx + 1];
    setHistoryIdx(i => i + 1);
    setElements(next);
    emit('board-replace', { boardId, elements: next });
  }, [history, historyIdx, setElements, emit, boardId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if (e.key === 'Delete' && selectedElementId) {
        setElements(prev => {
          const next = prev.filter(el => el.id !== selectedElementId);
          pushHistory(next);
          emit('element-delete', { boardId, elementId: selectedElementId });
          return next;
        });
        setSelectedElementId(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo, selectedElementId, setElements, emit, boardId, pushHistory]);

  // ── Canvas redraw ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = canvasBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = isDarkCanvas ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
      ctx.lineWidth = 1;
      const gridSize = 24 * zoom;
      const offsetX = (pan.x % gridSize + gridSize) % gridSize;
      const offsetY = (pan.y % gridSize + gridSize) % gridSize;
      for (let x = offsetX; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = offsetY; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
      ctx.restore();
    }

    // Apply zoom/pan transform
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw all elements
    elements.forEach(el => drawElement(ctx, el, el.id === selectedElementId));
    if (currentElement) drawElement(ctx, currentElement, false);

    // Draw other user cursors
    Object.entries(cursors).forEach(([socketId, cur]) => {
      const otherUser = activeUsers.find(u => u.id === cur.userId);
      if (otherUser && cur.userId !== user._id) {
        const cx = (cur.x - pan.x) / zoom;
        const cy = (cur.y - pan.y) / zoom;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 12, cy + 16);
        ctx.lineTo(cx + 6, cy + 16);
        ctx.lineTo(cx, cy + 24);
        ctx.fillStyle = otherUser.color || '#6366f1';
        ctx.fill();
        ctx.closePath();
        const label = otherUser.name;
        const w = ctx.measureText(label).width + 10;
        ctx.fillStyle = otherUser.color || '#6366f1';
        ctx.beginPath();
        ctx.roundRect(cx + 13, cy + 12, w, 20, 4);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Inter';
        ctx.fillText(label, cx + 18, cy + 26);
      }
    });

    ctx.restore();
  }, [elements, currentElement, cursors, activeUsers, user._id, boardTheme, zoom, pan, selectedElementId, showGrid, canvasBackground, isDarkCanvas]);

  // Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Draw element ─────────────────────────────────────────────
  const drawElement = (ctx, el, isSelected) => {
    ctx.save();
    ctx.strokeStyle = el.color || '#000';
    ctx.lineWidth = el.strokeWidth || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 1;

    if (el.fillColor && el.fillColor !== 'transparent') {
      ctx.fillStyle = el.fillColor;
    } else {
      ctx.fillStyle = 'transparent';
    }

    if (isSelected) {
      ctx.shadowColor = '#6366f1';
      ctx.shadowBlur = 12;
    }

    switch (el.type) {
      case 'draw':
      case 'eraser': {
        ctx.beginPath();
        if (el.points?.length > 0) {
          ctx.moveTo(el.points[0].x, el.points[0].y);
          ctx.globalCompositeOperation = el.type === 'eraser' ? 'destination-out' : 'source-over';
          if (el.type === 'eraser') ctx.lineWidth = el.strokeWidth || 20;
          for (let i = 1; i < el.points.length; i++) {
            const prev = el.points[i - 1];
            const curr = el.points[i];
            const mx = (prev.x + curr.x) / 2;
            const my = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
          }
          ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
        break;
      }
      case 'rect': {
        const x = Math.min(el.x, el.x + el.width);
        const y = Math.min(el.y, el.y + el.height);
        const w = Math.abs(el.width);
        const h = Math.abs(el.height);
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
        ctx.stroke();
        if (el.text) {
          ctx.fillStyle = el.color;
          ctx.font = `${el.fontSize || 14}px ${el.fontFamily || 'Inter'}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          wrapText(ctx, el.text, x + w / 2, y + h / 2, w - 16, el.fontSize || 14);
        }
        break;
      }
      case 'rounded-rect': {
        const x = Math.min(el.x, el.x + el.width);
        const y = Math.min(el.y, el.y + el.height);
        const w = Math.abs(el.width);
        const h = Math.abs(el.height);
        const r = Math.min(14, w / 4, h / 4);
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
        ctx.stroke();
        if (el.text) {
          ctx.fillStyle = el.color;
          ctx.font = `${el.fontSize || 14}px ${el.fontFamily || 'Inter'}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          wrapText(ctx, el.text, x + w / 2, y + h / 2, w - 16, el.fontSize || 14);
        }
        break;
      }
      case 'circle': {
        const rx = Math.abs(el.width) / 2;
        const ry = Math.abs(el.height) / 2;
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
        ctx.stroke();
        if (el.text) {
          ctx.fillStyle = el.color;
          ctx.font = `${el.fontSize || 14}px ${el.fontFamily || 'Inter'}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(el.text, cx, cy);
        }
        break;
      }
      case 'diamond': {
        const x = el.x, y = el.y, w = el.width, h = el.height;
        const cx = x + w / 2, cy = y + h / 2;
        ctx.beginPath();
        ctx.moveTo(cx, y);
        ctx.lineTo(x + w, cy);
        ctx.lineTo(cx, y + h);
        ctx.lineTo(x, cy);
        ctx.closePath();
        if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
        ctx.stroke();
        if (el.text) {
          ctx.fillStyle = el.color;
          ctx.font = `${el.fontSize || 14}px ${el.fontFamily || 'Inter'}`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(el.text, cx, cy);
        }
        break;
      }
      case 'parallelogram': {
        const x = el.x, y = el.y, w = el.width, h = el.height;
        const offset = 20;
        ctx.beginPath();
        ctx.moveTo(x + offset, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w - offset, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
        ctx.stroke();
        if (el.text) {
          ctx.fillStyle = el.color;
          ctx.font = `${el.fontSize || 14}px ${el.fontFamily || 'Inter'}`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(el.text, x + w / 2, y + h / 2);
        }
        break;
      }
      case 'cylinder': {
        const x = el.x, y = el.y, w = Math.abs(el.width), h = Math.abs(el.height);
        const ry = h * 0.15;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + ry, w / 2, ry, 0, Math.PI, 0);
        ctx.lineTo(x + w, y + h - ry);
        ctx.ellipse(x + w / 2, y + h - ry, w / 2, ry, 0, 0, Math.PI);
        ctx.closePath();
        if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + ry, w / 2, ry, 0, 0, 2 * Math.PI);
        if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
        ctx.stroke();
        break;
      }
      case 'hexagon': {
        const x = el.x + el.width / 2, y = el.y + el.height / 2;
        const r = Math.min(Math.abs(el.width), Math.abs(el.height)) / 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = x + r * Math.cos(angle);
          const py = y + r * Math.sin(angle);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
        ctx.stroke();
        break;
      }
      case 'line': {
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x + el.width, el.y + el.height);
        ctx.stroke();
        break;
      }
      case 'arrow': {
        const x1 = el.x, y1 = el.y, x2 = el.x + el.width, y2 = el.y + el.height;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = 18;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = el.color;
        ctx.fill();
        break;
      }
      case 'double-arrow': {
        const x1 = el.x, y1 = el.y, x2 = el.x + el.width, y2 = el.y + el.height;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = 16;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        [{ x: x2, y: y2, a: angle }, { x: x1, y: y1, a: angle + Math.PI }].forEach(({ x, y, a }) => {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - headLen * Math.cos(a - Math.PI / 6), y - headLen * Math.sin(a - Math.PI / 6));
          ctx.lineTo(x - headLen * Math.cos(a + Math.PI / 6), y - headLen * Math.sin(a + Math.PI / 6));
          ctx.closePath(); ctx.fillStyle = el.color; ctx.fill();
        });
        break;
      }
      case 'text': {
        if (el.text) {
          ctx.font = `${el.fontSize || 18}px ${el.fontFamily || 'Inter'}`;
          ctx.fillStyle = el.color;
          ctx.textBaseline = 'top';
          ctx.fillText(el.text, el.x, el.y);
        }
        break;
      }
      default: break;
    }

    // Selection handle
    if (isSelected && el.type !== 'draw' && el.type !== 'eraser') {
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      const bx = Math.min(el.x, el.x + (el.width || 0)) - 6;
      const by = Math.min(el.y, el.y + (el.height || 0)) - 6;
      const bw = Math.abs(el.width || 0) + 12;
      const bh = Math.abs(el.height || 0) + 12;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);
    }
    ctx.restore();
  };

  function wrapText(ctx, text, cx, cy, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    const lines = [];
    for (const word of words) {
      const testLine = line + word + ' ';
      if (ctx.measureText(testLine).width > maxWidth && line !== '') {
        lines.push(line);
        line = word + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    const startY = cy - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((l, i) => ctx.fillText(l.trim(), cx, startY + i * lineHeight));
  }

  // ── Coordinate transforms ───────────────────────────────────
  const getCoordinates = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
      rawX: clientX - rect.left,
      rawY: clientY - rect.top
    };
  };

  // ── Pointer handlers ─────────────────────────────────────────
  const handlePointerDown = (e) => {
    e.preventDefault();

    // Middle mouse = pan
    if (e.button === 1 || tool === 'pan') {
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      lastPan.current = { ...pan };
      return;
    }

    // Finish text input on click away
    if (inputPos) {
      finalizeText();
      return;
    }

    const { x, y } = getCoordinates(e);

    if (tool === 'sticky') {
      const stickyEl = {
        id: uuidv4(), type: 'sticky',
        x, y, width: 200, height: 160,
        bgColor: bgColor || '#fbbf24',
        text: '', color: '#1f2937'
      };
      const next = [...elements, stickyEl];
      setElements(next);
      pushHistory(next);
      emit('sticky-add', { boardId, sticky: stickyEl });
      return;
    }

    if (tool === 'text') {
      setInputPos({ x, y });
      return;
    }

    if (tool === 'select') {
      // Hit-test elements
      const hit = [...elements].reverse().find(el => hitTest(el, x, y));
      setSelectedElementId(hit?.id || null);
      if (hit) {
        // Start drag
        const startX = x, startY = y;
        const origX = hit.x, origY = hit.y;
        const handleMove = (me) => {
          const { x: mx, y: my } = getCoordinates(me);
          const dx = mx - startX, dy = my - startY;
          setElements(prev => prev.map(el =>
            el.id === hit.id ? { ...el, x: origX + dx, y: origY + dy } : el
          ));
        };
        const handleUp = (me) => {
          const { x: mx, y: my } = getCoordinates(me);
          const dx = mx - startX, dy = my - startY;
          const moved = { ...hit, x: origX + dx, y: origY + dy };
          setElements(prev => {
            const next = prev.map(el => el.id === hit.id ? moved : el);
            pushHistory(next);
            emit('element-update', { boardId, element: moved });
            return next;
          });
          window.removeEventListener('pointermove', handleMove);
          window.removeEventListener('pointerup', handleUp);
        };
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
      }
      return;
    }

    if (tool === 'eraser') {
      setIsDrawing(true);
      setCurrentElement({
        id: uuidv4(), type: 'eraser', color: canvasBackground,
        strokeWidth: strokeWidth * 3,
        points: [{ x, y }]
      });
      return;
    }

    setIsDrawing(true);
    const newEl = {
      id: uuidv4(), type: tool,
      color, strokeWidth, fillColor: fillColor || 'transparent',
      opacity: opacity !== undefined ? opacity : 1,
      fontSize: fontSize || 14,
      fontFamily: fontFamily || 'Inter',
      points: [{ x, y }],
      x, y, width: 0, height: 0
    };
    setCurrentElement(newEl);
  };

  const handlePointerMove = (e) => {
    e.preventDefault();
    const { x, y, rawX, rawY } = getCoordinates(e);

    if (isPanning.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({ x: lastPan.current.x + dx, y: lastPan.current.y + dy });
      return;
    }

    // Throttled cursor emit
    if (Math.random() > 0.5) {
      emit('cursor-move', { boardId, cursor: { x: rawX, y: rawY, userId: user._id, timestamp: Date.now() } });
    }

    if (!isDrawing || !currentElement) return;

    if (tool === 'draw' || tool === 'eraser') {
      setCurrentElement(prev => ({ ...prev, points: [...prev.points, { x, y }] }));
    } else {
      setCurrentElement(prev => ({ ...prev, width: x - prev.x, height: y - prev.y }));
    }
  };

  const handlePointerUp = (e) => {
    isPanning.current = false;
    if (isDrawing && currentElement) {
      const next = [...elements, currentElement];
      setElements(next);
      pushHistory(next);
      emit('element-add', { boardId, element: currentElement });
    }
    setIsDrawing(false);
    setCurrentElement(null);
  };

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => {
      const next = Math.max(0.1, Math.min(5, prev * delta));
      setPan(p => ({
        x: mouseX - (mouseX - p.x) * (next / prev),
        y: mouseY - (mouseY - p.y) * (next / prev)
      }));
      return next;
    });
  };

  // Hit test
  const hitTest = (el, x, y) => {
    const pad = 8;
    if (['rect', 'rounded-rect', 'diamond', 'parallelogram', 'cylinder', 'hexagon', 'circle', 'sticky'].includes(el.type)) {
      const ex = Math.min(el.x, el.x + (el.width || 0));
      const ey = Math.min(el.y, el.y + (el.height || 0));
      const ew = Math.abs(el.width || 0);
      const eh = Math.abs(el.height || 0);
      return x >= ex - pad && x <= ex + ew + pad && y >= ey - pad && y <= ey + eh + pad;
    }
    if (el.type === 'text') {
      return x >= el.x - pad && x <= el.x + 200 && y >= el.y - 4 && y <= el.y + (el.fontSize || 18) + 4;
    }
    return false;
  };

  const finalizeText = () => {
    if (!inputPos) return;
    if (inputText.trim()) {
      const textEl = {
        id: uuidv4(), type: 'text',
        x: inputPos.x, y: inputPos.y,
        text: inputText.trim(),
        color, fontSize: fontSize || 18,
        fontFamily: fontFamily || 'Inter',
        opacity: 1
      };
      const next = [...elements, textEl];
      setElements(next);
      pushHistory(next);
      emit('element-add', { boardId, element: textEl });
    }
    setInputPos(null);
    setInputText('');
  };

  const getCursor = () => {
    if (tool === 'pan') return 'grab';
    if (tool === 'select') return 'default';
    if (tool === 'text') return 'text';
    if (tool === 'eraser') return `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><circle cx='12' cy='12' r='10' fill='white' stroke='gray' stroke-width='2'/></svg>") 12 12, crosshair`;
    return 'crosshair';
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: getCursor(), touchAction: 'none', display: 'block' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* Zoom indicator */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16,
        background: isDarkCanvas ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        backdropFilter: 'blur(8px)',
        borderRadius: 8, padding: '4px 10px',
        fontSize: 12, fontWeight: 600,
        color: isDarkCanvas ? '#fff' : '#000',
        userSelect: 'none', pointerEvents: 'none'
      }}>
        {Math.round(zoom * 100)}%
      </div>

      {/* Zoom controls */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 6, alignItems: 'center',
        background: isDarkCanvas ? 'rgba(20,20,40,0.85)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${isDarkCanvas ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        borderRadius: 10, padding: '5px 10px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        {[
          { label: '−', action: () => setZoom(z => Math.max(0.1, z - 0.15)) },
          { label: 'Fit', action: () => { setZoom(1); setPan({ x: 0, y: 0 }); } },
          { label: '+', action: () => setZoom(z => Math.min(5, z + 0.15)) },
        ].map(({ label, action }) => (
          <button key={label} onClick={action} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: isDarkCanvas ? '#e2e8f0' : '#1e293b',
            fontSize: label === 'Fit' ? 11 : 16, fontWeight: 700,
            padding: '2px 7px', borderRadius: 6,
            transition: 'background 0.15s'
          }}
            onMouseEnter={e => e.currentTarget.style.background = isDarkCanvas ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >{label}</button>
        ))}
      </div>

      {/* Text input overlay */}
      {inputPos && (
        <textarea
          autoFocus
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          rows={3}
          style={{
            position: 'absolute',
            left: (inputPos.x * zoom + pan.x),
            top: (inputPos.y * zoom + pan.y),
            background: 'transparent',
            border: '2px dashed #6366f1',
            borderRadius: 6,
            color: color,
            fontSize: `${(fontSize || 18) * zoom}px`,
            fontFamily: fontFamily || 'Inter',
            outline: 'none', padding: '4px 8px',
            minWidth: 120, resize: 'both',
            zIndex: 200
          }}
          onKeyDown={e => { if (e.key === 'Escape') { setInputPos(null); setInputText(''); } }}
          onBlur={finalizeText}
          placeholder="Type here..."
        />
      )}

      {/* Sticky notes DOM overlay */}
      {elements.filter(el => el.type === 'sticky').map(sticky => (
        <StickyNote
          key={sticky.id}
          sticky={sticky}
          elements={elements}
          setElements={setElements}
          pushHistory={pushHistory}
          emit={emit}
          boardId={boardId}
          tool={tool}
          zoom={zoom}
          pan={pan}
          isDarkCanvas={isDarkCanvas}
        />
      ))}
    </div>
  );
};

// ── Sticky Note Component ──────────────────────────────────────
const STICKY_COLORS = [
  { bg: '#fef08a', accent: '#ca8a04', text: '#1c1917' }, // yellow
  { bg: '#fca5a5', accent: '#dc2626', text: '#1c1917' }, // red
  { bg: '#86efac', accent: '#16a34a', text: '#1c1917' }, // green
  { bg: '#93c5fd', accent: '#2563eb', text: '#1c1917' }, // blue
  { bg: '#d8b4fe', accent: '#9333ea', text: '#1c1917' }, // purple
  { bg: '#fdba74', accent: '#ea580c', text: '#1c1917' }, // orange
  { bg: '#ffffff', accent: '#94a3b8', text: '#0f172a' }, // white
  { bg: '#1e293b', accent: '#475569', text: '#f1f5f9' }, // dark
];

const StickyNote = ({ sticky, elements, setElements, pushHistory, emit, boardId, tool, zoom, pan, isDarkCanvas }) => {
  const themeObj = STICKY_COLORS.find(c => c.bg === sticky.bgColor) || STICKY_COLORS[0];
  const posX = sticky.x * zoom + pan.x;
  const posY = sticky.y * zoom + pan.y;

  return (
    <div
      style={{
        position: 'absolute',
        left: posX, top: posY,
        width: (sticky.width || 200) * zoom,
        minHeight: (sticky.height || 160) * zoom,
        background: sticky.bgColor || '#fef08a',
        boxShadow: '2px 4px 18px rgba(0,0,0,0.22), 0 1px 0 rgba(0,0,0,0.08)',
        borderRadius: 2,
        borderTop: `${10 * zoom}px solid ${themeObj.accent}`,
        cursor: tool === 'select' ? 'grab' : 'default',
        userSelect: 'none',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        transform: 'rotate(-0.5deg)',
        transition: 'box-shadow 0.15s',
      }}
      onPointerDown={(e) => {
        if (tool !== 'select') return;
        e.stopPropagation();
        const startX = e.clientX - sticky.x * zoom;
        const startY = e.clientY - sticky.y * zoom;
        const handleMove = (me) => {
          const newX = (me.clientX - startX) / zoom;
          const newY = (me.clientY - startY) / zoom;
          setElements(prev => prev.map(el => el.id === sticky.id ? { ...el, x: newX, y: newY } : el));
          emit('sticky-move', { boardId, id: sticky.id, x: newX, y: newY });
        };
        const handleUp = () => {
          setElements(prev => {
            pushHistory(prev);
            return prev;
          });
          window.removeEventListener('pointermove', handleMove);
          window.removeEventListener('pointerup', handleUp);
        };
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
      }}
    >
      {/* Sticky header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${4 * zoom}px ${8 * zoom}px`,
        opacity: 0.6
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {STICKY_COLORS.slice(0, 5).map(c => (
            <div key={c.bg} onClick={() => {
              const updated = { ...sticky, bgColor: c.bg };
              setElements(prev => prev.map(el => el.id === sticky.id ? updated : el));
              emit('sticky-update', { boardId, sticky: updated });
            }} style={{
              width: 10 * zoom, height: 10 * zoom, borderRadius: '50%', background: c.bg,
              border: `1.5px solid ${c.accent}`, cursor: 'pointer'
            }} />
          ))}
        </div>
        <button onClick={() => {
          setElements(prev => {
            const next = prev.filter(e => e.id !== sticky.id);
            pushHistory(next);
            emit('sticky-delete', { boardId, id: sticky.id });
            return next;
          });
        }} style={{
          background: 'transparent', border: 'none',
          color: themeObj.text, cursor: 'pointer',
          fontSize: 14 * zoom, fontWeight: 800, lineHeight: 1, opacity: 0.5,
          padding: 0
        }}>×</button>
      </div>

      {/* Textarea */}
      <textarea
        value={sticky.text}
        onChange={(e) => {
          const updated = { ...sticky, text: e.target.value };
          setElements(prev => prev.map(el => el.id === sticky.id ? updated : el));
          emit('sticky-update', { boardId, sticky: updated });
        }}
        onPointerDown={e => e.stopPropagation()}
        style={{
          flex: 1,
          background: 'transparent', border: 'none', outline: 'none',
          resize: 'none', padding: `${4 * zoom}px ${10 * zoom}px ${10 * zoom}px`,
          fontFamily: 'Caveat, cursive, Inter', fontSize: `${16 * zoom}px`,
          color: themeObj.text, lineHeight: 1.5,
          minHeight: `${100 * zoom}px`
        }}
        placeholder="Write your idea..."
      />
    </div>
  );
};

export default Whiteboard;
