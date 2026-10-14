import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGithub } from '../context/GithubContext';
import { FaGoogle, FaSpinner, FaEye, FaEyeSlash } from 'react-icons/fa';
import { GoogleDriveLogo } from './Icons';

const Landing = () => {
  const {
    user,
    registerWithEmail,
    signInWithEmail,
    signInWithGoogle,
    error,
    loadingAuth,
  } = useGithub();

  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loadingAuth) {
      navigate('/dashboard');
    }
  }, [user, loadingAuth, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (isRegister) {
        await registerWithEmail(username.trim(), email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'var(--surface-variant)', color: 'var(--on-surface)' }}
    >
      <div
        className="w-full max-w-[440px] bg-white rounded-3xl p-8 sm:p-10 elevation-dialog"
        style={{
          border: '1px solid var(--outline-variant)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
        }}
      >
        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 flex items-center justify-center mb-3">
            <GoogleDriveLogo size={48} />
          </div>
          <h1 className="text-2xl font-medium tracking-tight" style={{ color: 'var(--on-surface)' }}>
            {isRegister ? 'Create your account' : 'Sign in to Drive'}
          </h1>
          <p className="text-xs mt-1.5" style={{ color: 'var(--on-surface-variant)' }}>
            to continue to Unified Cloud Storage
          </p>
        </div>

        {/* Google One-Tap Primary Auth */}
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loadingAuth || submitting}
          className="w-full h-11 px-4 rounded-full flex items-center justify-center gap-3 text-xs font-medium transition-all cursor-pointer hover:bg-[#F8F9FA] active:bg-[#F1F3F4] disabled:opacity-50"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--outline)',
            color: 'var(--on-surface)'
          }}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="w-full border-t" style={{ borderColor: 'var(--outline-variant)' }} />
          <span className="absolute bg-white px-3 text-[11px] font-mono" style={{ color: 'var(--on-surface-variant)' }}>
            or with email
          </span>
        </div>

        {/* Form Inputs */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {isRegister && (
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--on-surface)' }}>
                Your Name
              </label>
              <input
                type="text"
                className="w-full h-11 px-3.5 rounded-xl text-xs outline-none transition-all placeholder:text-[#5F6368]"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--outline)',
                  color: 'var(--on-surface)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--outline)'}
                placeholder="Enter full name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--on-surface)' }}>
              Email address
            </label>
            <input
              type="email"
              className="w-full h-11 px-3.5 rounded-xl text-xs outline-none transition-all placeholder:text-[#5F6368]"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--outline)',
                color: 'var(--on-surface)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--outline)'}
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--on-surface)' }}>
                Password
              </label>
              {!isRegister && (
                <span className="text-[11px] hover:underline cursor-pointer" style={{ color: 'var(--primary)' }}>
                  Forgot password?
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full h-11 px-3.5 pr-10 rounded-xl text-xs outline-none transition-all placeholder:text-[#5F6368]"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--outline)',
                  color: 'var(--on-surface)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--outline)'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-xs transition-colors"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                {showPassword ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="p-3 rounded-xl text-xs text-center"
              style={{ backgroundColor: '#FCE8E6', border: '1px solid #FAD2CF', color: 'var(--error)' }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loadingAuth || submitting}
            className="w-full h-11 rounded-full font-medium text-xs text-white transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {submitting ? (
              <FaSpinner className="animate-spin" size={14} />
            ) : (
              <span>{isRegister ? 'Create Drive Account' : 'Sign in'}</span>
            )}
          </button>
        </form>

        {/* Toggle between Login and Register */}
        <div className="mt-6 pt-5 text-center text-xs" style={{ borderTop: '1px solid var(--outline-variant)' }}>
          <span style={{ color: 'var(--on-surface-variant)' }}>
            {isRegister ? 'Already have an account?' : 'New to Drive?'}
          </span>
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="ml-1.5 font-medium hover:underline cursor-pointer"
            style={{ color: 'var(--primary)' }}
          >
            {isRegister ? 'Sign in' : 'Create an account'}
          </button>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-8 flex items-center justify-center gap-6 text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>
        <span>English (United States)</span>
        <a href="#" className="hover:underline">Help</a>
        <a href="#" className="hover:underline">Privacy</a>
        <a href="#" className="hover:underline">Terms</a>
      </div>
    </div>
  );
};

export default Landing;
