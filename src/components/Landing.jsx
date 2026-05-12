import React from 'react';
import { useGithub } from '../context/GithubContext';
import { 
  Loader2, Shield, Zap, Database, File, ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GithubIcon } from './Icons';
import Dashboard from './Dashboard';

const Landing = () => {
  const { login, user, error, deviceData } = useGithub();

  if (user) return <Dashboard />;

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="brand-logo-large">
          <GithubIcon size={40} className="brand-icon" />
        </div>
        
        <div className="hero-content">
          <h1>
            Scale your<br />
            <span>cloud drive.</span>
          </h1>
          <p>
            The professional storage layer for your personal and team projects, powered by GitHub.
          </p>
        </div>

        <div className="orbit-container">
          <div className="orbit-circle c1" />
          <div className="orbit-circle c2" />
          <div className="orbit-circle c3" />
          
          <div className="orbit-item i1"><File size={16} /></div>
          <div className="orbit-item i2"><Shield size={16} /></div>
          <div className="orbit-item i3"><Zap size={16} /></div>
          <div className="orbit-item i4"><Database size={16} /></div>
        </div>

        <div className="auth-footer-links">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
        </div>
      </div>

      <div className="auth-right">
        <div className="login-form">
          <h2>Sign in to GitHub Drive</h2>
          <p className="subtitle">Connect your account to access your drive.</p>

          {!deviceData ? (
            <div className="login-actions">
              <button onClick={login} className="btn-github w-full">
                <GithubIcon size={20} />
                Sign in with GitHub
              </button>
              <p className="permissions-note">
                Requires 'repo' and 'user' permissions to securely manage your storage backend.
              </p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="device-auth"
            >
              <p className="code-label">Verification Code</p>
              <div className="code-box">
                <span>{deviceData.user_code}</span>
              </div>
              <p className="instruction-text">
                Go to the link below and enter the code above to authorize your storage.
              </p>
              <a 
                href={deviceData.verification_uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-github w-full"
              >
                Authorize on GitHub
                <ExternalLink size={18} />
              </a>
              <div className="waiting-status">
                <Loader2 size={16} className="spinner" />
                Waiting for authorization...
              </div>
            </motion.div>
          )}

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}
        </div>

        <footer className="auth-footer-note">
          <span>By signing in, you agree to GitHub Drive's Privacy Policy</span>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
