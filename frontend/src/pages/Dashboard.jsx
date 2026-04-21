import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  Plus, Users, LayoutDashboard, Clock, Play,
  Trash2, Activity, Globe, Share2, X, Copy, Check,
  Link2, Hash, Sun, Moon
} from 'lucide-react';

const ShareModal = ({ board, onClose }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  if (!board) return null;
  const shareLink = `${window.location.origin}/join/${board.inviteCode}`;
  const copy = async (text, setter) => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const el = document.createElement('textarea');
      el.value = text; document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
    }
    setter(true); setTimeout(() => setter(false), 2000);
  };
  return (
    <div onClick={onClose} style={{
      position:'fixed',inset:0,zIndex:2000,background:'rgba(0,0,0,0.6)',
      backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',
      padding:'1rem',animation:'fadeIn 0.18s ease',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'var(--bg-card)',border:'1px solid var(--border-color)',
        borderRadius:20,padding:'2rem',width:'100%',maxWidth:460,
        boxShadow:'var(--shadow-lg)',animation:'slideUp 0.22s ease',position:'relative',
      }}>
        <button onClick={onClose} style={{
          position:'absolute',top:'1rem',right:'1rem',width:32,height:32,
          borderRadius:'50%',background:'var(--bg-secondary)',border:'1px solid var(--border-color)',
          display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',
          color:'var(--text-secondary)',
        }}><X size={15}/></button>

        <div style={{textAlign:'center',marginBottom:'1.75rem'}}>
          <div style={{
            width:48,height:48,borderRadius:'50%',
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display:'flex',alignItems:'center',justifyContent:'center',
            margin:'0 auto 1rem',boxShadow:'0 6px 20px rgba(99,102,241,0.4)',
          }}><Users size={22} color="#fff"/></div>
          <h2 style={{fontSize:'1.2rem',fontWeight:700,marginBottom:'0.35rem'}}>Invite People</h2>
          <p style={{fontSize:'0.875rem',color:'var(--text-secondary)',lineHeight:1.5}}>
            Share to let others join <strong>"{board.title}"</strong>
          </p>
        </div>

        <div style={{marginBottom:'1.25rem'}}>
          <div style={{fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',
            color:'var(--text-muted)',display:'flex',alignItems:'center',gap:5,marginBottom:'0.5rem'}}>
            <Link2 size={11}/> Invite Link
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'0.6rem',
            background:'var(--bg-secondary)',border:'1px solid var(--border-color)',
            borderRadius:12,padding:'0.5rem 0.5rem 0.5rem 1rem'}}>
            <span style={{flex:1,fontSize:'0.78rem',color:'var(--text-secondary)',fontFamily:'monospace',
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{shareLink}</span>
            <button onClick={()=>copy(shareLink,setCopiedLink)} style={{
              display:'flex',alignItems:'center',gap:5,padding:'0.5rem 1rem',borderRadius:9,
              fontSize:'0.82rem',fontWeight:700,cursor:'pointer',border:'none',whiteSpace:'nowrap',
              background:copiedLink?'#22c55e':'var(--accent-primary)',color:'#fff',transition:'background 0.2s',
            }}>{copiedLink?<><Check size={13}/>Copied!</>:<><Copy size={13}/>Copy link</>}</button>
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:'0.75rem',margin:'1rem 0'}}>
          <div style={{flex:1,height:1,background:'var(--border-color)'}}/> 
          <span style={{fontSize:'0.7rem',color:'var(--text-muted)',fontWeight:700}}>OR</span>
          <div style={{flex:1,height:1,background:'var(--border-color)'}}/>
        </div>

        <div>
          <div style={{fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',
            color:'var(--text-muted)',display:'flex',alignItems:'center',gap:5,marginBottom:'0.5rem'}}>
            <Hash size={11}/> Board Code
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'0.6rem',
            background:'var(--bg-secondary)',border:'1px solid var(--border-color)',
            borderRadius:12,padding:'0.5rem 0.5rem 0.5rem 1rem'}}>
            <span style={{flex:1,fontFamily:'monospace',fontWeight:800,fontSize:'1.4rem',
              letterSpacing:'0.22em',color:'var(--text-primary)'}}>{board.inviteCode}</span>
            <button onClick={()=>copy(board.inviteCode,setCopiedCode)} style={{
              display:'flex',alignItems:'center',gap:5,padding:'0.5rem 1rem',borderRadius:9,
              fontSize:'0.82rem',fontWeight:700,cursor:'pointer',border:'none',whiteSpace:'nowrap',
              background:copiedCode?'#22c55e':'var(--accent-primary)',color:'#fff',transition:'background 0.2s',
            }}>{copiedCode?<><Check size={13}/>Copied!</>:<><Copy size={13}/>Copy</>}</button>
          </div>
          <p style={{fontSize:'0.73rem',color:'var(--text-muted)',marginTop:'0.5rem',lineHeight:1.4}}>
            Anyone with this code or link can join the board.
          </p>
        </div>
      </div>
    </div>
  );
};

const DeleteModal = ({ board, onConfirm, onClose }) => (
  <div onClick={onClose} style={{
    position:'fixed',inset:0,zIndex:2000,background:'rgba(0,0,0,0.6)',
    backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',
    padding:'1rem',animation:'fadeIn 0.18s ease',
  }}>
    <div onClick={e=>e.stopPropagation()} style={{
      background:'var(--bg-card)',border:'1px solid var(--border-color)',
      borderRadius:20,padding:'2rem',width:'100%',maxWidth:400,
      boxShadow:'var(--shadow-lg)',animation:'slideUp 0.22s ease',textAlign:'center',
    }}>
      <div style={{
        width:52,height:52,borderRadius:'50%',background:'rgba(239,68,68,0.12)',
        border:'1px solid rgba(239,68,68,0.25)',display:'flex',alignItems:'center',
        justifyContent:'center',margin:'0 auto 1.25rem',
      }}><Trash2 size={22} color="#ef4444"/></div>
      <h3 style={{fontSize:'1.1rem',fontWeight:700,marginBottom:'0.5rem'}}>Delete Board?</h3>
      <p style={{fontSize:'0.875rem',color:'var(--text-secondary)',marginBottom:'1.75rem',lineHeight:1.5}}>
        <strong>"{board.title}"</strong> will be permanently deleted.
      </p>
      <div style={{display:'flex',gap:'0.75rem',justifyContent:'center'}}>
        <button onClick={onClose} className="btn btn-secondary" style={{minWidth:100}}>Cancel</button>
        <button onClick={onConfirm} className="btn btn-danger" style={{minWidth:100}}>Delete</button>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const { globalPresence, on, off, emit } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [shareBoard, setShareBoard] = useState(null);
  const [deleteBoard, setDeleteBoard] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoards();
    emit('app-location-update', { location: 'dashboard' });
  }, []);

  useEffect(() => {
    const handleRemoteCreate = (board) => {
      const isMember = board.members?.some(m => m.user === user._id || m.user?._id === user._id);
      if (board.owner._id === user._id || isMember) setBoards(prev => [board, ...prev]);
    };
    const handleRemoteDelete = (boardId) => setBoards(prev => prev.filter(b => b._id !== boardId));
    on('notif-board-created', handleRemoteCreate);
    on('notif-board-deleted', handleRemoteDelete);
    return () => {
      off('notif-board-created', handleRemoteCreate);
      off('notif-board-deleted', handleRemoteDelete);
    };
  }, [on, off, user._id]);

  const fetchBoards = async () => {
    try { const { data } = await api.get('/boards'); setBoards(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;
    try {
      const { data } = await api.post('/boards', { title: newBoardTitle.trim() });
      emit('workspace-board-created', data);
      setShowNewBoardModal(false); setNewBoardTitle('');
      navigate(`/board/${data._id}`);
    } catch (err) { console.error(err); }
  };

  const handleJoinBoard = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    let code = joinCode.trim();
    if (code.includes('/join/')) code = code.split('/join/').pop().split('?')[0];
    try {
      const { data } = await api.post(`/boards/join/${code}`);
      navigate(`/board/${data.boardId}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join board. Check the code or link.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteBoard) return;
    try {
      await api.delete(`/boards/${deleteBoard._id}`);
      emit('workspace-board-deleted', deleteBoard._id);
      setBoards(prev => prev.filter(b => b._id !== deleteBoard._id));
    } catch (err) { alert(err.response?.data?.message || 'Failed to delete board'); }
    finally { setDeleteBoard(null); }
  };

  const activeBoardIds = globalPresence
    .filter(p => p.location?.startsWith('board:'))
    .map(p => p.location.split(':')[1]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Welcome back, {user.name}!</h1>
            <p className="page-subtitle">Your workspaces and active boards.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={toggleTheme} className="btn btn-secondary btn-sm"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{ width: 38, height: 38, padding: 0, justifyContent: 'center', borderRadius: '50%' }}>
              {theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}
            </button>
            <form onSubmit={handleJoinBoard} style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" placeholder="Invite code or link" value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                style={{ width: 200, padding: '0.45rem 0.9rem', fontSize: '0.875rem' }}/>
              <button type="submit" className="btn btn-secondary btn-sm">Join</button>
            </form>
            {(user.role === 'admin' || user.role === 'teacher') && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowNewBoardModal(true)}>
                <Plus size={16}/> New Board
              </button>
            )}
          </div>
        </div>

        <h2 style={{ fontSize: '1.15rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LayoutDashboard size={20} className="gradient-text"/> Your Boards
        </h2>

        {loading ? (
          <div className="grid-2">
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 190 }}/>)}
          </div>
        ) : boards.length === 0 ? (
          <div className="empty-state glass-card">
            <LayoutDashboard size={48}/>
            <h3>No boards yet</h3>
            <p>Create a board or join one using an invite code.</p>
          </div>
        ) : (
          <div className="grid-2">
            {boards.map(board => {
              const isLive = activeBoardIds.includes(board._id);
              const isOwner = board.owner._id === user._id;
              return (
                <div key={board._id} className="glass-card"
                  style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                  {isLive && (
                    <div style={{ position:'absolute',top:12,right:12,display:'flex',alignItems:'center',gap:'0.35rem',
                      background:'rgba(239,68,68,0.1)',padding:'0.2rem 0.55rem',borderRadius:99,
                      border:'1px solid rgba(239,68,68,0.22)' }}>
                      <span className="animate-pulse" style={{ width:7,height:7,borderRadius:'50%',background:'#ef4444' }}/>
                      <span style={{ fontSize:'0.62rem',fontWeight:800,color:'#ef4444',textTransform:'uppercase',letterSpacing:'0.06em' }}>Live</span>
                    </div>
                  )}
                  <h3 style={{ fontSize:'1.05rem',fontWeight:700,marginBottom:'0.75rem',paddingRight:isLive?52:0,wordBreak:'break-word' }}>
                    {board.title}
                  </h3>
                  <div style={{ flex:1,display:'flex',flexDirection:'column',gap:'0.45rem' }}>
                    <span className={`badge ${isOwner?'badge-primary':'badge-blue'}`} style={{ alignSelf:'flex-start' }}>
                      {isOwner ? 'Owner' : 'Member'}
                    </span>
                    <p style={{ fontSize:'0.82rem',color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:'0.4rem' }}>
                      <Users size={13}/> {board.members.length + 1} participant(s)
                    </p>
                    <p style={{ fontSize:'0.82rem',color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:'0.4rem' }}>
                      <Clock size={13}/> {new Date(board.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ marginTop:'1.25rem',paddingTop:'1rem',borderTop:'1px solid var(--border-color)',
                    display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                    <span style={{ fontSize:'0.72rem',color:'var(--text-muted)',fontFamily:'monospace' }}>
                      {board.inviteCode}
                    </span>
                    <div style={{ display:'flex',gap:'0.4rem',alignItems:'center' }}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>setShareBoard(board)}
                        title="Share / Invite" style={{ color:'var(--accent-primary)',padding:'0.4rem' }}>
                        <Share2 size={15}/>
                      </button>
                      {isOwner && (
                        <button className="btn btn-ghost btn-sm" onClick={()=>setDeleteBoard(board)}
                          title="Delete Board" style={{ color:'var(--accent-red)',padding:'0.4rem' }}>
                          <Trash2 size={15}/>
                        </button>
                      )}
                      <button className="btn btn-primary btn-sm" onClick={()=>navigate(`/board/${board._id}`)}>
                        Open <Play size={13} fill="currentColor"/>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity sidebar */}
      <div className="glass-card" style={{ padding:'1.5rem',height:'fit-content',position:'sticky',top:'2rem' }}>
        <h3 style={{ fontSize:'1rem',fontWeight:700,marginBottom:'1.25rem',display:'flex',alignItems:'center',gap:'0.6rem' }}>
          <Activity size={17} className="gradient-text"/> Global Activity
        </h3>
        <div style={{ display:'flex',flexDirection:'column',gap:'1rem' }}>
          <div style={{ fontSize:'0.78rem',color:'var(--text-muted)',display:'flex',alignItems:'center',gap:'0.5rem' }}>
            <Globe size={13}/> {globalPresence.length} users online
          </div>
          {globalPresence.map((p, i) => (
            <div key={i} style={{ display:'flex',alignItems:'center',gap:'0.75rem' }}>
              <div style={{ position:'relative' }}>
                <div style={{ width:32,height:32,borderRadius:'50%',background:p.color||'var(--accent-primary)',
                  display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:'0.75rem' }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ position:'absolute',bottom:-2,right:-2,width:10,height:10,borderRadius:'50%',
                  background:'var(--accent-green)',border:'2px solid var(--bg-card)' }}/>
              </div>
              <div>
                <div style={{ fontSize:'0.83rem',fontWeight:600 }}>{p.id === user._id ? 'You' : p.name}</div>
                <div style={{ fontSize:'0.7rem',color:'var(--text-secondary)' }}>
                  {p.location === 'dashboard' ? 'Dashboard' : 'In Board'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showNewBoardModal && (
        <div className="modal-overlay" onClick={()=>setShowNewBoardModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Board</h3>
              <button onClick={()=>setShowNewBoardModal(false)} className="btn btn-ghost" style={{ padding:'0.25rem' }}>
                <X size={18}/>
              </button>
            </div>
            <form onSubmit={handleCreateBoard}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Board Title</label>
                  <input type="text" placeholder="e.g. Q3 Planning" value={newBoardTitle}
                    onChange={e=>setNewBoardTitle(e.target.value)} autoFocus required/>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setShowNewBoardModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Board</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {shareBoard && <ShareModal board={shareBoard} onClose={()=>setShareBoard(null)}/>}
      {deleteBoard && <DeleteModal board={deleteBoard} onConfirm={handleDeleteConfirm} onClose={()=>setDeleteBoard(null)}/>}
    </div>
  );
};

export default Dashboard;
