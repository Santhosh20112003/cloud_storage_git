import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGithub } from '../context/GithubContext';
import {
  FaBars,
  FaKeyboard,
  FaUserCircle,
  FaSearch,
  FaTimes,
  FaChevronDown,
  FaCog,
  FaSignOutAlt,
  FaUser,
  FaCloud,
  FaCamera,
  FaCheck
} from 'react-icons/fa';
import { getFileIcon, getFileTypeCategory } from './fileIndicators';
import { formatStoragePercentage } from '../config/commonUtils';

const Header = ({
  sidebarOpen,
  setSidebarOpen,
  activeView,
  setActiveView,
  onOpenShortcuts,
  searchQuery,
  setSearchQuery,
  allFiles = [],
  onFileClick,
  onNavigateFolder,
  usedStorage = '0 MB',
  totalStorage = '2 GB',
  percentage = 0
}) => {
  const { user, firebaseUser, logout } = useGithub();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const searchContainerRef = useRef(null);
  const profileContainerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
      if (profileContainerRef.current && !profileContainerRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Filter files dynamically based on search query and selectedType
  const searchResults = useMemo(() => {
    if (!allFiles || allFiles.length === 0) return [];
    let list = allFiles;

    if (selectedType !== 'all') {
      list = list.filter(f => getFileTypeCategory(f.name, f.type) === selectedType);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(f => f.name?.toLowerCase().includes(q) || f.path?.toLowerCase().includes(q));
    }

    return list.slice(0, 8);
  }, [allFiles, searchQuery, selectedType]);

  // Clean, proper percentage formatting (e.g., 0.4% or 12%)
  const formattedPercentage = useMemo(() => {
    return formatStoragePercentage(percentage);
  }, [percentage]);

  return (
    <>
      <header
        className="h-16 px-6 flex items-center justify-between gap-4 shrink-0 z-10 select-none"
        style={{
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--outline-variant)',
          color: 'var(--on-surface)'
        }}
      >
        <div className="flex items-center gap-4">
          <button
            className="lg:hidden p-2 rounded-full hover:bg-[#F8F9FA] transition-colors"
            style={{ color: 'var(--on-surface-variant)' }}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <FaBars size={16} />
          </button>
        </div>

        {/* Google Drive styled central search bar with interactive dropdown */}
        {setSearchQuery !== undefined && (
          <div className="flex-1 max-w-3xl mx-auto hidden sm:block relative" ref={searchContainerRef}>
            <div
              className="relative flex items-center h-12 px-4 transition-all"
              style={{
                backgroundColor: isDropdownOpen ? 'var(--surface)' : 'var(--gray-light-dark)',
                borderRadius: isDropdownOpen ? '24px 24px 0 0' : '24px',
                border: isDropdownOpen ? '1px solid var(--outline-variant)' : '1px solid transparent',
                borderBottom: isDropdownOpen ? '1px solid var(--outline-variant)' : '1px solid transparent',
                boxShadow: isDropdownOpen ? '0 4px 16px rgba(0,0,0,0.12)' : 'none'
              }}
            >
              <FaSearch size={14} style={{ color: 'var(--on-surface-variant)' }} className="shrink-0 mr-3" />
              <input
                type="text"
                placeholder="Search in Drive"
                value={searchQuery || ''}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#5F6368]"
                style={{ color: 'var(--on-surface)' }}
              />

              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedType('all');
                  }}
                  className="p-1 rounded-full hover:bg-black/5 transition-colors mr-1"
                  style={{ color: 'var(--on-surface-variant)' }}
                  title="Clear search"
                >
                  <FaTimes size={12} />
                </button>
              )}

              {onOpenShortcuts && !searchQuery && (
                <button
                  onClick={onOpenShortcuts}
                  className="ml-2 px-2 py-0.5 text-[11px] font-mono rounded"
                  style={{
                    backgroundColor: 'var(--surface)',
                    color: 'var(--on-surface-variant)',
                    border: '1px solid var(--outline-variant)'
                  }}
                  title="Keyboard Shortcuts (⌘K)"
                >
                  ⌘K
                </button>
              )}
            </div>

            {/* Interactive Google Drive Search Dropdown */}
            {isDropdownOpen && (
              <div
                className="absolute left-0 right-0 top-12 elevation-dialog z-50 overflow-hidden animate-modal-in"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: '0 0 24px 24px',
                  border: '1px solid var(--outline-variant)',
                  borderTop: 'none',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.12)'
                }}
              >
                {/* Filter Chips inside dropdown header (Type, People, Modified) */}
                <div
                  className="p-3 flex items-center gap-2 overflow-x-auto"
                  style={{ borderBottom: '1px solid var(--outline-variant)' }}
                >
                  {[
                    { id: 'all', label: 'Type' },
                    { id: 'pdf', label: 'PDFs' },
                    { id: 'doc', label: 'Documents' },
                    { id: 'image', label: 'Images' },
                    { id: 'code', label: 'Code' }
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className="px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
                      style={{
                        backgroundColor: selectedType === type.id ? 'var(--primary-container)' : 'var(--surface)',
                        color: selectedType === type.id ? 'var(--primary)' : 'var(--on-surface-variant)',
                        border: selectedType === type.id ? '1px solid #D2E3FC' : '1px solid var(--outline)'
                      }}
                    >
                      <span>{type.label}</span>
                      <FaChevronDown size={8} />
                    </button>
                  ))}
                </div>

                {/* Live Search Results: Clean rows without harsh divider lines, identical to Google Drive */}
                <div className="max-h-80 overflow-y-auto py-1">
                  {searchResults.length === 0 ? (
                    <div className="py-8 text-center text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                      {searchQuery ? `No matching files found for "${searchQuery}"` : 'Type a filename or select a filter above'}
                    </div>
                  ) : (
                    searchResults.map((file, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setIsDropdownOpen(false);
                          if (file.type === 'dir' && onNavigateFolder) {
                            onNavigateFolder(file.path || file.name);
                          } else if (onFileClick) {
                            onFileClick(file);
                          }
                        }}
                        className="px-4 py-2.5 mx-2 rounded-lg flex items-center justify-between cursor-pointer hover:bg-[#F1F3F4] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getFileIcon(file.name, file.type, 18)}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--on-surface)' }}>
                              {file.name}
                            </p>
                            <p className="text-xs truncate" style={{ color: 'var(--on-surface-variant)' }}>
                              {user?.name || user?.login || 'Shared with me'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-4">
                          <span className="text-xs font-mono" style={{ color: 'var(--on-surface-variant)' }}>
                            {file.lastModified ? new Date(file.lastModified).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recently'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer info: Advanced search / all results */}
                <div
                  className="px-4 py-2.5 flex items-center justify-between text-xs"
                  style={{
                    backgroundColor: 'var(--surface-variant)',
                    borderTop: '1px solid var(--outline-variant)',
                    color: 'var(--primary)'
                  }}
                >
                  <span className="cursor-pointer hover:underline font-medium">
                    {searchResults.length} file{searchResults.length === 1 ? '' : 's'} available
                  </span>
                  <span className="text-xs font-mono" style={{ color: 'var(--on-surface-variant)' }}>
                    Press Esc to close
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right Section: Authentic Google Drive Profile Pill & Popover */}
        <div className="relative" ref={profileContainerRef}>
          <button
            onClick={() => setIsProfileOpen(prev => !prev)}
            className="flex items-center gap-3 pl-3 pr-1 py-1 rounded-full hover:bg-black/5 transition-all cursor-pointer"
            style={{
              border: isProfileOpen ? '1px solid var(--primary)' : '1px solid transparent',
              backgroundColor: isProfileOpen ? 'var(--surface-variant)' : 'transparent'
            }}
            title="Google Account"
          >
            <div className="hidden md:block text-right leading-tight">
              <div className="text-sm font-medium truncate max-w-[160px]" style={{ color: 'var(--on-surface)' }}>
                {firebaseUser?.displayName || user?.name || user?.login || 'User'}
              </div>
              <div className="text-[11px] truncate max-w-[150px]" style={{ color: 'var(--on-surface-variant)' }}>
                {firebaseUser?.email || user?.email || 'Connected'}
              </div>
            </div>

            {firebaseUser?.photoURL || user?.photoURL || user?.avatar_url ? (
              <img
                src={firebaseUser?.photoURL || user?.photoURL || user?.avatar_url}
                alt="avatar"
                className="w-8 h-8 rounded-full object-cover transition-all"
                style={{
                  boxShadow: isProfileOpen ? '0 0 0 2px var(--primary)' : '0 0 0 1px var(--outline-variant)'
                }}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs"
                style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
              >
                {(firebaseUser?.displayName || user?.name || user?.login || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </button>

          {/* Google Profile Card Popover */}
          {isProfileOpen && (
            <div
              className="absolute right-0 top-14 w-[340px] elevation-dialog z-50 overflow-hidden animate-modal-in"
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: '24px',
                border: '1px solid var(--outline-variant)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.14)'
              }}
            >
              {/* Top Banner / Close button */}
              <div className="pt-3 px-4 flex justify-end">
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors cursor-pointer"
                  style={{ color: 'var(--on-surface-variant)' }}
                  title="Close"
                >
                  <FaTimes size={13} />
                </button>
              </div>

              {/* User Hero Section */}
              <div className="px-5 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    {firebaseUser?.photoURL || user?.photoURL || user?.avatar_url ? (
                      <div className="p-0.5 rounded-full" style={{ border: '2px solid var(--primary)' }}>
                        <img
                          src={firebaseUser?.photoURL || user?.photoURL || user?.avatar_url}
                          alt="avatar"
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg text-white"
                        style={{ backgroundColor: 'var(--primary)' }}
                      >
                        {(firebaseUser?.displayName || user?.name || user?.login || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#DADCE0] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
                      title="Edit Profile"
                    >
                      <FaCamera size={9} style={{ color: 'var(--on-surface-variant)' }} />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold truncate" style={{ color: 'var(--on-surface)' }}>
                      {firebaseUser?.displayName || user?.name || user?.login || 'User'}
                    </h4>
                    <p className="text-xs truncate font-mono mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
                      {firebaseUser?.email || user?.email || 'Connected'}
                    </p>
                    <span
                      className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1.5"
                      style={{
                        backgroundColor: 'var(--primary-container)',
                        color: 'var(--primary)'
                      }}
                    >
                      Pro Storage Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Rows: Manage Account, Settings, Sign Out */}
              <div className="px-3 pb-3 space-y-1.5">
                {/* Profile Modal Trigger */}
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full h-11 px-4 rounded-2xl flex items-center gap-3 text-xs font-medium transition-colors cursor-pointer hover:bg-[#F8F9FA]"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--outline)',
                    color: 'var(--on-surface)'
                  }}
                >
                  <FaUser size={13} style={{ color: 'var(--primary)' }} />
                  <span>View profile details</span>
                </button>

                {/* Settings Link */}
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    if (setActiveView) setActiveView('settings');
                    navigate('/dashboard/settings');
                  }}
                  className="w-full h-11 px-4 rounded-2xl flex items-center gap-3 text-xs font-medium transition-colors cursor-pointer hover:bg-[#F8F9FA]"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--outline)',
                    color: 'var(--on-surface)'
                  }}
                >
                  <FaCog size={13} style={{ color: 'var(--on-surface-variant)' }} />
                  <span>Storage pool settings</span>
                </button>

                {/* Sign Out Button */}
                <button
                  onClick={async () => {
                    setIsProfileOpen(false);
                    await logout();
                    navigate('/');
                  }}
                  className="w-full h-11 px-4 rounded-2xl flex items-center gap-3 text-xs font-medium transition-colors cursor-pointer hover:bg-[#FCE8E6]"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid #FAD2CF',
                    color: 'var(--error)'
                  }}
                >
                  <FaSignOutAlt size={13} />
                  <span>Sign out</span>
                </button>
              </div>

              {/* Storage Summary Pill at bottom of card */}
              <div
                className="mx-3 mb-3 p-3 rounded-2xl"
                style={{
                  backgroundColor: 'var(--surface-variant)',
                  border: '1px solid var(--outline-variant)'
                }}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <FaCloud size={13} style={{ color: 'var(--primary)' }} />
                    <span style={{ color: 'var(--on-surface)' }}>{formattedPercentage} used</span>
                  </div>
                  <span style={{ color: 'var(--on-surface-variant)' }}>
                    {usedStorage} of {totalStorage}
                  </span>
                </div>
              </div>

              {/* Privacy / Terms footer */}
              <div
                className="py-2.5 px-4 text-center text-[10px] flex items-center justify-center gap-3"
                style={{
                  borderTop: '1px solid var(--outline-variant)',
                  backgroundColor: 'var(--surface-variant)',
                  color: 'var(--on-surface-variant)'
                }}
              >
                <span className="cursor-pointer hover:underline">Privacy Policy</span>
                <span>•</span>
                <span className="cursor-pointer hover:underline">Terms of Service</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Profile Details Modal (New) */}
      {isProfileModalOpen && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-overlay-in"
          style={{ backgroundColor: 'var(--scrim)' }}
          onClick={() => setIsProfileModalOpen(false)}
        >
          <div
            className="w-full max-w-md elevation-dialog overflow-hidden animate-modal-in"
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '24px',
              border: '1px solid var(--outline-variant)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="h-14 px-6 flex items-center justify-between"
              style={{
                borderBottom: '1px solid var(--outline-variant)',
                backgroundColor: 'var(--surface)'
              }}
            >
              <div className="flex items-center gap-2.5">
                <FaUser size={14} style={{ color: 'var(--primary)' }} />
                <h3 className="font-medium text-sm" style={{ color: 'var(--on-surface)' }}>
                  User Profile
                </h3>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors cursor-pointer"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                <FaTimes size={13} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div className="flex flex-col items-center text-center">
                {firebaseUser?.photoURL || user?.photoURL || user?.avatar_url ? (
                  <img
                    src={firebaseUser?.photoURL || user?.photoURL || user?.avatar_url}
                    alt="avatar"
                    className="w-20 h-20 rounded-full object-cover mb-3"
                    style={{ border: '3px solid var(--primary)' }}
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl text-white mb-3"
                    style={{ backgroundColor: 'var(--primary)' }}
                  >
                    {(firebaseUser?.displayName || user?.name || user?.login || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <h4 className="text-base font-medium" style={{ color: 'var(--on-surface)' }}>
                  {firebaseUser?.displayName || user?.name || user?.login || 'User'}
                </h4>
                <p className="text-xs font-mono" style={{ color: 'var(--on-surface-variant)' }}>
                  {firebaseUser?.email || user?.email || 'Connected'}
                </p>
              </div>

              {/* Account Details list */}
              <div
                className="rounded-2xl divide-y text-xs overflow-hidden"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--outline-variant)'
                }}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <span style={{ color: 'var(--on-surface-variant)' }}>Account Type</span>
                  <span className="font-medium" style={{ color: 'var(--primary)' }}>Google / GitHub Pro</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span style={{ color: 'var(--on-surface-variant)' }}>Cloud Storage</span>
                  <span className="font-mono">{usedStorage} / {totalStorage}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span style={{ color: 'var(--on-surface-variant)' }}>GitHub Username</span>
                  <span className="font-mono">{user?.login || 'Connected'}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span style={{ color: 'var(--on-surface-variant)' }}>Authentication</span>
                  <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <FaCheck size={11} /> Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="px-6 py-3.5 flex items-center justify-between"
              style={{
                borderTop: '1px solid var(--outline-variant)',
                backgroundColor: 'var(--surface-variant)'
              }}
            >
              <button
                onClick={async () => {
                  setIsProfileModalOpen(false);
                  await logout();
                  navigate('/');
                }}
                className="h-8 px-4 text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors cursor-pointer hover:bg-[#FCE8E6]"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid #FAD2CF',
                  color: 'var(--error)'
                }}
              >
                <FaSignOutAlt size={11} /> Sign out
              </button>

              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="h-8 px-5 text-xs font-medium rounded-full cursor-pointer hover:bg-white transition-colors"
                style={{
                  border: '1px solid var(--outline)',
                  color: 'var(--on-surface)',
                  backgroundColor: 'var(--surface)'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
