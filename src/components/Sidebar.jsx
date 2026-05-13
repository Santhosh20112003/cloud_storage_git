import React from 'react';
import { useGithub } from '../context/GithubContext';
import { FaHdd, FaFolder, FaCog, FaTimes, FaCloud, FaSignOutAlt, FaPlus } from 'react-icons/fa';

const Sidebar = ({ activeView, setActiveView, usedStorage, totalStorage, percentage, isOpen, setIsOpen }) => {
  const { user, logout, repositories, repoName, switchActiveRepo, updateRepoName } = useGithub();
  
  const navItems = [
    { id: 'dashboard', icon: <FaHdd />, label: 'Dashboard' },
    { id: 'mystorage', icon: <FaFolder />, label: 'All Files' },
    { id: 'settings', icon: <FaCog />, label: 'Settings' },
  ];

  const handleAddRepo = () => {
    if (repositories.length >= 3) {
      return toast.error('Account limit reached: Maximum 3 storage repositories allowed.');
    }
    const nextRepoNum = repositories.length + 1;
    const newRepoName = `github-drive-${nextRepoNum}`;
    updateRepoName(newRepoName);
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`fixed lg:static top-0 left-0 h-screen w-64 bg-[#f8f9fa] border-r border-[#e9ecef] flex flex-col z-50 transition-transform duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-14 flex items-center justify-between px-6 border-b border-[#e9ecef] bg-white">
          <div className="flex items-center gap-2">
            <FaCloud className="text-[#0366d6]" size={18} />
            <span className="font-semibold text-sm tracking-tight text-[#24292e]">Cloud Drive</span>
          </div>
          <button className="lg:hidden text-slate-400" onClick={() => setIsOpen(false)}>
            <FaTimes size={16} />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          <div className="px-3 mb-2">
            <p className="text-[10px] font-bold text-[#586069] uppercase tracking-wider">Navigation</p>
          </div>
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveView(item.id); setIsOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                  isActive 
                    ? 'bg-[#0366d6] text-white font-medium' 
                    : 'text-[#586069] hover:bg-[#f3f4f6] hover:text-[#24292e]'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-[#959da5]'}>
                  {React.cloneElement(item.icon, { size: 16 })}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="mt-6 px-3 mb-2 flex justify-between items-center">
            <p className="text-[10px] font-bold text-[#586069] uppercase tracking-wider">Storage Repos</p>
            {repositories.length < 3 && (
              <button onClick={handleAddRepo} className="text-[#0366d6] hover:bg-blue-50 p-1 rounded-full transition-colors">
                <FaPlus size={10} />
              </button>
            )}
          </div>
          {repositories.map((repo) => {
            const isActive = repoName === repo.name;
            return (
              <button
                key={repo.name}
                onClick={() => switchActiveRepo(repo.name)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                  isActive 
                    ? 'bg-[#e1ecf4] text-[#0366d6] font-medium border-l-2 border-[#0366d6]' 
                    : 'text-[#586069] hover:bg-[#f3f4f6] hover:text-[#24292e]'
                }`}
              >
                <FaHdd size={14} className={isActive ? 'text-[#0366d6]' : 'text-[#959da5]'} />
                <span className="truncate">{repo.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#e9ecef] bg-white">
          <div className="mb-4">
            <div className="flex justify-between text-[11px] mb-1.5 font-medium text-[#586069]">
              <span>Repo Usage</span>
              <span>{repoName}</span>
            </div>
            <div className="w-full bg-[#e1e4e8] rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-[#0366d6] h-full" 
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-[10px] text-[#6a737d] mt-2">
              {usedStorage} of {totalStorage} used
            </p>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-[#f1f2f3]">
            <img 
              src={user?.photoURL || user?.avatar_url || 'https://via.placeholder.com/32'} 
              className="w-8 h-8 rounded border border-[#e1e4e8]" 
              alt="User" 
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#24292e] truncate">{user?.name || user?.login}</p>
              <button onClick={logout} className="text-[10px] text-[#0366d6] hover:underline flex items-center gap-1">
                <FaSignOutAlt size={8} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
