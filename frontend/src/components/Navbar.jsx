import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, LayoutDashboard, ClipboardList, TrendingUp, Monitor, Sun, Moon } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="glass" style={{
      padding: '1rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '1px solid var(--border-color)',
      borderLeft: 'none',
      borderRight: 'none',
      borderTop: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
          <div className="auth-logo-icon" style={{ width: 32, height: 32 }}>
            <Monitor size={18} color="white" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px' }}>CollabBoard</span>
        </Link>
        
        <div style={{ display: 'flex', gap: '1rem', marginLeft: '1rem' }}>
          <Link to="/" className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem' }}>
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          <Link to="/assignments" className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem' }}>
            <ClipboardList size={18} /> Assignments
          </Link>
          <Link to="/progress" className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem' }}>
            <TrendingUp size={18} /> Progress
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={toggleTheme} 
          className="btn btn-secondary btn-sm" 
          style={{ width: 40, height: 40, padding: 0, justifyContent: 'center', borderRadius: '50%' }}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div style={{ position: 'relative' }}>
        <button 
          onClick={() => setShowDropdown(!showDropdown)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'transparent' }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{user.role}</div>
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: user.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold'
          }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
        </button>

        {showDropdown && (
          <div className="glass-card" style={{
            position: 'absolute', top: '120%', right: 0, minWidth: 200,
            padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem',
            animation: 'slideUp 0.2s ease'
          }}>
            <button onClick={handleLogout} className="btn btn-ghost" style={{ justifyContent: 'flex-start', color: 'var(--accent-red)' }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </div>
    </div>
  </nav>
  );
};

export default Navbar;
