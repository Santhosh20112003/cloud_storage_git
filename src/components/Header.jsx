import React from 'react';
import { useGithub } from '../context/GithubContext';
import { FaBell, FaSearch, FaUserCircle, FaBars } from 'react-icons/fa';

const Header = ({ sidebarOpen, setSidebarOpen, activeView }) => {
  const { user } = useGithub();
  
  const getViewTitle = () => {
    switch(activeView) {
      case 'dashboard': return 'Dashboard';
      case 'mystorage': return 'All Files';
      case 'settings': return 'Settings';
      default: return 'Overview';
    }
  };

  return (
    <header className="h-14 px-6 flex items-center justify-between bg-white border-b border-[#e1e4e8] shrink-0 z-10">
      <div className="flex items-center gap-4">
        <button 
          className="lg:hidden p-1.5 text-[#586069] hover:bg-[#f3f4f6] rounded"
          onClick={() => setSidebarOpen(true)}
        >
          <FaBars size={16} />
        </button>
        <h2 className="text-sm font-semibold text-[#24292e]">
          {getViewTitle()}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-3 h-8 bg-[#fafbfc] border border-[#e1e4e8] rounded focus-within:border-[#0366d6] focus-within:ring-1 focus-within:ring-[#0366d6] transition-all">
          <FaSearch className="text-[#959da5]" size={12} />
          <input 
            type="text" 
            placeholder="Search files..." 
            className="bg-transparent border-none outline-none text-xs text-[#24292e] placeholder:text-[#959da5] w-64"
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 text-[#586069] hover:text-[#0366d6] transition-colors relative">
            <FaBell size={14} />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#d73a49] rounded-full border border-white"></span>
          </button>
          
          <div className="h-4 w-px bg-[#e1e4e8]"></div>
          
          <div className="flex items-center gap-2 pl-1">
            <span className="hidden sm:block text-xs font-medium text-[#24292e]">
              {user?.displayName?.split(' ')[0] || user?.login}
            </span>
            {user?.photoURL || user?.avatar_url ? (
              <img 
                src={user?.photoURL || user?.avatar_url} 
                alt="profile" 
                className="w-7 h-7 rounded border border-[#e1e4e8]" 
              />
            ) : (
              <FaUserCircle size={24} className="text-[#959da5]" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
