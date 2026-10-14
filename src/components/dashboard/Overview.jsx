import React, { useState, useMemo } from 'react';
import {
  FaFolder,
  FaEllipsisV,
  FaThLarge,
  FaList,
  FaChevronDown,
  FaInfoCircle,
  FaShareAlt,
  FaDownload,
  FaEdit,
  FaTrash,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaTimes
} from 'react-icons/fa';
import { getFileIcon, getFileIndicatorColor } from '../fileIndicators';

/**
 * Overview component modeled exactly after Google Drive's "Welcome to Cloud Drive / Home":
 * - Header: "Welcome to Cloud Drive" with info icon
 * - Section 1: "Suggested folders" (compact horizontal cards with folder icon + name + 3-dots)
 * - Section 2: "Suggested files" (chip filter pill + List/Grid toggle + sort options)
 * - Table / Grid of recent files with columns: Name, Reason suggested ("You opened ..."), and 3-dots action menu
 * - Clean, flat, minimal layout with zero raw stats/breakdown clutter
 */

const Overview = ({
  firestoreFiles = [],
  selectedFiles = [],
  setSelectedFiles,
  onFolderClick,
  onFileClick,
  onDetailsClick,
  onShareClick,
  onDownloadClick,
  onEditClick,
  onDeleteClick
}) => {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'name'

  // Extract folders
  const folders = useMemo(() => {
    return firestoreFiles
      .filter(f => f.type === 'dir' || (!f.size && !f.name.includes('.')))
      .slice(0, 4);
  }, [firestoreFiles]);

  // Extract suggested / recent files (excluding folders) sorted by chosen sort
  const recentFiles = useMemo(() => {
    let files = firestoreFiles
      .filter(f => f.type !== 'dir' && f.name && f.name.includes('.'));

    if (sortBy === 'name') {
      files = [...files].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      files = [...files].sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0));
    }

    return files.slice(0, 10);
  }, [firestoreFiles, sortBy]);

  const formatReason = (timestamp) => {
    if (!timestamp) return 'You opened · Recently';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return `You opened · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return `You opened · ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  };

  return (
    <div className="w-full flex flex-col space-y-6" style={{ color: 'var(--on-surface)' }}>
      {/* Top Welcome Title */}
      <div className="flex items-center justify-between pb-2">
        <h1 className="text-2xl font-medium tracking-tight" style={{ color: 'var(--on-surface)' }}>
          Welcome to Cloud Drive
        </h1>
      </div>

      {/* ── Section 1: Suggested Folders ── */}
      {folders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
            Suggested folders
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {folders.map((folder, idx) => (
              <div
                key={idx}
                onClick={() => onFolderClick && onFolderClick(folder.path || folder.name)}
                className="h-12 px-4 rounded-xl flex items-center justify-between cursor-pointer transition-colors select-none group"
                style={{
                  backgroundColor: '#EDF2FC', // Light blue-grey folder pill
                  border: '1px solid transparent'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E2ECFC'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EDF2FC'}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FaFolder size={18} style={{ color: '#444746' }} />
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--on-surface)' }}>
                    {folder.name}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDetailsClick) onDetailsClick(folder);
                  }}
                  className="p-1.5 rounded-full hover:bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--on-surface-variant)' }}
                  title="Folder options"
                >
                  <FaEllipsisV size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 2: Suggested Files ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          {/* Section Title or Floating Selection Pill */}
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
              Suggested files
            </h2>
            
            {/* Authentic Google Drive Multi-Selection Action Pill */}
            {selectedFiles.length > 0 && (
              <div 
                className="flex items-center gap-1.5 px-2 py-1 rounded-full shadow-sm transition-all animate-fadeIn"
                style={{
                  backgroundColor: 'var(--surface-variant)',
                  border: '1px solid var(--outline-variant)'
                }}
              >
                {/* Deselect / Close 'X' Button */}
                <button
                  onClick={() => setSelectedFiles && setSelectedFiles([])}
                  className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/10 active:bg-black/15 transition-colors cursor-pointer text-[#444746]"
                  title="Clear selection (Esc)"
                >
                  <FaTimes size={11} />
                </button>

                {/* Selection Count */}
                <span 
                  className="text-xs font-medium px-1 select-none"
                  style={{ color: 'var(--on-surface)' }}
                >
                  {selectedFiles.length} selected
                </span>

                {onDeleteClick && (
                  <>
                    <div className="h-4 w-[1px] bg-black/10 mx-0.5" />
                    <button
                      onClick={() => onDeleteClick(selectedFiles)}
                      className="h-7 px-2.5 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer rounded-full hover:opacity-90 active:scale-95"
                      style={{
                        backgroundColor: 'var(--error)',
                        color: '#FFFFFF'
                      }}
                      title="Delete selected"
                    >
                      <FaTrash size={10} />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">

            {/* Sort by pill dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-7 px-2.5 text-xs font-medium outline-none cursor-pointer rounded-full"
              style={{
                backgroundColor: 'var(--surface)',
                color: 'var(--on-surface-variant)',
                border: '1px solid var(--outline)'
              }}
              title="Sort suggested files"
            >
              <option value="date">Sort: Last opened</option>
              <option value="name">Sort: Name</option>
            </select>

            {/* Toggle between List and Grid view (chips 8px radius) */}
            <div
              className="flex items-center p-0.5"
              style={{
                backgroundColor: 'var(--surface-variant)',
                borderRadius: '8px',
                border: '1px solid var(--outline-variant)'
              }}
            >
              <button
                onClick={() => setViewMode('list')}
                className="p-1.5 transition-colors"
                style={{
                  borderRadius: '6px',
                  backgroundColor: viewMode === 'list' ? 'var(--primary-container)' : 'transparent',
                  color: viewMode === 'list' ? 'var(--primary)' : 'var(--on-surface-variant)',
                  border: viewMode === 'list' ? '1px solid #D2E3FC' : '1px solid transparent'
                }}
                title="List view"
              >
                <FaList size={13} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className="p-1.5 transition-colors"
                style={{
                  borderRadius: '6px',
                  backgroundColor: viewMode === 'grid' ? 'var(--primary-container)' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--primary)' : 'var(--on-surface-variant)',
                  border: viewMode === 'grid' ? '1px solid #D2E3FC' : '1px solid transparent'
                }}
                title="Grid view"
              >
                <FaThLarge size={13} />
              </button>
            </div>
          </div>
        </div>

        {recentFiles.length === 0 ? (
          <div className="py-16 text-center text-xs" style={{ color: 'var(--on-surface-variant)' }}>
            No suggested files yet. Upload files to see them here.
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View: 8px radius cards */
          <div
            className="grid gap-3 pt-2"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))'
            }}
          >
            {recentFiles.map((file, idx) => {
              const isSelected = selectedFiles.includes(file.path);
              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (setSelectedFiles) {
                      setSelectedFiles(prev =>
                        prev.includes(file.path) ? prev.filter(p => p !== file.path) : [...prev, file.path]
                      );
                    }
                  }}
                  onDoubleClick={() => onFileClick && onFileClick(file)}
                  className="p-3.5 rounded-xl flex flex-col justify-between cursor-pointer transition-all group relative select-none"
                  style={{
                    backgroundColor: isSelected ? 'var(--primary-container)' : 'var(--surface)',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--outline-variant)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--surface-variant)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--surface)';
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (setSelectedFiles) {
                            setSelectedFiles(prev =>
                              prev.includes(file.path) ? prev.filter(p => p !== file.path) : [...prev, file.path]
                            );
                          }
                        }}
                        className={`w-4 h-4 rounded cursor-pointer accent-[#1A73E8] ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                      />
                      {getFileIcon(file.name, file.type, 20)}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDetailsClick) onDetailsClick(file);
                      }}
                      className="p-1.5 rounded-full hover:bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--on-surface-variant)' }}
                    >
                      <FaEllipsisV size={11} />
                    </button>
                  </div>

                  <div className="min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: isSelected ? 'var(--on-primary-container)' : 'var(--on-surface)' }}
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <p className="text-xs font-mono mt-1" style={{ color: 'var(--on-surface-variant)' }}>
                      {formatReason(file.lastModified)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View: 48px height rows, 16px horizontal padding, 1px bottom border */
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className="h-10 text-xs font-medium"
                  style={{
                    borderBottom: '1px solid var(--outline-variant)',
                    color: 'var(--on-surface-variant)'
                  }}
                >
                  <th className="w-10 px-4">
                    <input
                      type="checkbox"
                      checked={recentFiles.length > 0 && recentFiles.every(f => selectedFiles.includes(f.path))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const allPaths = Array.from(new Set([...selectedFiles, ...recentFiles.map(f => f.path)]));
                          if (setSelectedFiles) setSelectedFiles(allPaths);
                        } else {
                          const recentPaths = new Set(recentFiles.map(f => f.path));
                          if (setSelectedFiles) setSelectedFiles(prev => prev.filter(p => !recentPaths.has(p)));
                        }
                      }}
                      className="w-4 h-4 rounded cursor-pointer accent-[#1A73E8]"
                      title="Select all suggested files"
                    />
                  </th>
                  <th
                    className="px-4 cursor-pointer hover:bg-black/5 transition-colors select-none"
                    onClick={() => setSortBy('name')}
                    title="Sort by Name"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Name</span>
                      {sortBy === 'name' ? (
                        <FaSortUp size={11} style={{ color: 'var(--primary)' }} />
                      ) : (
                        <FaSort size={10} className="opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 hidden sm:table-cell cursor-pointer hover:bg-black/5 transition-colors select-none"
                    onClick={() => setSortBy('date')}
                    title="Sort by Reason / Date"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Reason suggested</span>
                      {sortBy === 'date' ? (
                        <FaSortDown size={11} style={{ color: 'var(--primary)' }} />
                      ) : (
                        <FaSort size={10} className="opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="w-12 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {recentFiles.map((file, idx) => {
                  const isSelected = selectedFiles.includes(file.path);
                  return (
                    <tr
                      key={idx}
                      onClick={() => {
                        if (setSelectedFiles) {
                          setSelectedFiles(prev =>
                            prev.includes(file.path) ? prev.filter(p => p !== file.path) : [...prev, file.path]
                          );
                        }
                      }}
                      onDoubleClick={() => onFileClick && onFileClick(file)}
                      className="group cursor-pointer select-none transition-colors"
                      style={{
                        height: '48px',
                        borderBottom: '1px solid var(--outline-variant)',
                        backgroundColor: isSelected ? 'var(--primary-container)' : 'transparent',
                        borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--surface-variant)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Checkbox column */}
                      <td className="px-4 w-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (setSelectedFiles) {
                              setSelectedFiles(prev =>
                                prev.includes(file.path) ? prev.filter(p => p !== file.path) : [...prev, file.path]
                              );
                            }
                          }}
                          className={`w-4 h-4 rounded cursor-pointer accent-[#1A73E8] ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                        />
                      </td>

                      {/* Name + Icon */}
                      <td className="px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {getFileIcon(file.name, file.type, 18)}
                          <span
                            className="text-sm font-medium truncate max-w-xs sm:max-w-md"
                            style={{ color: isSelected ? 'var(--on-primary-container)' : 'var(--on-surface)' }}
                            title={file.name}
                          >
                            {file.name}
                          </span>
                        </div>
                      </td>

                      {/* Reason suggested (e.g. "You opened · 1:39 AM") */}
                      <td className="px-4 text-xs font-mono hidden sm:table-cell" style={{ color: 'var(--on-surface-variant)' }}>
                        {formatReason(file.lastModified)}
                      </td>

                      {/* 3-dots Menu */}
                      <td className="px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDetailsClick) onDetailsClick(file);
                          }}
                          className="p-1.5 rounded-full hover:bg-black/5 transition-colors"
                          style={{ color: 'var(--on-surface-variant)' }}
                          title="Options"
                        >
                          <FaEllipsisV size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Overview;
