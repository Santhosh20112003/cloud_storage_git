import React from 'react';
import { useGithub } from '../context/GithubContext';
import { FaHdd, FaFolder, FaFile, FaClock, FaCog, FaSignOutAlt, FaGithub } from 'react-icons/fa';

const Sidebar = ({ activeView, setActiveView, usedStorage, totalStorage, percentage }) => {
  const { user, logout } = useGithub();
  const navItems = [
    { id: 'dashboard', icon: <FaHdd size={20} />, label: 'Dashboard' },
    { id: 'mystorage', icon: <FaFolder size={20} />, label: 'My Storage' },
    { id: 'folders', icon: <FaFolder size={20} />, label: 'Folders' },
    { id: 'recent', icon: <FaClock size={20} />, label: 'Recent' },
    { id: 'settings', icon: <FaCog size={20} />, label: 'Settings' },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 h-screen flex flex-col z-20">
      <div className="p-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <FaGithub size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-800 font-sans">GitHub Drive</span>
        </div>
      </div>

      <div className="px-6 mb-8 mt-2">
        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-slate-100/80 transition-all group cursor-default">
          <div className="relative">
            <img 
              src={user?.photoURL || user?.avatar_url || 'https://via.placeholder.com/40'} 
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-slate-200" 
              alt="User" 
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{user?.name || user?.login}</p>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{user?.githubUsername ? 'GitHub Connected' : 'Identity Verified'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item, i) => (
          <button
            key={i}
            onClick={() => setActiveView(item.id)}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group ${
              activeView === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 active:scale-[0.98]' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 group-hover:pl-5'
            }`}
          >
            <span className={`transition-transform duration-200 ${activeView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
              {item.icon}
            </span>
            <span className="font-bold text-[13px] tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 mt-auto">
        <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100/50">
          <div className="flex items-center gap-2 mb-4 text-blue-700">
            <FaHdd size={14} className="animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest">Storage Status</span>
          </div>
          <div className="flex justify-between items-end mb-2">
            <p className="text-xs font-bold text-slate-500">
              <span className="text-blue-600 text-sm">{usedStorage}</span> / {totalStorage}
            </p>
            <p className="text-xs font-black text-blue-600">{percentage.toFixed(1)}%</p>
          </div>
          <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden shadow-inner">
            <div 
              className="bg-blue-600 h-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(37,99,235,0.4)]" 
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        
        <button 
          onClick={logout}
          className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all font-bold text-sm"
        >
          <FaSignOutAlt size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
