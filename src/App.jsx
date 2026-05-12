import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './components/Landing';
import Callback from './components/Callback';
import Dashboard from './components/Dashboard';
import { useGithub } from './context/GithubContext';

const ProtectedRoute = ({ children }) => {
  const { user, loadingAuth } = useGithub();
  
  if (loadingAuth) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );
  
  if (!user) return <Navigate to="/" />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loadingAuth } = useGithub();
  
  if (loadingAuth) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );
  
  if (user) return <Navigate to="/dashboard" />;
  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={
        <PublicRoute>
          <Landing />
        </PublicRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/callback" element={<Callback />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
