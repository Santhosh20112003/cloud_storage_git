import React, { useState } from 'react';
import { useGithub } from '../context/GithubContext';
import { FaGoogle, FaShieldAlt, FaBolt, FaDatabase, FaFile, FaGithub } from 'react-icons/fa';

const Landing = () => {
  const {
    registerWithEmail,
    signInWithEmail,
    signInWithGoogle,
    user,
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
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden font-sans text-slate-900">
      {/* Auth Left */}
      <div className="hidden md:flex md:w-1/2 bg-blue-600 p-12 flex-col justify-between text-white relative overflow-hidden">
        <div className="z-10">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
            <FaGithub size={28} className="text-white" />
          </div>
        </div>
        
        <div className="z-10 max-w-lg">
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Scale your<br />
            <span className="text-blue-200">cloud drive.</span>
          </h1>
          <p className="text-xl text-blue-100/90 leading-relaxed font-light">
            Sign in with your Firebase account or Google to keep your profile secure and connected.
          </p>
        </div>

        {/* Orbit Decoration - Tailwind version */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 border border-white rounded-full animate-[spin_20s_linear_infinite]" />
          <div className="absolute inset-12 border border-white/60 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
          <div className="absolute inset-24 border border-white/30 rounded-full animate-[spin_10s_linear_infinite]" />
          
          <div className="absolute top-0 left-1/2 -ml-3 bg-white text-blue-600 p-2 rounded-lg shadow-xl"><FaFile size={16} /></div>
          <div className="absolute bottom-1/4 right-0 bg-white text-blue-600 p-2 rounded-lg shadow-xl"><FaShieldAlt size={16} /></div>
        </div>

        <div className="z-10 flex gap-6 text-sm text-blue-200 font-medium">
          <span className="cursor-pointer hover:text-white transition-colors">Privacy Policy</span>
          <span className="cursor-pointer hover:text-white transition-colors">Terms of Service</span>
        </div>
      </div>

      {/* Auth Right */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-24 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {isRegister ? 'Create your account' : 'Sign in to GitHub Drive'}
            </h2>
            <p className="text-slate-500">
              {isRegister
                ? 'Register with email and password, then link your GitHub repository in the dashboard.'
                : 'Login with email/password or Google to continue.'}
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${!isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setIsRegister(false)}
            >
              Login
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setIsRegister(true)}
            >
              Register
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegister && (
              <div className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700 ml-1">Username</span>
                <input
                  type="text"
                  placeholder="Choose a username"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700 ml-1">Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700 ml-1">Password</span>
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-3 px-4 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none" 
              disabled={loadingAuth}
            >
              {isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">or</span>
            </div>
          </div>

          <button
            type="button"
            className="w-full py-3 px-4 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            onClick={signInWithGoogle}
            disabled={loadingAuth}
          >
            <FaGoogle size={18} className="text-red-500" />
            Continue with Google
          </button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          <footer className="pt-8 text-center text-xs text-slate-400">
            By signing in, you agree to GitHub Drive's <span className="underline cursor-pointer decoration-slate-300 hover:text-slate-600">Privacy Policy</span>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Landing;
