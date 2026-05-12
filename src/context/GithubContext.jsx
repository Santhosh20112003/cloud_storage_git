import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { auth, db } from '../config/firebase';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const GithubContext = createContext();

export const useGithub = () => useContext(GithubContext);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const GithubProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [user, setUser] = useState(null);
  const [githubToken, setGithubToken] = useState(null);
  const [githubUsername, setGithubUsername] = useState('');
  const [repoName, setRepoName] = useState('github-drive');
  const [repoStatus, setRepoStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const isGithubConnected = Boolean(githubToken && githubUsername);

  const saveUserRecord = async (uid, profile, firebaseUserObj, extraPayload = {}) => {
    try {
      const userRef = doc(db, 'users', uid);
      const snapshot = await getDoc(userRef);
      const payload = {
        name: profile?.name || firebaseUserObj?.displayName || '',
        email: profile?.email || firebaseUserObj?.email || '',
        photoURL: profile?.photoURL || firebaseUserObj?.photoURL || '',
        username: profile?.username || profile?.name || firebaseUserObj?.displayName || '',
        githubUsername: extraPayload.githubUsername !== undefined ? extraPayload.githubUsername : (githubUsername || ''),
        githubRepoName: extraPayload.repoName !== undefined ? extraPayload.repoName : (repoName || 'github-drive'),
        githubToken: extraPayload.githubToken !== undefined ? extraPayload.githubToken : (githubToken || ''),
        updatedAt: serverTimestamp(),
      };

      if (snapshot.exists()) {
        await updateDoc(userRef, {
          ...payload,
          githubUsername: payload.githubUsername || snapshot.data()?.githubUsername,
          githubRepoName: payload.githubRepoName || snapshot.data()?.githubRepoName,
          githubToken: payload.githubToken || snapshot.data()?.githubToken,
        });
      } else {
        await setDoc(userRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('Failed to save user record', err);
    }
  };

  const loadUserRecord = async (uid, firebaseUserObj) => {
    try {
      const userRef = doc(db, 'users', uid);
      const snapshot = await getDoc(userRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.githubRepoName) {
          setRepoName(data.githubRepoName);
        }
        if (data.githubUsername) {
          setGithubUsername(data.githubUsername);
        }
        if (data.githubToken) {
          setGithubToken(data.githubToken);
        }
        setUser({
          name: data.name || firebaseUserObj?.displayName || '',
          email: data.email || firebaseUserObj?.email || '',
          photoURL: data.photoURL || firebaseUserObj?.photoURL || '',
          username: data.username || firebaseUserObj?.displayName || firebaseUserObj?.email?.split('@')[0] || '',
          login: data.githubUsername || data.username || firebaseUserObj?.email?.split('@')[0] || '',
          githubUsername: data.githubUsername || '',
        });
      } else if (firebaseUserObj) {
        const profile = {
          login: firebaseUserObj.email?.split('@')[0] || '',
          name: firebaseUserObj.displayName || firebaseUserObj.email?.split('@')[0] || '',
          email: firebaseUserObj.email || '',
          photoURL: firebaseUserObj.photoURL || '',
          username: firebaseUserObj.displayName || firebaseUserObj.email?.split('@')[0] || '',
        };
        setUser(profile);
        await saveUserRecord(uid, profile, firebaseUserObj);
      }
    } catch (err) {
      console.error('Failed to load user record', err);
    }
  };

  const registerWithEmail = async (username, email, password) => {
    setError(null);
    setLoadingAuth(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (username) {
        await updateProfile(result.user, { displayName: username });
      }
      const profile = {
        name: username || result.user.displayName || '',
        email,
        photoURL: result.user.photoURL || '',
        username: username || result.user.email?.split('@')[0] || '',
        login: username || result.user.email?.split('@')[0] || '',
      };
      setFirebaseUser(result.user);
      setUser(profile);
      await saveUserRecord(result.user.uid, profile, result.user);
    } catch (err) {
      console.error('Registration failed', err);
      setError(err.message || 'Registration failed');
    } finally {
      setLoadingAuth(false);
    }
  };

  const signInWithEmail = async (email, password) => {
    setError(null);
    setLoadingAuth(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setFirebaseUser(result.user);
      await loadUserRecord(result.user.uid, result.user);
    } catch (err) {
      console.error('Sign in failed', err);
      setError(err.message || 'Sign in failed');
    } finally {
      setLoadingAuth(false);
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    setLoadingAuth(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const profile = {
        name: result.user.displayName || '',
        email: result.user.email || '',
        photoURL: result.user.photoURL || '',
        username: result.user.displayName || result.user.email?.split('@')[0] || '',
        login: result.user.displayName || result.user.email?.split('@')[0] || '',
      };
      setFirebaseUser(result.user);
      setUser(profile);
      await saveUserRecord(result.user.uid, profile, result.user);
    } catch (err) {
      console.error('Google sign in failed', err);
      setError(err.message || 'Google sign in failed');
    } finally {
      setLoadingAuth(false);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('Firebase sign out failed', err);
    }
    setGithubToken(null);
    setGithubUsername('');
    setUser(null);
    setFirebaseUser(null);
    setRepoStatus('idle');
    setError(null);
    
  };

  const connectGithubAccount = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_REDIRECT_URI;
    const scope = 'repo user';

    if (!clientId) {
      setError('GitHub Client ID is missing in .env');
      return;
    }

    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
  };

  const switchGithubAccount = async () => {
    setGithubToken(null);
    setGithubUsername('');
    
    await connectGithubAccount();
  };

  const updateRepoName = async (newRepoName) => {
    const normalized = newRepoName?.trim() || 'github-drive';
    setRepoName(normalized);
    
    if (firebaseUser) {
      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        await updateDoc(userRef, {
          githubRepoName: normalized,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Failed to update repo name', err);
      }
    }
  };

  const fetchGithubUser = async (tokenToUse) => {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: { 
          Authorization: `Bearer ${tokenToUse}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
      });
      const profile = {
        name: response.data.name || user?.name || response.data.login,
        email: user?.email || response.data.email || '',
        photoURL: response.data.avatar_url || user?.photoURL || '',
        username: response.data.login,
        login: response.data.login,
        githubUsername: response.data.login,
      };
      setUser(profile);
      setGithubUsername(response.data.login);
      
      const currentUid = firebaseUser?.uid || auth.currentUser?.uid;
      if (currentUid) {
        await saveUserRecord(currentUid, profile, firebaseUser || auth.currentUser, { githubUsername: response.data.login });
      }
      return response.data.login;
    } catch (err) {
      console.error('Failed to fetch GitHub user', err);
      setError('Could not retrieve GitHub profile');
      return null;
    }
  };

  const handleCallback = async (code) => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GITHUB_CLIENT_SECRET;
    try {
      const response = await axios.post('/github-login/login/oauth/access_token', {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: import.meta.env.VITE_REDIRECT_URI,
      }, {
        headers: { Accept: 'application/json' },
      });
      console.log("GitHub OAuth Response:", response.data);

      if (response.data.access_token) {
        const newToken = response.data.access_token;
        setGithubToken(newToken);
        
        const currentUid = firebaseUser?.uid || auth.currentUser?.uid;
        if (currentUid) {
          const userRef = doc(db, 'users', currentUid);
          await updateDoc(userRef, { githubToken: newToken, updatedAt: serverTimestamp() });
        }
        const githubLogin = await fetchGithubUser(newToken);
        if (githubLogin) {
          await checkOrCreateRepo(newToken, githubLogin);
        }
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

  const checkOrCreateRepo = async (authToken, username) => {
    if (!authToken || !username) return;

    setRepoStatus('checking');
    try {
      await axios.get(`https://api.github.com/repos/${username}/${repoName}`, {
        headers: { 
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
      });
      setRepoStatus('ready');
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setRepoStatus('creating');
        try {
          await axios.post('https://api.github.com/user/repos', {
            name: repoName,
            description: 'Cloud storage backend for GitHub Drive app',
            private: true,
            auto_init: true,
          }, {
            headers: { 
              Authorization: `Bearer ${authToken}` ,
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28'
            },
          });
          setRepoStatus('ready');
        } catch (creationError) {
          if (creationError.response && creationError.response.status === 422) {
            // 422 usually means the repository already exists or the name is invalid
            setRepoStatus('ready');
          } else {
            console.error('Repo creation failed', creationError);
            setRepoStatus('error');
            setError('Could not create your GitHub storage repository.');
          }
        }
      } else {
        console.error('Repo check failed', err);
        setRepoStatus('error');
        setError('Could not initialize GitHub storage repository.');
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUserObj) => {
      setFirebaseUser(firebaseUserObj);
      if (firebaseUserObj) {
        await loadUserRecord(firebaseUserObj.uid, firebaseUserObj);
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (githubToken && githubUsername) {
      checkOrCreateRepo(githubToken, githubUsername);
    }
  }, [githubToken, githubUsername, repoName]);

  return (
    <GithubContext.Provider value={{
      firebaseUser,
      user,
      githubToken,
      githubUsername,
      repoName,
      repoStatus,
      error,
      loadingAuth,
      isGithubConnected,
      registerWithEmail,
      signInWithEmail,
      signInWithGoogle,
      logout,
      connectGithubAccount,
      switchGithubAccount,
      handleCallback,
      updateRepoName,
    }}>
      {children}
    </GithubContext.Provider>
  );
};
