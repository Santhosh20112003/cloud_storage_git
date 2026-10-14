import React from 'react';
import { 
  FaArrowLeft, 
  FaTrash, 
  FaFolderPlus, 
  FaUpload, 
  FaSearch, 
  FaSpinner, 
  FaFolder, 
  FaEllipsisV,
  FaThLarge, 
  FaList, 
  FaShareAlt, 
  FaHistory, 
  FaStar, 
  FaRegStar, 
  FaEdit,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaTimes
} from 'react-icons/fa';
import { getFileIcon, getFileIndicatorColor } from '../fileIndicators';
import { isFileEditable } from '../../config/commonUtils';

const AllFiles = ({ 
  currentPath, 
  setCurrentPath, 
  selectedFiles, 
  setSelectedFiles, 
  handleDelete, 
  handleCreateFolder, 
  fileInputRef, 
  searchQuery, 
  setSearchQuery, 
  filterType, 
  setFilterType, 
  sortBy, 
  setSortBy, 
  loading, 
  filteredItems, 
  handleDoubleClick, 
  setDetailsFile,
  activeView,
  viewMode = 'list',
  setViewMode,
  onOpenHistory,
  onOpenShare,
  onEditFile,
  starredPaths = [],
  toggleStar
}) => {
  return (
    <div 
      className="w-full flex flex-col"
      style={{
        backgroundColor: 'var(--surface)',
        color: 'var(--on-surface)'
      }}
    >
      {/* Breadcrumbs & Primary Actions Row: Authentic Drive style */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 mb-3" style={{ borderBottom: '1px solid var(--outline-variant)' }}>
        {/* Breadcrumb Hierarchy with rounded hover state */}
        <div className="flex items-center gap-1.5 flex-wrap text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          {currentPath && (
            <button 
              onClick={() => {
                const parts = currentPath.split('/'); 
                parts.pop(); 
                setCurrentPath(parts.join('/'));
              }} 
              className="p-1.5 rounded-full hover:bg-black/5 transition-colors mr-1"
              style={{ color: 'var(--on-surface-variant)' }}
              title="Navigate up"
            >
              <FaArrowLeft size={12} />
            </button>
          )}

          <button 
            className="px-2 py-1 rounded-md hover:bg-black/5 transition-colors text-base font-medium"
            style={{ color: !currentPath ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}
            onClick={() => setCurrentPath('')}
          >
            My Drive
          </button>

          {currentPath && currentPath.split('/').map((folder, idx, arr) => (
            <React.Fragment key={idx}>
              <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>/</span>
              <button 
                className={`px-2 py-1 rounded-md hover:bg-black/5 transition-colors text-sm ${idx === arr.length - 1 ? 'font-medium' : ''}`}
                style={{ color: idx === arr.length - 1 ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}
                onClick={() => {
                  const newPath = arr.slice(0, idx + 1).join('/');
                  setCurrentPath(newPath);
                }}
              >
                {folder}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Authentic Google Drive Multi-Selection Action Pill */}
          {selectedFiles.length > 0 && (
            <div 
              className="flex items-center gap-1.5 px-2 py-1 rounded-full shadow-sm mr-2 transition-all animate-fadeIn"
              style={{
                backgroundColor: 'var(--surface-variant)',
                border: '1px solid var(--outline-variant)'
              }}
            >
              {/* Deselect / Close 'X' Button */}
              <button
                onClick={() => setSelectedFiles([])}
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

              <div className="h-4 w-[1px] bg-black/10 mx-0.5" />

              {/* Delete Action Button */}
              <button 
                onClick={handleDelete} 
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
            </div>
          )}

          {/* View switcher (Chips 8px radius) */}
          {setViewMode && (
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
          )}

          <button 
            onClick={handleCreateFolder} 
            className="h-8 px-3.5 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer hover:bg-black/5"
            style={{
              borderRadius: '18px',
              backgroundColor: 'var(--surface)',
              color: 'var(--on-surface)',
              border: '1px solid var(--outline)'
            }}
          >
            <FaFolderPlus size={11} style={{ color: 'var(--primary)' }} />
            <span>New folder</span>
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="h-8 px-4 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            style={{
              borderRadius: '18px',
              backgroundColor: 'var(--primary)',
              color: 'var(--on-primary)'
            }}
          >
            <FaUpload size={11} />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* Filter Chips Bar (Light minimalist pills matching Drive) */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'all', label: 'All types' },
            { id: 'pdf', label: 'PDFs' },
            { id: 'doc', label: 'Documents' },
            { id: 'image', label: 'Images' },
            { id: 'video', label: 'Videos' }
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setFilterType(chip.id)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer"
              style={{
                backgroundColor: filterType === chip.id ? 'var(--primary-container)' : 'var(--surface)',
                color: filterType === chip.id ? 'var(--primary)' : 'var(--on-surface-variant)',
                border: filterType === chip.id ? '1px solid #D2E3FC' : '1px solid var(--outline)'
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-7 px-2.5 text-xs font-medium outline-none cursor-pointer rounded-full"
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--on-surface-variant)',
              border: '1px solid var(--outline)'
            }}
          >
            <option value="name">Sort: Name</option>
            <option value="date">Sort: Last modified</option>
            <option value="size">Sort: File size</option>
          </select>
        </div>
      </div>

      {/* Content Area Presentation */}
      {viewMode === 'grid' ? (
        /* Grid cards: Auto-fill, min 180px, 8px gap. Radius: 8px, 1px --outline-variant border, NO shadows */
        <div>
          {loading && filteredItems.length === 0 ? (
            <div className="py-24 text-center text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              <FaSpinner className="animate-spin inline mr-2" style={{ color: 'var(--primary)' }} /> Loading files...
            </div>
          ) : filteredItems.length === 0 ? (
            /* Empty state: Centered: simple line illustration + one sentence + one primary CTA button */
            <div className="py-24 text-center flex flex-col items-center justify-center max-w-sm mx-auto">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: 'var(--surface-variant)', border: '1px solid var(--outline-variant)' }}
              >
                <FaFolder size={28} style={{ color: 'var(--on-surface-variant)' }} />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--on-surface)' }}>No files found</p>
              <p className="text-xs mb-6" style={{ color: 'var(--on-surface-variant)' }}>Upload your first file to get started.</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-10 px-6 text-xs font-medium transition-colors"
                style={{
                  borderRadius: '20px',
                  backgroundColor: 'var(--primary)',
                  color: 'var(--on-primary)'
                }}
              >
                Upload your first file
              </button>
            </div>
          ) : (
            <div 
              className="grid gap-2"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))'
              }}
            >
              {filteredItems.map((item, idx) => {
                const isSelected = selectedFiles.includes(item.path);
                const isStarred = starredPaths.includes(item.path);
                const canEdit = isFileEditable(item);
                const indicatorColor = getFileIndicatorColor(item.name, item.type);

                return (
                  <div
                    key={idx}
                    onDoubleClick={() => handleDoubleClick(item)}
                    onClick={() => {
                      setSelectedFiles(prev => prev.includes(item.path) ? prev.filter(p => p !== item.path) : [...prev, item.path]);
                    }}
                    className="relative group p-3 flex flex-col justify-between cursor-pointer select-none transition-colors"
                    style={{
                      borderRadius: '8px',
                      backgroundColor: isSelected ? 'var(--primary-container)' : 'var(--surface)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--outline-variant)',
                      borderLeft: isSelected ? '3px solid var(--primary)' : '1px solid var(--outline-variant)'
                    }}
                  >
                    {/* Top Meta Bar */}
                    <div className="flex items-center justify-between mb-2">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedFiles(prev => prev.includes(item.path) ? prev.filter(p => p !== item.path) : [...prev, item.path]);
                        }}
                        className={`w-4 h-4 rounded cursor-pointer accent-[#1A73E8] ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                      />
                      
                      <div className="flex items-center gap-1">
                        {toggleStar && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleStar(item.path); }}
                            className={`p-1 rounded ${isStarred ? '' : 'opacity-0 group-hover:opacity-100'}`}
                            style={{ color: isStarred ? '#E8710A' : 'var(--on-surface-variant)' }}
                            title={isStarred ? 'Starred' : 'Star file'}
                          >
                            {isStarred ? <FaStar size={12} /> : <FaRegStar size={12} />}
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetailsFile(item); }}
                          className="p-1 rounded opacity-0 group-hover:opacity-100"
                          style={{ color: 'var(--on-surface-variant)' }}
                          title="Options"
                        >
                          <FaEllipsisV size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Icon & File Name */}
                    <div className="py-4 flex flex-col items-center text-center">
                      <div className="mb-2">
                        {getFileIcon(item.name, item.type, 32)}
                      </div>
                      <p 
                        className="text-sm font-medium truncate w-full px-1" 
                        style={{ color: isSelected ? 'var(--on-primary-container)' : 'var(--on-surface)' }}
                        title={item.name}
                      >
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 font-mono text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                        <span>{item.displaySize}</span>
                      </div>
                    </div>

                    {/* Quick Edit shortcut if editable */}
                    {canEdit && onEditFile && (
                      <div className="pt-2 flex justify-end" style={{ borderTop: '1px solid var(--outline-variant)' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditFile(item); }}
                          className="text-[11px] flex items-center gap-1 p-1 hover:underline font-medium"
                          style={{ color: 'var(--primary)' }}
                          title="Edit file"
                        >
                          <FaEdit size={10} /> Edit
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* List rows: 48px height, 16px horizontal padding, 1px bottom border (--outline-variant) */
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
                    checked={filteredItems.length > 0 && filteredItems.every(f => selectedFiles.includes(f.path))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allPaths = Array.from(new Set([...selectedFiles, ...filteredItems.map(f => f.path)]));
                        setSelectedFiles(allPaths);
                      } else {
                        const currentPaths = new Set(filteredItems.map(f => f.path));
                        setSelectedFiles(prev => prev.filter(p => !currentPaths.has(p)));
                      }
                    }}
                    className="w-4 h-4 rounded cursor-pointer accent-[#1A73E8]"
                    title="Select all"
                  />
                </th>
                <th 
                  className="px-4 cursor-pointer hover:bg-black/5 transition-colors select-none"
                  onClick={() => setSortBy && setSortBy('name')}
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
                  className="px-4 hidden md:table-cell cursor-pointer hover:bg-black/5 transition-colors select-none"
                  onClick={() => setSortBy && setSortBy('date')}
                  title="Sort by Last modified"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Last modified</span>
                    {sortBy === 'date' ? (
                      <FaSortDown size={11} style={{ color: 'var(--primary)' }} />
                    ) : (
                      <FaSort size={10} className="opacity-40" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 text-right cursor-pointer hover:bg-black/5 transition-colors select-none"
                  onClick={() => setSortBy && setSortBy('size')}
                  title="Sort by File size"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>File size</span>
                    {sortBy === 'size' ? (
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
              {loading && filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-24 text-center text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                    <FaSpinner className="animate-spin inline mr-2" style={{ color: 'var(--primary)' }} /> Loading files...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                        style={{ backgroundColor: 'var(--surface-variant)', border: '1px solid var(--outline-variant)' }}
                      >
                        <FaFolder size={28} style={{ color: 'var(--on-surface-variant)' }} />
                      </div>
                      <p className="text-sm font-medium mb-1" style={{ color: 'var(--on-surface)' }}>No files found</p>
                      <p className="text-xs mb-6" style={{ color: 'var(--on-surface-variant)' }}>Upload your first file to get started.</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="h-10 px-6 text-xs font-medium transition-colors"
                        style={{
                          borderRadius: '20px',
                          backgroundColor: 'var(--primary)',
                          color: 'var(--on-primary)'
                        }}
                      >
                        Upload your first file
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isSelected = selectedFiles.includes(item.path);
                  const isStarred = starredPaths.includes(item.path);
                  const canEdit = isFileEditable(item);

                  return (
                    <tr 
                      key={idx} 
                      onDoubleClick={() => handleDoubleClick(item)} 
                      onClick={() => {
                        setSelectedFiles(prev => prev.includes(item.path) ? prev.filter(p => p !== item.path) : [...prev, item.path]);
                      }}
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
                            setSelectedFiles(prev => prev.includes(item.path) ? prev.filter(p => p !== item.path) : [...prev, item.path]);
                          }}
                          className={`w-4 h-4 rounded cursor-pointer accent-[#1A73E8] ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                        />
                      </td>

                      {/* File Name + Icon */}
                      <td className="px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {getFileIcon(item.name, item.type, 18)}
                          <span 
                            className="text-sm font-medium truncate max-w-sm sm:max-w-md" 
                            style={{ color: isSelected ? 'var(--on-primary-container)' : 'var(--on-surface)' }}
                            title={item.name}
                          >
                            {item.name}
                          </span>
                        </div>
                      </td>

                      {/* Last Modified Date (Monospace Caption) */}
                      <td className="px-4 text-xs font-mono hidden md:table-cell" style={{ color: 'var(--on-surface-variant)' }}>
                        {item.lastModified ? new Date(item.lastModified).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                      </td>

                      {/* File Size (Monospace) */}
                      <td className="px-4 text-right text-xs font-mono" style={{ color: 'var(--on-surface-variant)' }}>
                        {item.displaySize}
                      </td>

                      {/* Actions: Clean Google Drive style single 3-dots menu button */}
                      <td className="w-12 px-4 text-right">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDetailsFile(item); }}
                          className="w-8 h-8 rounded-full inline-flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
                          style={{ color: 'var(--on-surface-variant)' }}
                          title="More options"
                        >
                          <FaEllipsisV size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AllFiles;
