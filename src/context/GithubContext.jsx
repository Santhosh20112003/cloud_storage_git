import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const GithubContext = createContext();

export const useGithub = () => useContext(GithubContext);

export const GithubProvider = ({ children }) => {
  const [token, setToken] = useState(sessionStorage.getItem('gh_token') || null);
  const [user, setUser] = useState(null);
  const [repoStatus, setRepoStatus] = useState('idle'); // idle, checking, creating, ready, error
  const [error, setError] = useState(null);
  const [deviceData, setDeviceData] = useState(null); // { user_code, device_code, verification_uri, interval }

  const login = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_REDIRECT_URI;
    const scope = 'repo,user';
    
    if (!clientId) {
      setError('GitHub Client ID is missing in .env');
      return;
    }

    // Redirect to GitHub for Web Flow
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
  };

  const startPolling = (deviceCode, initialInterval) => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    let currentInterval = (initialInterval || 5) * 1000;
    let timeoutId;
    let active = true;

    const poll = async () => {
      if (!active) return;
      try {
        const response = await axios.post('/github-login/login/oauth/access_token', {
          client_id: clientId,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        }, {
          headers: { Accept: 'application/json' }
        });

        if (response.data.access_token) {
          setToken(response.data.access_token);
          sessionStorage.setItem('gh_token', response.data.access_token);
          setDeviceData(null);
          active = false;
        } else if (response.data.error === 'authorization_pending') {
          // Keep polling
          timeoutId = setTimeout(poll, currentInterval);
        } else if (response.data.error === 'slow_down') {
          // Update interval as requested by GitHub
          currentInterval = (response.data.interval || (currentInterval / 1000) + 5) * 1000;
          timeoutId = setTimeout(poll, currentInterval);
        } else {
          setError(response.data.error_description || 'Authentication failed');
          setDeviceData(null);
          active = false;
        }
      } catch (err) {
        console.error('Polling failed', err);
        setDeviceData(null);
        active = false;
      }
    };

    timeoutId = setTimeout(poll, currentInterval);

    // Cleanup on unmount or retry
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  };

  const handleCallback = async (code) => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GITHUB_CLIENT_SECRET;
    
    try {
      const response = await axios.post('/github-login/login/oauth/access_token', {
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: import.meta.env.VITE_REDIRECT_URI
      }, {
        headers: { Accept: 'application/json' }
      });

      if (response.data.access_token) {
        const newToken = response.data.access_token;
        setToken(newToken);
        sessionStorage.setItem('gh_token', newToken);
        return true;
      } else if (response.data.error) {
        setError(response.data.error_description || response.data.error);
      }
    } catch (err) {
      console.error('Callback exchange failed', err);
      setError('Failed to exchange authorization code.');
    }
    return false;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('gh_token');
  };

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `token ${token}` },
      });
      setUser(response.data);
      checkOrCreateRepo(token, response.data.login);
    } catch (err) {
      console.error('Failed to fetch user', err);
      logout();
    }
  };

  const checkOrCreateRepo = async (authToken, username) => {
    setRepoStatus('checking');
    try {
      // Check if github-drive exists
      try {
        await axios.get('https://api.github.com/repos/' + username + '/github-drive', {
          headers: { Authorization: `token ${authToken}` },
        });
        setRepoStatus('ready');
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // Repo not found, create it
          setRepoStatus('creating');
          await axios.post('https://api.github.com/user/repos', {
            name: 'github-drive',
            description: 'Cloud storage backend for Github Drive app',
            private: true,
            auto_init: true,
          }, {
            headers: { Authorization: `token ${authToken}` },
          });
          setRepoStatus('ready');
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error('Repo setup failed', err);
      setRepoStatus('error');
      setError('Could not initialize github-drive repository.');
    }
  };

  return (
    <GithubContext.Provider value={{ token, setToken, user, login, logout, handleCallback, repoStatus, error, deviceData }}>
      {children}
    </GithubContext.Provider>
  );
};
