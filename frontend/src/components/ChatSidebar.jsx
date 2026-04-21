import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, SmilePlus, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const REACTIONS = ['👍', '❤️', '🔥', '🎉', '😮', '😂', '👏', '💡', '✅', '💯'];
const EMOJI_QUICK = ['😀','😎','🤔','👋','✨','🚀','💪','🙏','😅','🤯','💡','🔥','❤️','🎯','✅'];

const ChatSidebar = ({ boardId, messages, setMessages, onClose }) => {
  const { user } = useAuth();
  const { emit, on, off } = useSocket();
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typingUsers]);

  useEffect(() => {
    const handleTyping = (u) => {
      setTypingUsers(prev => prev.find(e => e.id === u.id) ? prev : [...prev, u]);
    };
    const handleStopTyping = (userId) => {
      setTypingUsers(prev => prev.filter(u => u.id !== userId));
    };
    on('user-typing', handleTyping);
    on('user-stop-typing', handleStopTyping);
    return () => { off('user-typing', handleTyping); off('user-stop-typing', handleStopTyping); };
  }, [on, off]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    emit('message-send', { boardId, message: { text: inputText, senderId: user._id, senderName: user.name, senderColor: user.color } });
    emit('chat-stop-typing', { boardId, userId: user._id });
    setInputText('');
    setShowEmojiPicker(false);
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    emit('chat-typing', { boardId, user: { id: user._id, name: user.name } });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emit('chat-stop-typing', { boardId, userId: user._id });
    }, 2500);
  };

  const handleReact = (messageId, emoji) => {
    emit('message-react', { boardId, messageId, emoji, userId: user._id });
  };

  const insertEmoji = (emoji) => {
    setInputText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div style={{
      width: 340, height: '100%', display: 'flex', flexDirection: 'column',
      borderLeft: '1px solid var(--border-color)',
      background: 'var(--bg-card)',
      backdropFilter: 'blur(16px)',
      position: 'relative', zIndex: 100,
      animation: 'slideInRight 0.25s cubic-bezier(0.4,0,0.2,1)',
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1rem 0.75rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-card)',
        flexShrink: 0
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
          <MessageSquare size={18} color="#6366f1" /> Chat Room
        </h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: 8, padding: 4 }}>
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '0.75rem',
        display: 'flex', flexDirection: 'column', gap: '0.5rem'
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: '2rem' }}>
            No messages yet.<br />Start the conversation! 💬
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === user._id;
          const totalReactions = Object.values(msg.reactions || {}).flat().length;

          return (
            <div key={msg.id}
              onMouseEnter={() => setHoveredMsg(msg.id)}
              onMouseLeave={() => setHoveredMsg(null)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', position: 'relative', marginBottom: totalReactions > 0 ? 20 : 0 }}
            >
              {!isMe && (
                <div style={{ fontSize: 11, fontWeight: 700, color: msg.senderColor || 'var(--accent-primary)', marginBottom: 3, marginLeft: 4 }}>
                  {msg.senderName}
                </div>
              )}

              <div style={{ position: 'relative', maxWidth: '82%' }}>
                <div style={{
                  background: isMe ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--bg-secondary)',
                  color: isMe ? '#fff' : 'var(--text-primary)',
                  padding: '0.6rem 0.9rem',
                  borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  fontSize: '0.88rem', wordBreak: 'break-word',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  border: isMe ? 'none' : '1px solid var(--border-color)',
                  lineHeight: 1.45, transition: 'all 0.15s'
                }}>
                  {msg.text}
                </div>

                {/* Hover reaction picker */}
                {hoveredMsg === msg.id && (
                  <div style={{
                    position: 'absolute', [isMe ? 'right' : 'left']: 0,
                    bottom: -34, zIndex: 30,
                    background: 'var(--bg-card)', borderRadius: 20,
                    border: '1px solid var(--border-color)',
                    padding: '4px 8px', display: 'flex', gap: 2,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                    whiteSpace: 'nowrap', animation: 'fadeIn 0.15s ease'
                  }}>
                    {REACTIONS.map(emoji => (
                      <button key={emoji} onClick={() => handleReact(msg.id, emoji)}
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          fontSize: 16, padding: '1px 2px', borderRadius: 6,
                          transition: 'transform 0.1s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.4)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >{emoji}</button>
                    ))}
                  </div>
                )}

                {/* Active reactions */}
                {Object.entries(msg.reactions || {}).filter(([, users]) => users.length > 0).length > 0 && (
                  <div style={{
                    display: 'flex', gap: 4, flexWrap: 'wrap',
                    position: 'absolute', bottom: -20, [isMe ? 'right' : 'left']: 0, zIndex: 5
                  }}>
                    {Object.entries(msg.reactions || {}).map(([emoji, users]) => users.length > 0 && (
                      <button key={emoji} onClick={() => handleReact(msg.id, emoji)}
                        style={{
                          background: users.includes(user._id) ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)',
                          border: users.includes(user._id) ? '1px solid #6366f1' : '1px solid var(--border-color)',
                          borderRadius: 10, padding: '1px 7px', cursor: 'pointer',
                          fontSize: 12, display: 'flex', alignItems: 'center', gap: 3,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.15)', color: 'var(--text-primary)'
                        }}>
                        <span>{emoji}</span>
                        <span style={{ fontWeight: 800, fontSize: 10 }}>{users.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, [isMe ? 'marginRight' : 'marginLeft']: 4 }}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        })}

        {/* Typing dots */}
        {typingUsers.filter(u => u.id !== user._id).map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              background: 'var(--bg-secondary)', borderRadius: '18px 18px 18px 4px',
              padding: '8px 14px', border: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{u.name}</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {[0, 0.2, 0.4].map((delay, i) => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: '50%', background: '#6366f1',
                    animation: `bounce 1s ${delay}s infinite`
                  }} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Emoji Quick Pick */}
      {showEmojiPicker && (
        <div style={{
          padding: '8px 10px', borderTop: '1px solid var(--border-color)',
          display: 'flex', flexWrap: 'wrap', gap: 4, background: 'var(--bg-secondary)'
        }}>
          {EMOJI_QUICK.map(e => (
            <button key={e} onClick={() => insertEmoji(e)}
              style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', borderRadius: 6, padding: '2px 3px', transition: 'transform 0.1s' }}
              onMouseEnter={ex => ex.currentTarget.style.transform = 'scale(1.3)'}
              onMouseLeave={ex => ex.currentTarget.style.transform = 'scale(1)'}
            >{e}</button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div style={{
        padding: '0.75rem', borderTop: '1px solid var(--border-color)',
        display: 'flex', gap: 6, alignItems: 'flex-end',
        background: 'var(--bg-card)', flexShrink: 0
      }}>
        <button onClick={() => setShowEmojiPicker(s => !s)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: showEmojiPicker ? '#6366f1' : 'var(--text-muted)', padding: 4, borderRadius: 8, transition: 'color 0.15s' }}>
          <SmilePlus size={20} />
        </button>
        <textarea
          ref={inputRef}
          rows={1}
          placeholder="Message teammates..."
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          style={{
            flex: 1, borderRadius: 12, padding: '8px 12px', resize: 'none',
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            color: 'var(--text-primary)', fontSize: 14, outline: 'none',
            fontFamily: 'inherit', maxHeight: 100, overflow: 'auto',
            transition: 'border-color 0.15s',
            lineHeight: 1.5
          }}
          onFocus={e => e.target.style.borderColor = '#6366f1'}
          onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
        />
        <button onClick={handleSend}
          style={{
            width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'opacity 0.15s',
            opacity: inputText.trim() ? 1 : 0.5
          }}>
          <Send size={18} />
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ChatSidebar;
