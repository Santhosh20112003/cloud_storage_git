import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from './components/Landing';
import Callback from './components/Callback';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/callback" element={<Callback />} />
    </Routes>
  );
}
