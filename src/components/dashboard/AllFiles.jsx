import React from 'react';
import { 
  FaArrowLeft, FaTrash, FaFolderPlus, FaUpload, 
  FaSearch, FaSpinner, FaFolder, FaEllipsisV 
} from 'react-icons/fa';

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
  activeView
}) => {
  return (
    <div className="bg-white border border-[#e1e4e8] rounded shadow-sm overflow-visible">
      <div className="px-2 sm:px-4 md:px-6 py-4 flex flex-col gap-4 border-b border-[#e1e4e8] bg-[#fafbfc] rounded-t">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-3">
            {currentPath && (
              <button onClick={() => {
                const parts = currentPath.split('/'); parts.pop(); setCurrentPath(parts.join('/'));
              }} className="p-1.5 text-[#586069] hover:bg-[#f3f4f6] rounded transition-colors"><FaArrowLeft size={12} /></button>
            )}
            <span className="text-sm font-semibold">{activeView === 'dashboard' ? 'Recent Files' : `/ ${currentPath || 'Root'}`}</span>
          </div>
          <div className="flex gap-2">
            {selectedFiles.length > 0 && (
              <button onClick={handleDelete} className="px-3 py-1.5 bg-white border border-[#d73a49] text-[#d73a49] text-xs font-semibold rounded hover:bg-[#feeef0] flex items-center gap-2 transition-colors"><FaTrash /> Delete</button>
            )}
            <>
              <button onClick={handleCreateFolder} className="px-3 py-1.5 bg-white border border-[#e1e4e8] text-[#24292e] text-xs font-semibold rounded hover:bg-[#f3f4f6] flex items-center gap-2 transition-colors"><FaFolderPlus /> New Folder</button>
              <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-[#2ea44f] text-white text-xs font-semibold rounded border border-[#2c974b] hover:bg-[#2c974b] flex items-center gap-2 transition-colors"><FaUpload /> Upload</button>
            </>
          </div>
        </div>
        
        {/* Search and Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2">
          <div className="relative flex-1 min-w-[200px]">
            <input 
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#e1e4e8] rounded-lg text-sm focus:ring-2 focus:ring-[#0366d6]/20 focus:border-[#0366d6] outline-none transition-all"
            />
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#959da5]" size={14} />
          </div>
          
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#e1e4e8] rounded-lg text-xs font-medium text-[#586069] outline-none hover:border-[#0366d6] transition-colors cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="pdf">PDFs</option>
            <option value="doc">Documents</option>
          </select>

          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#e1e4e8] rounded-lg text-xs font-medium text-[#586069] outline-none hover:border-[#0366d6] transition-colors cursor-pointer"
          >
            <option value="name">Sort by Name</option>
            <option value="date">Sort by Recent</option>
            <option value="size">Sort by Size</option>
          </select>
        </div>
      </div>

        <div className="overflow-x-auto w-full">
          <table className="min-w-[500px] w-full text-left text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-[#fafbfc] border-b border-[#e1e4e8] text-[#586069]">
                <th className="px-6 py-3 font-semibold text-xs w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-[#e1e4e8]" 
                    onChange={(e) => setSelectedFiles(e.target.checked ? filteredItems.map(i => i.path) : [])} 
                    checked={filteredItems.length > 0 && selectedFiles.length === filteredItems.length} 
                  />
                </th>
                <th className="px-6 py-3 font-semibold text-xs">Name</th>
                <th className="px-6 py-3 font-semibold text-xs text-right">Size</th>
                <th className="px-6 py-3 font-semibold text-xs text-right w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e4e8]">
              {loading && filteredItems.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-8 text-center text-[#586069]"><FaSpinner className="animate-spin inline mr-2" /> Initializing storage...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-12 text-center text-[#586069]">
                  <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
                    <FaFolder size={32} className="text-[#e1e4e8]" />
                    <p>No files found in this directory.</p>
                  </div>
                </td></tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr 
                    key={idx} 
                    onDoubleClick={() => handleDoubleClick(item)} 
                    className={`hover:bg-[#f6f8fbb0] group cursor-pointer transition-colors duration-150 ${selectedFiles.includes(item.path) ? 'bg-[#f1f8ff]' : ''}`}
                  >
                    <td className="px-4 sm:px-6 py-3">
                      <input 
                        type="checkbox" 
                        className="rounded border-[#e1e4e8] transition-all group-hover:border-[#0366d6]" 
                        checked={selectedFiles.includes(item.path)} 
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedFiles(prev => prev.includes(item.path) ? prev.filter(p => p !== item.path) : [...prev, item.path]);
                        }} 
                      />
                    </td>
                    <td className="px-4 sm:px-6 py-3 min-w-0 max-w-xs">
                      <div className="flex items-center gap-3 transition-transform duration-200 group-hover:translate-x-1 min-w-0">
                        {getFileIcon(item.name, item.type)}
                        <span className={item.type === 'dir' ? 'text-[#0366d6] font-medium hover:underline break-all' : 'text-[#24292e] break-all truncate max-w-[120px] sm:max-w-[200px] md:max-w-[300px]'} title={item.name}>{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-right text-[#586069] text-xs font-medium whitespace-nowrap">
                      {item.displaySize}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDetailsFile(item); }}
                        className="p-2 hover:bg-[#e1e4e8] rounded-full text-[#586069] transition-colors"
                      >
                        <FaEllipsisV size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>
    </div>
  );
};

export default AllFiles;
