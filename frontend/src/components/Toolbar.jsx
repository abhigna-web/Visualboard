import { useState } from 'react';
import {
  MousePointer2, Pencil, Square, Circle, Type,
  StickyNote, Eraser, Trash2, Diamond, ArrowUpRight,
  Minus, Move, Hand, Grid, Undo2, Redo2,
  Triangle, Hexagon, AlignLeft, Columns, ChevronDown, ChevronUp,
  ArrowLeftRight, Cylinder
} from 'lucide-react';

const TOOL_GROUPS = [
  {
    label: 'Select & Pan',
    tools: [
      { id: 'select', icon: MousePointer2, label: 'Select (V)' },
      { id: 'pan', icon: Hand, label: 'Pan (H)' },
    ]
  },
  {
    label: 'Draw',
    tools: [
      { id: 'draw', icon: Pencil, label: 'Freehand (P)' },
      { id: 'eraser', icon: Eraser, label: 'Eraser (E)' },
    ]
  },
  {
    label: 'Shapes',
    tools: [
      { id: 'rect', icon: Square, label: 'Rectangle (R)' },
      { id: 'rounded-rect', icon: Square, label: 'Rounded Rect', iconStyle: { borderRadius: 4 } },
      { id: 'circle', icon: Circle, label: 'Ellipse (O)' },
      { id: 'diamond', icon: Diamond, label: 'Diamond (D)' },
      { id: 'hexagon', icon: Hexagon, label: 'Hexagon' },
      { id: 'parallelogram', icon: AlignLeft, label: 'Parallelogram (I/O)' },
      { id: 'cylinder', icon: Columns, label: 'Cylinder (DB)' },
    ]
  },
  {
    label: 'Connectors',
    tools: [
      { id: 'line', icon: Minus, label: 'Line (L)' },
      { id: 'arrow', icon: ArrowUpRight, label: 'Arrow (A)' },
      { id: 'double-arrow', icon: ArrowLeftRight, label: 'Double Arrow' },
    ]
  },
  {
    label: 'Annotate',
    tools: [
      { id: 'text', icon: Type, label: 'Text (T)' },
      { id: 'sticky', icon: StickyNote, label: 'Sticky Note (S)' },
    ]
  },
];

const STROKE_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
];

const FILL_COLORS = [
  'transparent', '#fef9c3', '#fee2e2', '#dcfce7', '#dbeafe',
  '#ede9fe', '#ffedd5', '#e0f2fe', '#f1f5f9', '#000000',
];

const STICKY_BG_COLORS = [
  '#fef08a', '#fca5a5', '#86efac', '#93c5fd', '#d8b4fe', '#fdba74', '#ffffff', '#1e293b'
];

const BRUSH_SIZES = [2, 4, 8, 14, 22];
const FONT_FAMILIES = ['Inter', 'Caveat', 'Georgia', 'Courier New', 'Arial'];
const FONT_SIZES = [12, 16, 20, 28, 40];

const Toolbar = ({
  tool, setTool,
  color, setColor,
  fillColor, setFillColor,
  bgColor, setBgColor,
  strokeWidth, setStrokeWidth,
  opacity, setOpacity,
  fontSize, setFontSize,
  fontFamily, setFontFamily,
  showGrid, setShowGrid,
  boardTheme, onThemeChange,
  onClear, onUndo, onRedo,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState('Shapes');

  const isDark = boardTheme === 'black';
  const panelBg = isDark ? 'rgba(15,15,30,0.92)' : 'rgba(255,255,255,0.95)';
  const borderCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textCol = isDark ? '#e2e8f0' : '#1e293b';
  const mutedCol = isDark ? '#94a3b8' : '#64748b';
  const hoverBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const activeBg = 'linear-gradient(135deg,#6366f1,#8b5cf6)';

  const isStickyTool = tool === 'sticky';
  const isTextTool = tool === 'text';

  return (
    <div style={{
      position: 'absolute', left: '1rem', top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 100, display: 'flex', flexDirection: 'column',
      background: panelBg,
      backdropFilter: 'blur(20px)',
      border: `1px solid ${borderCol}`,
      borderRadius: 16, boxShadow: '0 8px 48px rgba(0,0,0,0.3)',
      width: collapsed ? 56 : 220,
      transition: 'width 0.25s ease',
      overflow: 'hidden',
      maxHeight: 'calc(100vh - 120px)',
      overflowY: 'auto',
    }}>

      {/* Top bar: collapse + theme + undo/redo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 8px', borderBottom: `1px solid ${borderCol}`, flexShrink: 0 }}>
        <button onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}
          style={iconBtnStyle(false, hoverBg, textCol)}>
          {collapsed ? '›' : '‹'}
        </button>
        {!collapsed && <>
          <button onClick={() => onThemeChange(boardTheme === 'white' ? 'black' : 'white')}
            title="Toggle board theme"
            style={{
              ...iconBtnStyle(false, hoverBg, textCol),
              background: boardTheme === 'white' ? '#0d0d1a' : '#ffffff',
              color: boardTheme === 'white' ? '#fff' : '#000',
              fontSize: 10, fontWeight: 800
            }}>
            {boardTheme === 'white' ? '●' : '○'}
          </button>
          <button onClick={onUndo} title="Undo (Ctrl+Z)" style={iconBtnStyle(false, hoverBg, mutedCol)}>
            <Undo2 size={15} />
          </button>
          <button onClick={onRedo} title="Redo (Ctrl+Y)" style={iconBtnStyle(false, hoverBg, mutedCol)}>
            <Redo2 size={15} />
          </button>
          <button onClick={() => setShowGrid(g => !g)} title="Toggle Grid"
            style={iconBtnStyle(showGrid, hoverBg, showGrid ? '#6366f1' : mutedCol)}>
            <Grid size={15} />
          </button>
        </>}
      </div>

      {/* Tool Groups */}
      <div style={{ padding: '6px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {TOOL_GROUPS.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <button onClick={() => setExpandedGroup(expandedGroup === group.label ? null : group.label)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: mutedCol, fontSize: 10, fontWeight: 700, padding: '5px 6px',
                  textTransform: 'uppercase', letterSpacing: '0.07em', borderRadius: 6
                }}>
                {group.label}
                {expandedGroup === group.label ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            )}

            {(collapsed || expandedGroup === group.label || ['Select & Pan', 'Draw', 'Annotate'].includes(group.label)) && (
              <div style={{ display: 'flex', flexDirection: collapsed ? 'column' : 'row', flexWrap: 'wrap', gap: 2 }}>
                {group.tools.map(t => {
                  const Icon = t.icon;
                  const isActive = tool === t.id;
                  return (
                    <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
                      style={{
                        width: collapsed ? 40 : 36, height: 36,
                        borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isActive ? activeBg : 'transparent',
                        color: isActive ? '#fff' : mutedCol,
                        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = textCol; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = mutedCol; } }}
                    >
                      <Icon size={17} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {!collapsed && (
        <>
          <div style={{ height: 1, background: borderCol, margin: '4px 0' }} />

          {/* Stroke Color */}
          <Section label="Stroke Color" dark={isDark} borderCol={borderCol} textCol={textCol}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {STROKE_COLORS.map(c => (
                <ColorDot key={c} c={c} active={color === c} onClick={() => setColor(c)} outline={c === '#ffffff'} />
              ))}
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                style={{ width: 22, height: 22, padding: 0, border: '2px solid rgba(99,102,241,0.4)', borderRadius: '50%', cursor: 'pointer', overflow: 'hidden', background: 'none' }}
                title="Custom color" />
            </div>
          </Section>

          {/* Fill Color */}
          {!isStickyTool && !isTextTool && (
            <Section label="Fill Color" dark={isDark} borderCol={borderCol} textCol={textCol}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {FILL_COLORS.map(c => (
                  <div key={c} onClick={() => setFillColor(c)}
                    style={{
                      width: 22, height: 22, borderRadius: '50%', cursor: 'pointer',
                      background: c === 'transparent' ? 'transparent' : c,
                      border: fillColor === c ? '2.5px solid #6366f1' : `1.5px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                      backgroundImage: c === 'transparent' ? `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22'><line x1='0' y1='22' x2='22' y2='0' stroke='%23ef4444' stroke-width='1.5'/></svg>")` : 'none',
                      transition: 'transform 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Sticky bg color */}
          {isStickyTool && (
            <Section label="Sticky Color" dark={isDark} borderCol={borderCol} textCol={textCol}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {STICKY_BG_COLORS.map(c => (
                  <ColorDot key={c} c={c} active={bgColor === c} onClick={() => setBgColor(c)} outline={c === '#ffffff'} />
                ))}
              </div>
            </Section>
          )}

          {/* Brush Size */}
          {!isStickyTool && (
            <Section label={`Size: ${strokeWidth}px`} dark={isDark} borderCol={borderCol} textCol={textCol}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {BRUSH_SIZES.map(s => (
                  <button key={s} onClick={() => setStrokeWidth(s)}
                    style={{
                      width: Math.min(28, 10 + s * 0.8), height: Math.min(28, 10 + s * 0.8),
                      borderRadius: '50%',
                      background: strokeWidth === s ? '#6366f1' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
                      border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                      flexShrink: 0
                    }}
                  />
                ))}
                <input type="range" min={1} max={50} value={strokeWidth} onChange={e => setStrokeWidth(+e.target.value)}
                  style={{ flex: 1, accentColor: '#6366f1', cursor: 'pointer' }} />
              </div>
            </Section>
          )}

          {/* Opacity */}
          <Section label={`Opacity: ${Math.round(opacity * 100)}%`} dark={isDark} borderCol={borderCol} textCol={textCol}>
            <input type="range" min={0.1} max={1} step={0.05} value={opacity}
              onChange={e => setOpacity(+e.target.value)}
              style={{ width: '100%', accentColor: '#6366f1', cursor: 'pointer' }} />
          </Section>

          {/* Font (text tool) */}
          {isTextTool && (
            <>
              <Section label="Font Family" dark={isDark} borderCol={borderCol} textCol={textCol}>
                <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}
                  style={{
                    width: '100%', borderRadius: 7, padding: '4px 6px', fontSize: 12,
                    background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                    color: textCol, border: `1px solid ${borderCol}`, cursor: 'pointer', outline: 'none'
                  }}>
                  {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Section>
              <Section label="Font Size" dark={isDark} borderCol={borderCol} textCol={textCol}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {FONT_SIZES.map(s => (
                    <button key={s} onClick={() => setFontSize(s)}
                      style={{
                        padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: fontSize === s ? '#6366f1' : (isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'),
                        color: fontSize === s ? '#fff' : textCol,
                        border: 'none', cursor: 'pointer'
                      }}>{s}</button>
                  ))}
                </div>
              </Section>
            </>
          )}

          <div style={{ height: 1, background: borderCol, margin: '4px 0' }} />

          {/* Clear board */}
          <div style={{ padding: '6px 8px' }}>
            <button onClick={onClear} style={{
              width: '100%', padding: '8px 0', borderRadius: 10, fontWeight: 600, fontSize: 13,
              background: 'rgba(239,68,68,0.1)', color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
            >
              <Trash2 size={14} /> Clear Board
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────
const Section = ({ label, children, dark, borderCol, textCol }) => (
  <div style={{ padding: '6px 10px 8px' }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#64748b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
      {label}
    </div>
    {children}
  </div>
);

const ColorDot = ({ c, active, onClick, outline }) => (
  <div onClick={onClick} style={{
    width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer',
    border: active ? '2.5px solid #6366f1' : (outline ? '1.5px solid rgba(0,0,0,0.25)' : '1.5px solid transparent'),
    transition: 'transform 0.15s', boxShadow: c === '#000000' ? '0 0 0 1px rgba(255,255,255,0.2)' : 'none'
  }}
    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
  />
);

const iconBtnStyle = (active, hoverBg, color) => ({
  width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
  background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
  color: active ? '#6366f1' : color,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 16, fontWeight: 800, transition: 'all 0.15s', flexShrink: 0
});

export default Toolbar;
