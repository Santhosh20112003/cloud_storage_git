
import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGithub } from '../context/GithubContext';
import { FaCloud, FaGithub, FaSpinner } from 'react-icons/fa';

const Callback = () => {
  const { handleCallback } = useGithub();
  const navigate = useNavigate();
  const location = useLocation();

  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    const params = new URLSearchParams(location.search);
    const code = params.get('code');

    if (code) {
      const exchangeCode = async () => {
        const success = await handleCallback(code);
        if (success) {
          navigate('/dashboard');
        } else {
          // If exchange fails, we still want to go back to dashboard 
          // where the error from context will be displayed
          navigate('/dashboard');
        }
      };
      calledRef.current = true;
      exchangeCode();
    } else {
      navigate('/dashboard');
    }
  }, [location, navigate, handleCallback]);

  return (
    <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center p-4 font-sans text-[#24292e]">
      <div className="w-full max-w-[400px] space-y-6">
        <div className="text-center space-y-4">
          <FaCloud className="text-[#0366d6] mx-auto" size={48} />
          <h1 className="text-2xl font-light tracking-tight">Connecting GitHub</h1>
        </div>

        <div className="bg-white border border-[#e1e4e8] rounded-md p-8 shadow-sm flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-[#f6f8fa] border border-[#e1e4e8] flex items-center justify-center">
              <FaGithub size={32} className="text-[#24292e]" />
            </div>
            <div className="absolute -bottom-1 -right-1">
              <FaSpinner className="animate-spin text-[#0366d6] bg-white rounded-full p-0.5" size={20} />
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm font-medium">Authenticating with GitHub...</p>
            <p className="text-xs text-[#6a737d]">This will only take a moment. We're setting up your secure storage environment.</p>
          </div>

          <div className="w-full bg-[#f6f8fa] rounded-full h-1 overflow-hidden">
            <div className="bg-[#0366d6] h-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-[#6a737d]">
            Secure connection via GitHub OAuth 2.0
          </p>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}} />
    </div>
  );
};

export default Callback;
