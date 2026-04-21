import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Target, Award, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const Progress = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const endpoint = user.role === 'student' ? '/users/me/progress' : '/users/progress';
        const res = await api.get(endpoint);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, [user.role]);

  if (loading) return <div className="page-wrapper" style={{ padding: '2rem' }}>Loading...</div>;

  const renderStudentView = () => {
    const { progress } = data;
    const completed = progress?.completedAssignments || 0;
    const total = progress?.totalAssignments || 0;
    const pending = total - completed;
    
    const chartData = [
      { name: 'Completed', value: completed },
      { name: 'Pending', value: pending > 0 ? pending : 0 }
    ];
    const COLORS = ['#10b981', '#3b82f6'];

    return (
      <div className="grid-2">
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ marginBottom: '2rem' }}>Assignment Completion</h3>
          <div style={{ height: 200, width: '100%' }}>
            {total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  No assignments yet.
                </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{completed}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Completed</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>{total}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total</div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={20} className="gradient-text" style={{ background: 'var(--grad-orange)', WebkitBackgroundClip: 'text', color: 'transparent' }} />
            Achievements
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <Target size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>First Steps</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Joined a collaborative board</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Active Learner</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Completed {completed} assignments</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTeacherView = () => {
    return (
      <div className="glass-card" style={{ padding: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Student Progress Overview</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem 0' }}>Student Name</th>
                <th style={{ padding: '1rem 0' }}>Email</th>
                <th style={{ padding: '1rem 0' }}>Completed / Total</th>
                <th style={{ padding: '1rem 0' }}>Progress Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.map(student => {
                const completed = student.progress?.completedAssignments || 0;
                const total = student.progress?.totalAssignments || 0;
                const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
                
                return (
                  <tr key={student._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: student.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      {student.name}
                    </td>
                    <td style={{ padding: '1rem 0', color: 'var(--text-secondary)' }}>{student.email}</td>
                    <td style={{ padding: '1rem 0' }}>{completed} / {total}</td>
                    <td style={{ padding: '1rem 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="progress-bar" style={{ width: '100px' }}>
                          <div className="progress-fill" style={{ width: `${rate}%` }}></div>
                        </div>
                        <span style={{ fontSize: '0.85rem' }}>{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data.length === 0 && <p style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No students found.</p>}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Progress & Analytics</h1>
          <p className="page-subtitle">Visual insights into your learning and collaboration.</p>
        </div>
      </div>
      {user.role === 'student' ? renderStudentView() : renderTeacherView()}
    </>
  );
};

export default Progress;
