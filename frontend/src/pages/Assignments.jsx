import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, Calendar, CheckCircle, AlertCircle, Clock, Plus, X, User as UserIcon, Layout } from 'lucide-react';
import { format } from 'date-fns';

const Assignments = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [students, setStudents] = useState([]);
  const [boards, setBoards] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: [],
    boardId: '',
    dueDate: '',
    priority: 'medium',
    maxScore: 100
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAssignments();
    if (user.role !== 'student') {
      fetchStudents();
      fetchBoards();
    }
  }, [user.role]);

  const fetchAssignments = async () => {
    try {
      const { data } = await api.get('/assignments');
      setAssignments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data } = await api.get('/users/students');
      setStudents(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBoards = async () => {
    try {
      const { data } = await api.get('/boards');
      setBoards(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        board: formData.boardId // Server expects 'board' as ID
      };
      await api.post('/assignments', payload);
      setShowModal(false);
      setFormData({ title: '', description: '', assignedTo: [], boardId: '', dueDate: '', priority: 'medium', maxScore: 100 });
      fetchAssignments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStudent = (id) => {
    setFormData(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(id) 
        ? prev.assignedTo.filter(sId => sId !== id)
        : [...prev.assignedTo, id]
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'badge-blue';
      case 'in-progress': return 'badge-orange';
      case 'completed': return 'badge-green';
      default: return 'badge-primary';
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Assignments</h1>
          <p className="page-subtitle">Track and manage your tasks and submissions.</p>
        </div>
        {(user.role === 'admin' || user.role === 'teacher') && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Create Assignment
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid-2">
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 160 }}></div>)}
        </div>
      ) : assignments.length === 0 ? (
        <div className="empty-state glass-card">
          <ClipboardList size={48} />
          <h3>No assignments found</h3>
          <p>You're all caught up! No active assignments right now.</p>
        </div>
      ) : (
        <div className="grid-2">
          {assignments.map(a => (
            <div key={a._id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{a.title}</h3>
                  {a.board && <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginTop: '0.2rem' }}>Board: {a.board.title}</div>}
                </div>
                <span className={`badge ${getStatusColor(a.status)}`}>{a.status}</span>
              </div>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1 }}>
                {a.description}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={14} /> Due: {a.dueDate ? format(new Date(a.dueDate), 'MMM dd, yyyy') : 'No Date'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={14} /> Score: {a.maxScore}
                  </span>
                </div>
                
                {user.role === 'student' && a.status === 'open' && (
                  <button className="btn btn-primary btn-sm">Submit Work</button>
                )}
                {user.role !== 'student' && (
                  <button className="btn btn-secondary btn-sm" title={`${a.submissions?.length || 0} Submissions`}>
                    Review Submissions
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Assignment Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">New Assignment</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input 
                    type="text" required placeholder="e.g., Weekly UI Exercise"
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea 
                    required placeholder="What should students do?"
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                    style={{ minHeight: 100 }}
                  />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input 
                      type="date" required
                      value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Score</label>
                    <input 
                      type="number" required
                      value={formData.maxScore} onChange={e => setFormData({...formData, maxScore: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Link to Board</label>
                  <select 
                    value={formData.boardId} onChange={e => setFormData({...formData, boardId: e.target.value})}
                    style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', color: 'white', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}
                  >
                    <option value="">Select a board (optional)</option>
                    {boards.map(b => <option key={b._id} value={b._id}>{b.title}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assign to Students</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', padding: '0.5rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                    {students.map(s => (
                      <div 
                        key={s._id} 
                        onClick={() => toggleStudent(s._id)}
                        style={{
                          padding: '0.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                          background: formData.assignedTo.includes(s._id) ? 'var(--accent-primary)' : 'var(--bg-glass)',
                          color: formData.assignedTo.includes(s._id) ? 'white' : 'var(--text-secondary)',
                          fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                      >
                        <UserIcon size={14} /> {s.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Assignments;
