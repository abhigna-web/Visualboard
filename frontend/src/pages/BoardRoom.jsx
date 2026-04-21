import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Whiteboard from '../components/Whiteboard';
import Toolbar from '../components/Toolbar';
import ExportPanel from '../components/ExportPanel';
import ChatSidebar from '../components/ChatSidebar';
import { ArrowLeft, Users, Share2, Save, Download, Loader2, MessageSquare, Sun, Moon, UserCheck } from 'lucide-react';

const BoardRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { socket, connected, emit, on, off } = useSocket();

  // Board meta
  const [board, setBoard] = useState(null);
  const [elements, setElements] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [cursors, setCursors] = useState({});
  const [messages, setMessages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [copied, setCopied] = useState(false);

  // Board & drawing options
  const [boardTheme, setBoardTheme] = useState('white');
  const [tool, setTool] = useState('draw');
  const [color, setColor] = useState('#1e293b');
  const [fillColor, setFillColor] = useState('transparent');
  const [bgColor, setBgColor] = useState('#fef08a');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [opacity, setOpacity] = useState(1);
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [showGrid, setShowGrid] = useState(true);

  // Undo/redo from whiteboard
  const whiteboardRef = useRef(null);

  // Sync drawing color with board theme
  useEffect(() => {
    setColor(boardTheme === 'black' ? '#ffffff' : '#1e293b');
  }, [boardTheme]);

  // Keyboard shortcut: tool switcher
  useEffect(() => {
    const keyMap = { v: 'select', h: 'pan', p: 'draw', e: 'eraser', r: 'rect', o: 'circle', d: 'diamond', a: 'arrow', l: 'line', t: 'text', s: 'sticky' };
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const mapped = keyMap[e.key.toLowerCase()];
      if (mapped) setTool(mapped);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Fetch board
  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const { data } = await api.get(`/boards/${id}`);
        setBoard(data);
      } catch {
        alert('Board not found or access denied');
        navigate('/');
      }
    };
    fetchBoard();
  }, [id, navigate]);

  // Socket setup
  useEffect(() => {
    if (!socket || !connected || !board) return;

    emit('join-board', { boardId: id, user: { id: user._id, name: user.name, color: user.color } });

    const handleBoardState = ({ elements, users, messages, theme }) => {
      if (theme) setBoardTheme(theme);
      if (elements.length === 0 && board.elements?.length > 0) {
        setElements(board.elements);
        board.elements.forEach(el => emit('element-add', { boardId: id, element: el }));
      } else {
        setElements(elements);
      }
      setActiveUsers(users);
      if (messages) setMessages(messages);
    };
    const handleMessageReceived = (msg) => setMessages(prev => [...prev, msg]);
    const handleMessageReacted = ({ messageId, reactions }) =>
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
    const handleBoardThemeUpdated = (t) => setBoardTheme(t);
    const handleUserJoined = ({ users }) => setActiveUsers(users);
    const handleUserLeft = ({ users }) => setActiveUsers(users);
    const handleElementAdded = (el) => setElements(prev => [...prev, el]);
    const handleElementUpdated = (el) => setElements(prev => prev.map(e => e.id === el.id ? el : e));
    const handleElementDeleted = (elId) => setElements(prev => prev.filter(e => e.id !== elId));
    const handleBoardCleared = () => setElements([]);
    const handleBoardReplaced = ({ elements }) => setElements(elements);
    const handleStickyAdded = (el) => setElements(prev => [...prev, el]);
    const handleStickyMoved = ({ id, x, y }) => setElements(prev => prev.map(e => e.id === id ? { ...e, x, y } : e));
    const handleStickyUpdated = (el) => setElements(prev => prev.map(e => e.id === el.id ? el : e));
    const handleStickyDeleted = (id) => setElements(prev => prev.filter(e => e.id !== id));
    const handleCursorMoved = ({ socketId, cursor }) => setCursors(prev => ({ ...prev, [socketId]: cursor }));

    on('board-state', handleBoardState);
    on('message-received', handleMessageReceived);
    on('message-reacted', handleMessageReacted);
    on('board-theme-updated', handleBoardThemeUpdated);
    on('user-joined', handleUserJoined);
    on('user-left', handleUserLeft);
    on('element-added', handleElementAdded);
    on('element-updated', handleElementUpdated);
    on('element-deleted', handleElementDeleted);
    on('board-cleared', handleBoardCleared);
    on('board-replaced', handleBoardReplaced);
    on('sticky-added', handleStickyAdded);
    on('sticky-moved', handleStickyMoved);
    on('sticky-updated', handleStickyUpdated);
    on('sticky-deleted', handleStickyDeleted);
    on('cursor-moved', handleCursorMoved);

    return () => {
      off('board-state', handleBoardState);
      off('message-received', handleMessageReceived);
      off('message-reacted', handleMessageReacted);
      off('board-theme-updated', handleBoardThemeUpdated);
      off('user-joined', handleUserJoined);
      off('user-left', handleUserLeft);
      off('element-added', handleElementAdded);
      off('element-updated', handleElementUpdated);
      off('element-deleted', handleElementDeleted);
      off('board-cleared', handleBoardCleared);
      off('board-replaced', handleBoardReplaced);
      off('sticky-added', handleStickyAdded);
      off('sticky-moved', handleStickyMoved);
      off('sticky-updated', handleStickyUpdated);
      off('sticky-deleted', handleStickyDeleted);
      off('cursor-moved', handleCursorMoved);
    };
  }, [socket, connected, board, id, emit, on, off, user]);

  // Clean stale cursors
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(socketId => {
          if (now - next[socketId].timestamp > 5000) { delete next[socketId]; changed = true; }
        });
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post(`/boards/${id}/save-elements`, { elements });
    } catch { alert('Failed to save board'); }
    finally { setSaving(false); }
  };

  const updateBoardTheme = (newTheme) => {
    setBoardTheme(newTheme);
    emit('board-theme-update', { boardId: id, theme: newTheme });
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${board.inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!board) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <Loader2 className="animate-spin" size={32} color="#6366f1" />
      <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading board...</div>
    </div>
  );

  const isDarkCanvas = boardTheme === 'black';
  const canvasBackground = isDarkCanvas ? '#0d0d1a' : '#ffffff';
  const headerBg = isDarkCanvas ? 'rgba(13,13,26,0.85)' : 'rgba(255,255,255,0.85)';
  const headerText = isDarkCanvas ? '#f1f5f9' : '#0f172a';
  const headerBorder = isDarkCanvas ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const btnMuted = isDarkCanvas ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const TOOL_LABEL_MAP = {
    select: '↖ Select', pan: '✋ Pan', draw: '✏️ Draw', eraser: '⌫ Erase',
    rect: '▭ Rect', 'rounded-rect': '▢ Rounded', circle: '○ Ellipse', diamond: '◇ Diamond',
    hexagon: '⬡ Hex', parallelogram: '▱ I/O', cylinder: '⊏ DB', line: '— Line',
    arrow: '→ Arrow', 'double-arrow': '↔ D-Arrow', text: 'T Text', sticky: '📝 Note'
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: canvasBackground, color: headerText,
      overflow: 'hidden', position: 'relative',
      transition: 'background 0.4s ease'
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', zIndex: 50,
        background: headerBg, backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${headerBorder}`,
        color: headerText, flexShrink: 0
      }}>
        {/* Left: nav + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate('/')} title="Dashboard"
            style={{ background: btnMuted, border: 'none', cursor: 'pointer', color: headerText, borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, transition: 'all 0.15s' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <div style={{ borderLeft: `1px solid ${headerBorder}`, height: 28, margin: '0 0.25rem' }} />
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {board.title}
              {!connected && <span style={{ fontSize: '0.6rem', background: '#ef4444', color: '#fff', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>Offline</span>}
            </h2>
            <div style={{ fontSize: '0.7rem', opacity: 0.55, letterSpacing: '0.04em' }}>
              Code: <strong>{board.inviteCode}</strong>
            </div>
          </div>

          {/* Current tool badge */}
          <div style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
            background: 'rgba(99,102,241,0.12)', color: '#6366f1',
            border: '1px solid rgba(99,102,241,0.2)', letterSpacing: '0.02em'
          }}>
            {TOOL_LABEL_MAP[tool] || tool}
          </div>
        </div>

        {/* Right: controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Active user avatars */}
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            {activeUsers.slice(0, 5).map((u, i) => (
              <div key={u.id} title={u.name} style={{
                width: 30, height: 30, borderRadius: '50%', background: u.color || '#6366f1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: '0.75rem',
                marginLeft: i > 0 ? -10 : 0, border: `2px solid ${canvasBackground}`,
                zIndex: 10 - i, position: 'relative', cursor: 'default', transition: 'transform 0.15s'
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2) translateY(-2px)'; e.currentTarget.style.zIndex = 20; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = 10 - i; }}
              >
                {u.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {activeUsers.length > 0 && (
              <div style={{
                fontSize: 10, fontWeight: 700, color: '#10b981',
                marginLeft: 10, padding: '2px 6px', borderRadius: 6,
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)'
              }}>
                {activeUsers.length} live
              </div>
            )}
          </div>

          <div style={{ width: 1, background: headerBorder, height: 24 }} />

          <button onClick={toggleTheme} title="App theme" style={headerBtn(btnMuted, headerText)}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button onClick={() => setShowChat(s => !s)} style={{
            ...headerBtn(showChat ? 'rgba(99,102,241,0.15)' : btnMuted, showChat ? '#6366f1' : headerText),
            gap: 5, paddingRight: 10
          }}>
            <MessageSquare size={15} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Chat</span>
            {messages.length > 0 && (
              <span style={{ background: '#6366f1', color: '#fff', borderRadius: 8, fontSize: 9, fontWeight: 800, padding: '1px 5px', marginLeft: 2 }}>
                {messages.length}
              </span>
            )}
          </button>

          <button onClick={copyInvite} style={{ ...headerBtn(btnMuted, headerText), gap: 5, paddingRight: 10 }}>
            <Share2 size={15} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>{copied ? '✓ Copied!' : 'Invite'}</span>
          </button>

          <button onClick={() => setShowExport(s => !s)} style={{ ...headerBtn(btnMuted, headerText), gap: 5, paddingRight: 10 }}>
            <Download size={15} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Export</span>
          </button>

          <div style={{ width: 1, background: headerBorder, height: 24 }} />

          <button onClick={handleSave} disabled={saving} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            transition: 'opacity 0.15s', boxShadow: '0 2px 12px rgba(99,102,241,0.35)'
          }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: connected ? '#10b981' : '#ef4444',
              boxShadow: connected ? '0 0 6px #10b981' : '0 0 6px #ef4444'
            }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: connected ? '#10b981' : '#ef4444' }}>
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Board area ── */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        <Toolbar
          tool={tool} setTool={setTool}
          color={color} setColor={setColor}
          fillColor={fillColor} setFillColor={setFillColor}
          bgColor={bgColor} setBgColor={setBgColor}
          strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
          opacity={opacity} setOpacity={setOpacity}
          fontSize={fontSize} setFontSize={setFontSize}
          fontFamily={fontFamily} setFontFamily={setFontFamily}
          showGrid={showGrid} setShowGrid={setShowGrid}
          boardTheme={boardTheme} onThemeChange={updateBoardTheme}
          onClear={() => {
            if (window.confirm('Clear the entire board? This cannot be undone.')) {
              emit('board-clear', { boardId: id });
              setElements([]);
            }
          }}
          onUndo={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))}
          onRedo={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }))}
        />

        {showExport && <ExportPanel elements={elements} onClose={() => setShowExport(false)} />}

        <div style={{ flex: 1, position: 'relative' }}>
          <Whiteboard
            boardId={id}
            elements={elements}
            setElements={setElements}
            activeUsers={activeUsers}
            cursors={cursors}
            tool={tool}
            color={color}
            fillColor={fillColor}
            bgColor={bgColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
            fontSize={fontSize}
            fontFamily={fontFamily}
            showGrid={showGrid}
            user={user}
            boardTheme={boardTheme}
          />
        </div>

        {showChat && (
          <ChatSidebar
            boardId={id}
            messages={messages}
            setMessages={setMessages}
            onClose={() => setShowChat(false)}
          />
        )}
      </div>
    </div>
  );
};

const headerBtn = (bg, color) => ({
  background: bg, border: 'none', cursor: 'pointer', color,
  borderRadius: 8, padding: '6px 8px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s', fontSize: 13, fontWeight: 600
});

export default BoardRoom;
