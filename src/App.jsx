import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GithubProvider, useGithub } from './context/GithubContext';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import Callback from './components/Callback';
import { Toaster } from 'react-hot-toast';

const ProtectedRoute = ({ children }) => {
  const { user, loadingAuth } = useGithub();
  
  if (loadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f6f8fa]">
        <div className="w-8 h-8 border-4 border-[#0366d6] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const App = () => {
  return (
    <>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#24292e',
              color: '#fff',
              borderRadius: '6px',
              fontSize: '14px',
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/callback" element={<Callback />} />
          <Route 
            path="/dashboard/*" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="/dashboard" element={<Navigate to="/dashboard/overview" replace />} />
        </Routes>
    </>
  );
};

export default App;
