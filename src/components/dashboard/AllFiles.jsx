import React from 'react';
import { 
  FaArrowLeft, FaTrash, FaFolderPlus, FaUpload, 
  FaSearch, FaSpinner, FaFolder, FaEllipsisV,
  FaThLarge, FaList, FaShareAlt, FaHistory, FaStar, FaRegStar, FaEdit
} from 'react-icons/fa';

// List of editable text/code file extensions
const EDITABLE_EXTS = new Set([
  'txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'sass', 'less',
  'py', 'java', 'c', 'cpp', 'h', 'cs', 'rs', 'go', 'php', 'rb', 'swift', 'kt',
  'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd', 'yaml', 'yml', 'xml', 'toml', 'ini',
  'env', 'conf', 'properties', 'sql', 'dockerfile', 'svg', 'log', 'csv', 'tsv'
]);

const isFileEditable = (item) => {
  if (!item || item.type === 'dir') return false;
  const ext = item.name?.split('.').pop()?.toLowerCase();
  return EDITABLE_EXTS.has(ext);
};

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
  getFileIcon, 
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
    <div className="bg-white dark:bg-[#161b22] border border-[#e1e4e8] dark:border-[#30363d] rounded-xl shadow-sm overflow-visible text-[#24292e] dark:text-[#c9d1d9] transition-colors duration-200">
      {/* Top Header & Breadcrumb */}
      <div className="px-4 sm:px-6 py-4 flex flex-col gap-4 border-b border-[#e1e4e8] dark:border-[#30363d] bg-[#fafbfc] dark:bg-[#0d1117] rounded-t-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {currentPath && (
              <button 
                onClick={() => {
                  const parts = currentPath.split('/'); 
                  parts.pop(); 
                  setCurrentPath(parts.join('/'));
                }} 
                className="p-1.5 text-[#586069] dark:text-[#8b949e] hover:bg-[#f3f4f6] dark:hover:bg-[#21262d] rounded-md transition-colors"
                title="Go up"
              >
                <FaArrowLeft size={12} />
              </button>
            )}
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <span 
                className="cursor-pointer hover:text-[#0366d6] dark:hover:text-[#58a6ff] transition-colors"
                onClick={() => setCurrentPath('')}
              >
                {activeView === 'dashboard' ? 'Recent Files' : 'Drive'}
              </span>
              {currentPath && currentPath.split('/').map((folder, idx, arr) => (
                <React.Fragment key={idx}>
                  <span className="text-[#959da5] dark:text-[#6e7681]">/</span>
                  <span 
                    className={`cursor-pointer hover:text-[#0366d6] dark:hover:text-[#58a6ff] transition-colors ${idx === arr.length - 1 ? 'text-[#0366d6] dark:text-[#58a6ff]' : ''}`}
                    onClick={() => {
                      const newPath = arr.slice(0, idx + 1).join('/');
                      setCurrentPath(newPath);
                    }}
                  >
                    {folder}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            {/* View switcher: Grid / List */}
            {setViewMode && (
              <div className="flex items-center bg-[#f0f2f5] dark:bg-[#21262d] rounded-lg p-0.5 border border-[#e1e4e8] dark:border-[#30363d]">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md text-xs transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-[#161b22] text-[#0366d6] dark:text-[#58a6ff] shadow-xs' : 'text-[#586069] dark:text-[#8b949e]'}`}
                  title="List View"
                >
                  <FaList size={13} />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md text-xs transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-[#161b22] text-[#0366d6] dark:text-[#58a6ff] shadow-xs' : 'text-[#586069] dark:text-[#8b949e]'}`}
                  title="Grid View"
                >
                  <FaThLarge size={13} />
                </button>
              </div>
            )}

            {selectedFiles.length > 0 && (
              <button 
                onClick={handleDelete} 
                className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 border border-[#d73a49] text-[#d73a49] text-xs font-semibold rounded-lg hover:bg-[#d73a49] hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <FaTrash size={12} /> Delete ({selectedFiles.length})
              </button>
            )}
            
            <button 
              onClick={handleCreateFolder} 
              className="px-3 py-1.5 bg-white dark:bg-[#21262d] border border-[#e1e4e8] dark:border-[#30363d] hover:border-[#0366d6] text-[#24292e] dark:text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <FaFolderPlus size={12} className="text-[#0366d6] dark:text-[#58a6ff]" /> New Folder
            </button>
            
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="px-3.5 py-1.5 bg-[#2ea44f] hover:bg-[#2c974b] text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FaUpload size={12} /> Upload
            </button>
          </div>
        </div>
        
        {/* Search and Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
          <div className="relative flex-1 min-w-[200px]">
            <input 
              type="text"
              placeholder="Search files and folders in drive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#0d1117] border border-[#e1e4e8] dark:border-[#30363d] rounded-lg text-xs sm:text-sm text-[#24292e] dark:text-[#c9d1d9] focus:ring-2 focus:ring-[#0366d6]/20 focus:border-[#0366d6] outline-none transition-all placeholder:text-[#959da5] dark:placeholder:text-[#6e7681]"
            />
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#959da5] dark:text-[#6e7681]" size={13} />
          </div>
          
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-[#0d1117] border border-[#e1e4e8] dark:border-[#30363d] rounded-lg text-xs font-medium text-[#586069] dark:text-[#8b949e] outline-none hover:border-[#0366d6] dark:hover:border-[#58a6ff] transition-colors cursor-pointer"
          >
            <option value="all">All File Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="pdf">PDFs</option>
            <option value="doc">Documents</option>
          </select>

          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-[#0d1117] border border-[#e1e4e8] dark:border-[#30363d] rounded-lg text-xs font-medium text-[#586069] dark:text-[#8b949e] outline-none hover:border-[#0366d6] dark:hover:border-[#58a6ff] transition-colors cursor-pointer"
          >
            <option value="name">Sort by Name</option>
            <option value="date">Sort by Recent</option>
            <option value="size">Sort by Size</option>
          </select>
        </div>
      </div>

      {/* Main Files Presentation: Grid or List */}
      {viewMode === 'grid' ? (
        <div className="p-4 sm:p-6 min-h-[300px]">
          {loading && filteredItems.length === 0 ? (
            <div className="py-20 text-center text-[#586069] dark:text-[#8b949e]">
              <FaSpinner className="animate-spin inline mr-2 text-[#0366d6]" /> Syncing files from Git...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 text-center text-[#586069] dark:text-[#8b949e]">
              <FaFolder size={44} className="mx-auto mb-3 opacity-30 text-[#0366d6]" />
              <p className="font-semibold text-sm">No files or folders found</p>
              <p className="text-xs mt-1">Upload a file or drag and drop items here to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {filteredItems.map((item, idx) => {
                const isSelected = selectedFiles.includes(item.path);
                const isStarred = starredPaths.includes(item.path);
                const canEdit = isFileEditable(item);

                return (
                  <div
                    key={idx}
                    onDoubleClick={() => handleDoubleClick(item)}
                    className={`relative group bg-[#f6f8fa] dark:bg-[#0d1117]/60 border rounded-xl p-3 flex flex-col justify-between hover:border-[#0366d6] dark:hover:border-[#58a6ff] hover:shadow-md cursor-pointer transition-all duration-150 select-none ${
                      isSelected 
                        ? 'border-[#0366d6] bg-blue-50/50 dark:bg-blue-950/30' 
                        : 'border-[#e1e4e8] dark:border-[#30363d]'
                    }`}
                  >
                    {/* Top Row: checkbox and favorite */}
                    <div className="flex items-center justify-between mb-2">
                      <input 
                        type="checkbox" 
                        className="rounded border-[#e1e4e8] dark:border-[#30363d] cursor-pointer"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedFiles(prev => prev.includes(item.path) ? prev.filter(p => p !== item.path) : [...prev, item.path]);
                        }}
                      />
                      {toggleStar && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStar(item.path); }}
                          className={`p-1 rounded hover:bg-white dark:hover:bg-[#21262d] transition-colors ${isStarred ? 'text-amber-500' : 'text-[#959da5] dark:text-[#6e7681] opacity-0 group-hover:opacity-100'}`}
                          title={isStarred ? 'Remove from Starred' : 'Add to Starred'}
                        >
                          {isStarred ? <FaStar size={13} /> : <FaRegStar size={13} />}
                        </button>
                      )}
                    </div>

                    {/* Icon / Preview Center */}
                    <div className="flex flex-col items-center justify-center py-4">
                      <div className="text-3xl mb-2 transition-transform group-hover:scale-110 duration-200">
                        {getFileIcon(item.name, item.type)}
                      </div>
                      <p className="text-xs font-semibold text-center truncate max-w-full px-1 text-[#24292e] dark:text-white" title={item.name}>
                        {item.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#586069] dark:text-[#8b949e]">
                        <span>{item.displaySize}</span>
                        {item.repoName && (
                          <span className="bg-[#e1e4e8] dark:bg-[#30363d] px-1 py-0.2 rounded font-mono text-[9px]">
                            {item.repoName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Bottom */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#e1e4e8]/60 dark:border-[#30363d]/60 mt-2">
                      <div className="flex items-center gap-1">
                        {canEdit && onEditFile && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onEditFile(item); }}
                            className="p-1 hover:text-[#2ea44f] text-[#586069] dark:text-[#8b949e] rounded transition-colors"
                            title="Edit File"
                          >
                            <FaEdit size={11} className="text-[#2ea44f]" />
                          </button>
                        )}
                        {item.type !== 'dir' && onOpenShare && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onOpenShare(item); }}
                            className="p-1 hover:text-[#0366d6] dark:hover:text-[#58a6ff] text-[#586069] dark:text-[#8b949e] rounded transition-colors"
                            title="Share Link"
                          >
                            <FaShareAlt size={11} />
                          </button>
                        )}
                        {item.type !== 'dir' && onOpenHistory && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onOpenHistory(item); }}
                            className="p-1 hover:text-[#0366d6] dark:hover:text-[#58a6ff] text-[#586069] dark:text-[#8b949e] rounded transition-colors"
                            title="Git Commit History"
                          >
                            <FaHistory size={11} />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailsFile(item); }}
                        className="p-1 hover:bg-[#e1e4e8] dark:hover:bg-[#21262d] rounded-full text-[#586069] dark:text-[#8b949e] transition-colors"
                        title="More details"
                      >
                        <FaEllipsisV size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Table / List View */
        <div className="overflow-x-auto w-full">
          <table className="min-w-[600px] w-full text-left text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-[#fafbfc] dark:bg-[#0d1117] border-b border-[#e1e4e8] dark:border-[#30363d] text-[#586069] dark:text-[#8b949e]">
                <th className="px-4 sm:px-6 py-3 font-semibold text-xs w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-[#e1e4e8] dark:border-[#30363d]" 
                    onChange={(e) => setSelectedFiles(e.target.checked ? filteredItems.map(i => i.path) : [])} 
                    checked={filteredItems.length > 0 && selectedFiles.length === filteredItems.length} 
                  />
                </th>
                <th className="px-2 py-3 font-semibold text-xs w-8"></th>
                <th className="px-4 py-3 font-semibold text-xs">Name</th>
                <th className="px-4 py-3 font-semibold text-xs hidden md:table-cell">Last Modified</th>
                <th className="px-4 py-3 font-semibold text-xs text-right">Size</th>
                <th className="px-4 sm:px-6 py-3 font-semibold text-xs text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e4e8] dark:divide-[#30363d]">
              {loading && filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-[#586069] dark:text-[#8b949e]">
                    <FaSpinner className="animate-spin inline mr-2 text-[#0366d6]" /> Syncing files from Git...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-[#586069] dark:text-[#8b949e]">
                    <div className="flex flex-col items-center gap-2">
                      <FaFolder size={36} className="text-[#0366d6] opacity-30" />
                      <p className="font-semibold text-sm">No files found in this directory</p>
                      <p className="text-xs">Drag and drop files to upload directly.</p>
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
                      className={`hover:bg-[#f6f8fbb0] dark:hover:bg-[#21262d]/50 group cursor-pointer transition-colors duration-150 ${
                        isSelected ? 'bg-[#f1f8ff] dark:bg-[#1f2937]/50' : ''
                      }`}
                    >
                      <td className="px-4 sm:px-6 py-3">
                        <input 
                          type="checkbox" 
                          className="rounded border-[#e1e4e8] dark:border-[#30363d] transition-all" 
                          checked={isSelected} 
                          onChange={(e) => {
                            e.stopPropagation();
                            setSelectedFiles(prev => prev.includes(item.path) ? prev.filter(p => p !== item.path) : [...prev, item.path]);
                          }} 
                        />
                      </td>
                      <td className="px-2 py-3">
                        {toggleStar && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleStar(item.path); }}
                            className={`p-1 rounded transition-colors ${isStarred ? 'text-amber-500' : 'text-[#959da5] dark:text-[#6e7681] opacity-0 group-hover:opacity-100'}`}
                            title={isStarred ? 'Starred' : 'Star file'}
                          >
                            {isStarred ? <FaStar size={13} /> : <FaRegStar size={13} />}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-0 max-w-xs">
                        <div className="flex items-center gap-3 transition-transform duration-200 group-hover:translate-x-1 min-w-0">
                          {getFileIcon(item.name, item.type)}
                          <span 
                            className={item.type === 'dir' ? 'text-[#0366d6] dark:text-[#58a6ff] font-medium hover:underline break-all' : 'text-[#24292e] dark:text-white break-all truncate max-w-[140px] sm:max-w-[220px] md:max-w-[320px]'} 
                            title={item.name}
                          >
                            {item.name}
                          </span>
                          {item.repoName && (
                            <span className="hidden sm:inline-block text-[9px] bg-[#f0f3f6] dark:bg-[#21262d] text-[#586069] dark:text-[#8b949e] border border-[#e1e4e8] dark:border-[#30363d] px-1.5 py-0.5 rounded font-mono shrink-0">
                              {item.repoName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#586069] dark:text-[#8b949e] hidden md:table-cell whitespace-nowrap">
                        {item.lastModified ? new Date(item.lastModified).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-[#586069] dark:text-[#8b949e] text-xs font-medium whitespace-nowrap">
                        {item.displaySize}
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && onEditFile && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onEditFile(item); }}
                              className="p-1.5 hover:bg-[#e1e4e8] dark:hover:bg-[#21262d] rounded text-[#586069] dark:text-[#8b949e] hover:text-[#2ea44f] transition-colors"
                              title="Edit in Editor"
                            >
                              <FaEdit size={12} className="text-[#2ea44f]" />
                            </button>
                          )}
                          {item.type !== 'dir' && onOpenShare && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onOpenShare(item); }}
                              className="p-1.5 hover:bg-[#e1e4e8] dark:hover:bg-[#21262d] rounded text-[#586069] dark:text-[#8b949e] hover:text-[#0366d6] dark:hover:text-[#58a6ff] transition-colors opacity-0 group-hover:opacity-100"
                              title="Share Link"
                            >
                              <FaShareAlt size={12} />
                            </button>
                          )}
                          {item.type !== 'dir' && onOpenHistory && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onOpenHistory(item); }}
                              className="p-1.5 hover:bg-[#e1e4e8] dark:hover:bg-[#21262d] rounded text-[#586069] dark:text-[#8b949e] hover:text-[#0366d6] dark:hover:text-[#58a6ff] transition-colors opacity-0 group-hover:opacity-100"
                              title="Commit History"
                            >
                              <FaHistory size={12} />
                            </button>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDetailsFile(item); }}
                            className="p-1.5 hover:bg-[#e1e4e8] dark:hover:bg-[#21262d] rounded-full text-[#586069] dark:text-[#8b949e] transition-colors"
                            title="File details"
                          >
                            <FaEllipsisV size={13} />
                          </button>
                        </div>
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
