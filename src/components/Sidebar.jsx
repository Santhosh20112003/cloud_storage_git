import React from 'react';
import { NavLink } from 'react-router-dom';
import { useGithub } from '../context/GithubContext';
import {
  FaHdd,
  FaFolder,
  FaCog,
  FaTimes,
  FaPlus,
  FaTrash,
  FaStar,
  FaCloudUploadAlt,
  FaLayerGroup
} from 'react-icons/fa';
import { STORAGE_CONFIG, formatStoragePercentage } from '../config/commonUtils';
import { GoogleDriveLogo } from './Icons';
import toast from 'react-hot-toast';

const Sidebar = ({
  usedStorage,
  totalStorage,
  percentage,
  isOpen,
  setIsOpen,
  activeView,
  setActiveView,
  trashCount = 0,
  starredCount = 0,
  onUploadClick,
  onCreateFolderClick
}) => {
  const { repositories, updateRepoName } = useGithub();

  const navItems = [
    { id: 'dashboard', icon: <FaHdd />, label: 'Home', path: '/dashboard/overview' },
    { id: 'mystorage', icon: <FaFolder />, label: 'My Drive', path: '/dashboard/all-files' },
    { id: 'starred', icon: <FaStar />, label: 'Starred', path: '/dashboard/starred', badge: starredCount > 0 ? starredCount : null },
    { id: 'trash', icon: <FaTrash />, label: 'Trash', path: '/dashboard/trash', badge: trashCount > 0 ? trashCount : null },
    { id: 'settings', icon: <FaCog />, label: 'Settings', path: '/dashboard/settings' },
  ];

  const handleAddRepo = () => {
    if (repositories.length >= STORAGE_CONFIG.MAX_REPOSITORIES) {
      return toast.error(`Account limit reached: Maximum ${STORAGE_CONFIG.MAX_REPOSITORIES} partitions allowed.`);
    }
    const nextRepoNum = repositories.length + 1;
    const newRepoName = `github-drive-${nextRepoNum}`;
    updateRepoName(newRepoName);
  };

  return (
    <>
      {/* Mobile Drawer Overlay: Scrim rgba(0,0,0,0.32) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden animate-overlay-in"
          style={{ backgroundColor: 'var(--scrim)' }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar: 240px fixed, --surface-variant bg, no right border (0 flush) */}
      <aside
        className={`fixed lg:static top-0 left-0 h-screen w-[240px] shrink-0 flex flex-col z-50 transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        style={{
          backgroundColor: 'var(--surface-variant)',
          color: 'var(--on-surface)'
        }}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <GoogleDriveLogo size={28} />
            <span className="font-medium text-xl tracking-tight" style={{ color: 'var(--on-surface)' }}>
              Drive
            </span>
          </div>
          <button
            className="lg:hidden p-1.5 rounded"
            style={{ color: 'var(--on-surface-variant)' }}
            onClick={() => setIsOpen(false)}
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Primary FAB / Action: 16px radius, 1dp elevation */}
        <div className="px-4 py-2">
          <button
            onClick={() => {
              if (onUploadClick) onUploadClick();
              setIsOpen(false);
            }}
            className="w-full h-12 flex items-center justify-center gap-3 text-sm font-medium transition-all elevation-fab cursor-pointer hover:bg-white"
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--on-surface)',
              borderRadius: '16px',
              border: '1px solid var(--outline-variant)'
            }}
          >
            <FaPlus size={14} style={{ color: 'var(--primary)' }} />
            <span>New upload</span>
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={() => {
                if (setActiveView) setActiveView(item.id);
                setIsOpen(false);
              }}
              className={({ isActive }) => `w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors rounded-r-full select-none ${isActive ? 'font-medium' : 'hover:bg-[#E8EAED]'
                }`}
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--primary-container)' : 'transparent',
                color: isActive ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
                borderRadius: '0 24px 24px 0',
                marginLeft: '-12px',
                paddingLeft: '24px'
              })}
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3.5">
                    <span style={{ color: isActive ? 'var(--primary)' : 'var(--on-surface-variant)' }}>
                      {React.cloneElement(item.icon, { size: 16 })}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: isActive ? 'var(--primary)' : 'var(--outline-variant)',
                        color: isActive ? 'var(--on-primary)' : 'var(--on-surface-variant)'
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* Storage Pools / Expansion Section (Native Drive Style) */}
          <div className="pt-5 pb-2 px-2">
            <div className="flex items-center justify-between text-xs mb-2 px-2">
              <span className="font-medium text-xs tracking-wide" style={{ color: 'var(--on-surface-variant)' }}>
                Storage Pool
              </span>
            </div>

            <div
              className="p-2.5 rounded-xl transition-all"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--outline-variant)'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'var(--primary-container)', color: 'var(--primary)' }}
                  >
                    <FaLayerGroup size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--on-surface)' }}>
                      Unified Pool
                    </p>
                    <p className="text-[11px] font-mono truncate" style={{ color: 'var(--on-surface-variant)' }}>
                      {repositories.length} {repositories.length === 1 ? 'volume' : 'volumes'} • {repositories.length * (STORAGE_CONFIG.PER_REPO_CAPACITY_GB || 2)} GB
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Storage Meter: Authentic Google Drive minimal style */}
        <div className="p-4 mx-3 mb-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--outline-variant)' }}>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <FaCloudUploadAlt size={14} style={{ color: 'var(--primary)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--on-surface)' }}>Storage</span>
            </div>
            <span className="text-[11px] font-mono font-medium" style={{ color: 'var(--on-surface-variant)' }}>
              {formatStoragePercentage(percentage)}
            </span>
          </div>

          <div
            className="w-full overflow-hidden"
            style={{
              backgroundColor: 'var(--outline-variant)',
              height: '4px',
              borderRadius: '2px'
            }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.min(Number(percentage) || 0, 100)}%`,
                backgroundColor: percentage > 90 ? 'var(--error)' : 'var(--primary)',
                borderRadius: '2px'
              }}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono" style={{ color: 'var(--on-surface-variant)' }}>
            <span>{usedStorage} used</span>
            <span>{totalStorage}</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
