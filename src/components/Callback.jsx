import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGithub } from '../context/GithubContext';
import { Loader2, Zap, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Callback = () => {
  const { handleCallback } = useGithub();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');

    if (code) {
      const exchangeCode = async () => {
        const success = await handleCallback(code);
        // Add a small delay for the 'Connecting' animation to be seen
        setTimeout(() => {
          if (success) {
            navigate('/');
          } else {
            navigate('/'); // Go back to signin if failed
          }
        }, 2000);
      };
      exchangeCode();
    } else {
        navigate('/');
    }
  }, [location, navigate, handleCallback]);

  return (
    <div className="callback-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="callback-card"
      >
        <div className="callback-visual">
          <div className="callback-pulse-box">
            <div className="pulse-ring r1" />
            <div className="pulse-ring r2" />
            <div className="pulse-ring r3" />
            <div className="callback-icon-inner">
              <Zap size={32} fill="currentColor" />
            </div>
          </div>
        </div>
        
        <div className="callback-content">
          <h2 className="text-2xl font-bold mb-2">Connecting to GitHub</h2>
          <p className="text-muted mb-8">Please wait while we establish a secure connection to your storage backend.</p>
          
          <div className="callback-status-list">
            <div className="status-item done">
              <CheckCircle2 size={18} className="status-icon" />
              <span>Authentication requested</span>
            </div>
            <div className="status-item processing">
              <Loader2 size={18} className="spinner status-icon" />
              <span>Exchanging secure tokens</span>
            </div>
            <div className="status-item waiting">
              <div className="status-dot" />
              <span>Preparing drive environment</span>
            </div>
          </div>
        </div>

        <div className="callback-footer">
          <p>Encrypting session data...</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Callback;
