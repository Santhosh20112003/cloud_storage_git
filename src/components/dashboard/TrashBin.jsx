import React, { useState, useMemo } from 'react';
import { FaTrash, FaUndo, FaTrashAlt, FaFolder, FaInfoCircle, FaSpinner, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { getFileIcon, getFileIndicatorColor } from '../fileIndicators';

const TrashBin = ({ 
  trashItems = [], 
  loading, 
  onRestore, 
  onPermanentDelete, 
  onEmptyTrash
}) => {
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'name' | 'size'

  // Sort trash items
  const sortedTrashItems = useMemo(() => {
    const items = [...trashItems];
    if (sortBy === 'name') {
      return items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    if (sortBy === 'size') {
      return items.sort((a, b) => (b.size || 0) - (a.size || 0));
    }
    // Default: 'date' (last deleted / modified)
    return items.sort((a, b) => {
      const timeA = new Date(a.deletedAt || a.lastModified || 0).getTime();
      const timeB = new Date(b.deletedAt || b.lastModified || 0).getTime();
      return timeB - timeA;
    });
  }, [trashItems, sortBy]);

  return (
    <div 
      className="w-full flex flex-col"
      style={{
        backgroundColor: 'var(--surface)',
        color: 'var(--on-surface)'
      }}
    >
      {/* Header and Controls */}
      <div 
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4"
        style={{ borderBottom: '1px solid var(--outline-variant)' }}
      >
        <div>
          <h2 className="text-lg font-medium" style={{ color: 'var(--on-surface)' }}>
            Trash Bin
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
            Items in trash can be restored back to Drive or permanently erased from Git storage.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {trashItems.length > 0 && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-8 px-3 text-xs font-medium outline-none cursor-pointer rounded-full"
              style={{
                backgroundColor: 'var(--surface)',
                color: 'var(--on-surface-variant)',
                border: '1px solid var(--outline)'
              }}
            >
              <option value="date">Sort: Deleted date</option>
              <option value="name">Sort: Name</option>
              <option value="size">Sort: File size</option>
            </select>
          )}

          {trashItems.length > 0 && (
            <button
              onClick={onEmptyTrash}
              className="h-8 px-4 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
              style={{
                borderRadius: '20px',
                backgroundColor: 'var(--error)',
                color: '#FFFFFF'
              }}
            >
              <FaTrashAlt size={11} /> Empty trash
            </button>
          )}
        </div>
      </div>

      {/* Notice Banner */}
      <div 
        className="p-3 mb-4 rounded-lg flex items-center gap-2.5 text-xs"
        style={{
          backgroundColor: 'var(--surface-variant)',
          border: '1px solid var(--outline-variant)',
          color: 'var(--on-surface-variant)'
        }}
      >
        <FaInfoCircle size={14} style={{ color: 'var(--primary)' }} />
        <span>Deleted files are preserved in your Git repository's <code className="font-mono text-[11px] px-1 py-0.5 bg-white rounded border border-[#DADCE0]">.trash</code> recovery tree until purged.</span>
      </div>

      {/* Table rows: 48px height, 16px horizontal padding, 1px bottom border */}
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
              <th className="w-10 px-4"></th>
              <th 
                className="px-4 cursor-pointer hover:bg-black/5 transition-colors select-none"
                onClick={() => setSortBy('name')}
                title="Sort by Name"
              >
                <div className="flex items-center gap-1.5">
                  <span>Item Name</span>
                  {sortBy === 'name' ? (
                    <FaSortUp size={11} style={{ color: 'var(--primary)' }} />
                  ) : (
                    <FaSort size={10} className="opacity-40" />
                  )}
                </div>
              </th>
              <th 
                className="px-4 hidden md:table-cell cursor-pointer hover:bg-black/5 transition-colors select-none"
                onClick={() => setSortBy('date')}
                title="Sort by Deleted date"
              >
                <div className="flex items-center gap-1.5">
                  <span>Deleted Date</span>
                  {sortBy === 'date' ? (
                    <FaSortDown size={11} style={{ color: 'var(--primary)' }} />
                  ) : (
                    <FaSort size={10} className="opacity-40" />
                  )}
                </div>
              </th>
              <th 
                className="px-4 text-right cursor-pointer hover:bg-black/5 transition-colors select-none"
                onClick={() => setSortBy('size')}
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
              <th className="w-48 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="py-24 text-center text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                  <FaSpinner className="animate-spin inline mr-2" style={{ color: 'var(--primary)' }} /> Checking recovery bin...
                </td>
              </tr>
            ) : sortedTrashItems.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-24 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                      style={{ backgroundColor: 'var(--surface-variant)', border: '1px solid var(--outline-variant)' }}
                    >
                      <FaTrash size={24} style={{ color: 'var(--on-surface-variant)' }} />
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Trash is empty</p>
                    <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>No deleted files pending recovery.</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedTrashItems.map((item, idx) => {
                const indicatorColor = getFileIndicatorColor(item.name, item.type);

                return (
                  <tr 
                    key={idx}
                    className="hover:bg-[#F8F9FA] transition-colors"
                    style={{
                      height: '48px',
                      borderBottom: '1px solid var(--outline-variant)'
                    }}
                  >
                    <td className="px-4 w-10">
                      <div 
                        className="w-1 h-6 rounded-full" 
                        style={{ backgroundColor: indicatorColor }}
                      />
                    </td>
                    <td className="px-4">
                      <div className="flex items-center gap-3">
                        {getFileIcon(item.name, item.type, 16)}
                        <span className="text-sm font-medium truncate max-w-xs" style={{ color: 'var(--on-surface)' }}>
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 text-xs font-mono hidden md:table-cell truncate max-w-xs" style={{ color: 'var(--on-surface-variant)' }}>
                      {item.originalPath || item.path}
                    </td>
                    <td className="px-4 text-right text-xs font-mono" style={{ color: 'var(--on-surface-variant)' }}>
                      {item.displaySize || '—'}
                    </td>
                    <td className="px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onRestore(item)}
                          className="h-8 px-3 text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors cursor-pointer hover:bg-[#F8F9FA]"
                          style={{
                            border: '1px solid var(--outline)',
                            color: 'var(--success)'
                          }}
                        >
                          <FaUndo size={10} /> Restore
                        </button>
                        <button
                          onClick={() => onPermanentDelete(item)}
                          className="h-8 px-3 text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors cursor-pointer hover:bg-[#F8F9FA]"
                          style={{
                            border: '1px solid var(--outline)',
                            color: 'var(--error)'
                          }}
                        >
                          <FaTrashAlt size={10} /> Purge
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
    </div>
  );
};

export default TrashBin;
