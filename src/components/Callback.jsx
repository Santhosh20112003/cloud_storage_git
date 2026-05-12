import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGithub } from '../context/GithubContext';
import { FaSpinner, FaBolt, FaCheckCircle } from 'react-icons/fa';
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[48px] p-12 text-center relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
        
        <div className="mb-10 relative">
          <div className="w-24 h-24 bg-blue-600 rounded-[32px] mx-auto flex items-center justify-center text-white shadow-2xl shadow-blue-600/40 relative z-10">
            <FaBolt size={40} className="animate-pulse" />
          </div>
          <div className="absolute inset-0 bg-blue-600/20 blur-[60px] rounded-full scale-150"></div>
        </div>
        
        <div className="space-y-4 mb-12">
          <h2 className="text-3xl font-black text-white tracking-tight">Authenticating</h2>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Secure GitHub Handshake in Progress</p>
        </div>

        <div className="space-y-4 text-left">
          {[
            { label: 'Cloud Handshake', status: 'done', icon: <FaCheckCircle /> },
            { label: 'Token Exchange', status: 'loading', icon: <FaSpinner className="animate-spin" /> },
            { label: 'Finalizing Environment', status: 'waiting', icon: <div className="w-2 h-2 rounded-full bg-slate-700" /> }
          ].map((item, i) => (
            <div key={i} className={`flex items-center justify-between p-4 rounded-3xl border transition-all ${item.status === 'done' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : item.status === 'loading' ? 'bg-white/5 border-white/10 text-white' : 'bg-transparent border-transparent text-slate-600'}`}>
              <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
              <div className="text-sm">{item.icon}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
          <div className="flex items-center justify-center gap-3 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>
            Encrypting Session
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Callback;
