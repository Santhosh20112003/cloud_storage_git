import React from 'react';
import { useGithub } from '../context/GithubContext';
import { 
  HardDrive, Folder, File, Clock, Settings, LogOut
} from 'lucide-react';
import { GithubIcon } from './Icons';

const Sidebar = ({ activeView, setActiveView, usedStorage, totalStorage, percentage }) => {
  const { user } = useGithub();
  const navItems = [
    { id: 'dashboard', icon: <HardDrive size={20} />, label: 'Dashboard' },
    { id: 'mystorage', icon: <Folder size={20} />, label: 'My Storage' },
    { id: 'docs', icon: <File size={20} />, label: 'Documentations' },
    { id: 'folders', icon: <Folder size={20} />, label: 'Folders' },
    { id: 'recent', icon: <Clock size={20} />, label: 'Recent' },
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <GithubIcon size={22} className="brand-icon" />
        </div>
        <span className="brand-name">GitHub Drive</span>
      </div>

      <div className="user-profile">
        <img src={user?.avatar_url || 'https://via.placeholder.com/40'} className="user-avatar" alt="User" />
        <div className="user-info">
          <p className="user-name">{user?.name || user?.login}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, i) => (
          <button 
            key={i} 
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => setActiveView(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-storage-status">
        <div className="storage-header">
          <HardDrive size={16} />
          <span>Storage Status</span>
        </div>
        <div className="storage-usage-text">
          <span className="used">{usedStorage}</span>
          <span className="total"> / {totalStorage}</span>
        </div>
        <div className="sidebar-progress-container">
          <div className="sidebar-progress-bar" style={{ width: `${percentage}%` }} />
        </div>
        <div className="storage-percentage-text">{percentage.toFixed(1)}% used</div>
      </div>
    </aside>
  );
};

export default Sidebar;
