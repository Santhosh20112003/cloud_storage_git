import React, { useState } from 'react';
import { useGithub } from '../context/GithubContext';
import { FaGoogle, FaCloud, FaShieldAlt } from 'react-icons/fa';

const Landing = () => {
  const {
    registerWithEmail,
    signInWithEmail,
    signInWithGoogle,
    error,
    loadingAuth,
  } = useGithub();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isRegister) {
      await registerWithEmail(username.trim(), email.trim(), password);
    } else {
      await signInWithEmail(email.trim(), password);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center p-4 font-sans text-[#24292e]">
      <div className="w-full max-w-[400px] space-y-6">
        <div className="text-center space-y-4">
          <FaCloud className="text-[#0366d6] mx-auto" size={48} />
          <h1 className="text-2xl font-light tracking-tight">
            {isRegister ? 'Join CloudStorage' : 'Sign in to CloudStorage'}
          </h1>
        </div>

        <div className="bg-white border border-[#e1e4e8] rounded-md p-6 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegister && (
              <div className="space-y-1">
                <label className="text-sm font-semibold block ml-0.5">Username</label>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 bg-white border border-[#e1e4e8] rounded-md focus:border-[#0366d6] focus:ring-1 focus:ring-[#0366d6] outline-none text-sm transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-semibold block ml-0.5">Email address</label>
              <input
                type="email"
                className="w-full px-3 py-1.5 bg-white border border-[#e1e4e8] rounded-md focus:border-[#0366d6] focus:ring-1 focus:ring-[#0366d6] outline-none text-sm transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold block ml-0.5">Password</label>
                {!isRegister && <span className="text-xs text-[#0366d6] hover:underline cursor-pointer">Forgot password?</span>}
              </div>
              <input
                type="password"
                className="w-full px-3 py-1.5 bg-white border border-[#e1e4e8] rounded-md focus:border-[#0366d6] focus:ring-1 focus:ring-[#0366d6] outline-none text-sm transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-2 px-4 bg-[#2ea44f] text-white font-semibold rounded-md hover:bg-[#2c974b] transition-all disabled:opacity-50 text-sm shadow-sm border border-[rgba(27,31,35,0.15)]"
              disabled={loadingAuth}
            >
              {isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#e1e4e8]"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-[#6a737d]">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            className="w-full py-2 px-4 bg-white border border-[#e1e4e8] text-[#24292e] font-semibold rounded-md hover:bg-[#f6f8fa] transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
            onClick={signInWithGoogle}
            disabled={loadingAuth}
          >
            <FaGoogle className="text-[#db4437]" size={14} />
            Google
          </button>
        </div>

        {error && (
          <div className="p-3 bg-[#ffeef0] border border-[#fdb8c0] text-[#d73a49] rounded-md text-xs font-medium text-center">
            {error}
          </div>
        )}

        <div className="bg-white border border-[#e1e4e8] rounded-md p-4 text-center">
          <p className="text-sm">
            {isRegister ? 'Already have an account?' : 'New to CloudStorage?'}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="ml-2 text-[#0366d6] hover:underline font-medium"
            >
              {isRegister ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
