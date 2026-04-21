import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Loader2 } from 'lucide-react';

const JoinHandler = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const joinBoard = async () => {
      try {
        // Automatically attempt to join the board via the invite code in the URL
        const { data } = await api.post(`/boards/join/${code}`);
        // redirect to the board on success
        navigate(`/board/${data.boardId}`);
      } catch (err) {
        console.error('Join failed:', err);
        // On failure, show message and return to dashboard
        const message = err.response?.data?.message || 'Failed to join board. The link may be invalid or expired.';
        alert(message);
        navigate('/');
      }
    };

    if (code) {
      joinBoard();
    }
  }, [code, navigate]);

  return (
    <div style={{ 
      height: '60vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      gap: '1.5rem',
      textAlign: 'center' 
    }}>
      <div className="auth-logo-icon animate-glow" style={{ width: 64, height: 64 }}>
        <Loader2 className="animate-spin" size={32} color="white" />
      </div>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Joining Collaboration...</h2>
        <p style={{ color: 'var(--text-secondary)' }}>We're adding you to the board. Hang tight!</p>
      </div>
    </div>
  );
};

export default JoinHandler;
