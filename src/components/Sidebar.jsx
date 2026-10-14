import React from 'react';
import { NavLink } from 'react-router-dom';
import { useGithub } from '../context/GithubContext';
import { FaHdd, FaFolder, FaCog, FaTimes, FaCloud, FaPlus, FaTrash, FaStar } from 'react-icons/fa';
import { STORAGE_CONFIG } from '../config/commonUtils';
import toast from 'react-hot-toast';

const Sidebar = ({ usedStorage, totalStorage, percentage, isOpen, setIsOpen, activeView, setActiveView, trashCount = 0, starredCount = 0 }) => {
  const { user, firebaseUser, logout, repositories, repoName, switchActiveRepo, updateRepoName } = useGithub();
  
  const navItems = [
    { id: 'dashboard', icon: <FaHdd />, label: 'Dashboard', path: '/dashboard/overview' },
    { id: 'mystorage', icon: <FaFolder />, label: 'All Files', path: '/dashboard/all-files' },
    { id: 'starred', icon: <FaStar />, label: 'Starred Files', path: '/dashboard/starred', badge: starredCount > 0 ? starredCount : null },
    { id: 'trash', icon: <FaTrash />, label: 'Trash Bin', path: '/dashboard/trash', badge: trashCount > 0 ? trashCount : null },
    { id: 'settings', icon: <FaCog />, label: 'Settings', path: '/dashboard/settings' },
  ];

  const handleAddRepo = () => {
    if (repositories.length >= STORAGE_CONFIG.MAX_REPOSITORIES) {
      return toast.error(`Account limit reached: Maximum ${STORAGE_CONFIG.MAX_REPOSITORIES} storage repositories allowed.`);
    }
    const nextRepoNum = repositories.length + 1;
    const newRepoName = `github-drive-${nextRepoNum}`;
    updateRepoName(newRepoName);
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`fixed lg:static top-0 left-0 h-screen w-64 bg-[#f8f9fa] dark:bg-[#0d1117] border-r border-[#e9ecef] dark:border-[#30363d] flex flex-col z-50 transition-all duration-200 text-[#24292e] dark:text-[#c9d1d9] ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-[#e9ecef] dark:border-[#30363d] bg-white dark:bg-[#161b22]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-[#0366d6] dark:text-[#58a6ff] rounded-lg">
              <FaCloud size={16} />
            </div>
            <span className="font-bold text-sm tracking-tight text-[#24292e] dark:text-white">GitHub Drive</span>
          </div>
          <button className="lg:hidden text-slate-400 p-1" onClick={() => setIsOpen(false)}>
            <FaTimes size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 mb-2">
            <p className="text-[10px] font-bold text-[#586069] dark:text-[#8b949e] uppercase tracking-wider">Navigation</p>
          </div>
          {navItems.map((item) => {
            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={() => {
                  if (setActiveView) setActiveView(item.id);
                  setIsOpen(false);
                }}
                className={({ isActive }) => `w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                  isActive 
                    ? 'bg-[#0366d6] text-white font-medium shadow-xs' 
                    : 'text-[#586069] dark:text-[#8b949e] hover:bg-[#f3f4f6] dark:hover:bg-[#21262d] hover:text-[#24292e] dark:hover:text-white'
                }`}
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-white' : 'text-[#959da5] dark:text-[#8b949e]'}>
                        {React.cloneElement(item.icon, { size: 15 })}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-[#e1e4e8] dark:bg-[#30363d] text-[#586069] dark:text-[#8b949e]'}`}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Storage Drives (Secondary / Info) */}
          <div className="mt-6 px-3 mb-2 flex justify-between items-center">
            <p className="text-[10px] font-bold text-[#586069] dark:text-[#8b949e] uppercase tracking-wider">Storage Pool</p>
            {repositories.length < STORAGE_CONFIG.MAX_REPOSITORIES && (
              <button 
                onClick={handleAddRepo} 
                className="text-[#0366d6] dark:text-[#58a6ff] hover:bg-blue-50 dark:hover:bg-blue-950/40 p-1 rounded-full transition-colors"
                title="Add expansion storage partition"
              >
                <FaPlus size={10} />
              </button>
            )}
          </div>
          <div className="px-3 py-2 bg-[#f6f8fa] dark:bg-[#161b22] border border-[#e1e4e8] dark:border-[#30363d] rounded-lg">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#24292e] dark:text-white flex items-center gap-1.5">
                <FaHdd size={11} className="text-[#0366d6] dark:text-[#58a6ff]" /> Unified Volume
              </span>
              <span className="text-[10px] text-[#586069] dark:text-[#8b949e] bg-[#e1e4e8] dark:bg-[#30363d] px-1.5 py-0.5 rounded font-mono">
                {repositories.length} {repositories.length === 1 ? 'repo' : 'repos'}
              </span>
            </div>
            <p className="text-[10px] text-[#586069] dark:text-[#8b949e] mt-1">
              Automatic storage pooling & distribution across your private repositories.
            </p>
          </div>
        </nav>

        {/* Storage Capacity Gauge Bottom */}
        <div className="p-4 border-t border-[#e9ecef] dark:border-[#30363d] bg-white dark:bg-[#161b22]">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-[#586069] dark:text-[#8b949e]">Storage</span>
            <span className="font-semibold text-xs">{(Number(percentage) || 0).toFixed(2)}% used</span>
          </div>
          <div className="w-full bg-[#e1e4e8] dark:bg-[#30363d] h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                percentage > 90 ? 'bg-[#d73a49]' : percentage > 75 ? 'bg-amber-500' : 'bg-[#0366d6]'
              }`}
              style={{ width: `${Math.min(Number(percentage) || 0, 100)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-[#586069] dark:text-[#8b949e] mt-1 font-mono">
            <span>{usedStorage}</span>
            <span>{totalStorage}</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
