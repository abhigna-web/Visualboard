import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Monitor, ArrowRight, Shield, BookOpen, GraduationCap } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[Register] Submitting form...', { name, email, role });
    try {
      setError('');
      setLoading(true);
      await register(name, email, password, role);
      console.log('[Register] Success! Navigating to dashboard.');
      navigate('/');
    } catch (err) {
      console.error('[Register] Caught error:', err);
      setError(err.response?.data?.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Monitor size={24} color="white" />
          </div>
        </div>
        <h1 className="auth-title">Create an Account</h1>
        <p className="auth-subtitle">Join CollabBoard to start collaborating</p>

        {error && <div className="form-error" style={{ marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="form-group">
            <label className="form-label">I am a</label>
            <div className="role-select-grid">
              <div className={`role-card ${role === 'admin' ? 'selected' : ''}`} onClick={() => setRole('admin')}>
                <Shield size={24} color={role === 'admin' ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                <span>Admin</span>
              </div>
              <div className={`role-card ${role === 'teacher' ? 'selected' : ''}`} onClick={() => setRole('teacher')}>
                <BookOpen size={24} color={role === 'teacher' ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                <span>Teacher</span>
              </div>
              <div className={`role-card ${role === 'student' ? 'selected' : ''}`} onClick={() => setRole('student')}>
                <GraduationCap size={24} color={role === 'student' ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                <span>Student</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              placeholder="John Doe" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              required 
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              type="email" 
              placeholder="you@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              placeholder="Min. 6 characters" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required 
              minLength={6}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'} <ArrowRight size={18} />
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
