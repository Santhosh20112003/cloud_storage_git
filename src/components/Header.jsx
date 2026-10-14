import React from 'react';
import { useGithub } from '../context/GithubContext';
import { FaBars, FaKeyboard, FaUserCircle } from 'react-icons/fa';

const Header = ({ sidebarOpen, setSidebarOpen, activeView, onOpenShortcuts }) => {
  const { user, firebaseUser } = useGithub();
  
  const getViewTitle = () => {
    switch(activeView) {
      case 'dashboard': return 'Dashboard Overview';
      case 'mystorage': return 'All Files & Folders';
      case 'starred': return 'Starred & Bookmarks';
      case 'trash': return 'Trash & Recovery Bin';
      case 'settings': return 'Storage Settings';
      default: return 'GitHub Drive';
    }
  };

  return (
    <header className="h-14 px-4 sm:px-6 flex items-center justify-between bg-white dark:bg-[#161b22] border-b border-[#e1e4e8] dark:border-[#30363d] text-[#24292e] dark:text-[#c9d1d9] shrink-0 z-10 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <button 
          className="lg:hidden p-1.5 text-[#586069] dark:text-[#8b949e] hover:bg-[#f3f4f6] dark:hover:bg-[#21262d] rounded-md"
          onClick={() => setSidebarOpen(true)}
        >
          <FaBars size={16} />
        </button>
        <h2 className="text-sm font-semibold text-[#24292e] dark:text-white">
          {getViewTitle()}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Keyboard shortcuts helper button */}
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#586069] dark:text-[#8b949e] bg-[#f6f8fa] dark:bg-[#21262d] border border-[#e1e4e8] dark:border-[#30363d] hover:border-[#0366d6] rounded-md transition-colors"
            title="Keyboard Shortcuts"
          >
            <FaKeyboard size={13} />
            <span className="font-mono text-[11px]">⌘/Ctrl K</span>
          </button>
        )}

        {/* User profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#e1e4e8] dark:border-[#30363d]">
          <div className="hidden md:block text-xs font-medium text-end leading-tight text-[#24292e] dark:text-[#c9d1d9]">
            <div className="truncate max-w-[140px] font-semibold">
              {firebaseUser?.displayName || user?.name || user?.login}
            </div>
            <div className="text-[10px] text-[#586069] dark:text-[#8b949e] truncate max-w-[140px]">
              {firebaseUser?.email || user?.email}
            </div>
          </div>
          {firebaseUser?.photoURL || user?.photoURL || user?.avatar_url ? (
            <img 
              src={firebaseUser?.photoURL || user?.photoURL || user?.avatar_url} 
              alt="avatar" 
              className="w-8 h-8 rounded-full border border-[#e1e4e8] dark:border-[#30363d] object-cover" 
            />
          ) : (
            <FaUserCircle size={26} className="text-[#959da5]" />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
