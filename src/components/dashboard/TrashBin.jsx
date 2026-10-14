import React from 'react';
import { FaTrash, FaUndo, FaTrashAlt, FaFolder, FaFileAlt, FaSpinner, FaInfoCircle } from 'react-icons/fa';

const TrashBin = ({ 
  trashItems, 
  loading, 
  onRestore, 
  onPermanentDelete, 
  onEmptyTrash,
  getFileIcon 
}) => {
  return (
    <div className="bg-white dark:bg-[#161b22] border border-[#e1e4e8] dark:border-[#30363d] rounded-xl shadow-sm overflow-hidden text-[#24292e] dark:text-[#c9d1d9]">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-[#e1e4e8] dark:border-[#30363d] bg-[#fafbfc] dark:bg-[#0d1117]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 dark:bg-red-900/30 text-[#d73a49] rounded-lg">
            <FaTrash size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Trash & Recovery Bin</h3>
            <p className="text-xs text-[#586069] dark:text-[#8b949e]">Deleted items can be restored to your storage or permanently purged.</p>
          </div>
        </div>

        {trashItems.length > 0 && (
          <button
            onClick={onEmptyTrash}
            className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 border border-[#d73a49] text-[#d73a49] hover:bg-[#d73a49] hover:text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors"
          >
            <FaTrashAlt /> Empty Trash
          </button>
        )}
      </div>

      {/* Info notice */}
      <div className="px-6 py-2.5 bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-900/30 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
        <FaInfoCircle />
        <span>Items deleted from your drive are preserved in your Git repo's `.trash` recovery layer before being permanently erased.</span>
      </div>

      {/* Items list */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm border-separate border-spacing-0">
          <thead>
            <tr className="bg-[#fafbfc] dark:bg-[#0d1117] border-b border-[#e1e4e8] dark:border-[#30363d] text-[#586069] dark:text-[#8b949e]">
              <th className="px-6 py-3 font-semibold text-xs">Item Name</th>
              <th className="px-6 py-3 font-semibold text-xs">Original Location</th>
              <th className="px-6 py-3 font-semibold text-xs text-right">Size</th>
              <th className="px-6 py-3 font-semibold text-xs text-right w-44">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e1e4e8] dark:divide-[#30363d]">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-[#586069] dark:text-[#8b949e]">
                  <FaSpinner className="animate-spin inline mr-2 text-[#0366d6]" /> Checking recovery bin...
                </td>
              </tr>
            ) : trashItems.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-16 text-center text-[#586069] dark:text-[#8b949e]">
                  <div className="flex flex-col items-center gap-2">
                    <FaTrash size={32} className="opacity-30" />
                    <p className="font-medium text-sm">Trash bin is empty</p>
                    <p className="text-xs">No deleted items are pending recovery.</p>
                  </div>
                </td>
              </tr>
            ) : (
              trashItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#f6f8fa] dark:hover:bg-[#21262d]/50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {getFileIcon ? getFileIcon(item.name, item.type) : <FaFileAlt />}
                      <span className="font-medium truncate max-w-xs">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-xs font-mono text-[#586069] dark:text-[#8b949e] truncate max-w-xs">
                    {item.originalPath || item.path}
                  </td>
                  <td className="px-6 py-3 text-right text-xs text-[#586069] dark:text-[#8b949e]">
                    {item.displaySize || '--'}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onRestore(item)}
                        title="Restore item"
                        className="px-2.5 py-1 bg-white dark:bg-[#21262d] border border-[#e1e4e8] dark:border-[#30363d] hover:border-[#2ea44f] text-[#2ea44f] text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors"
                      >
                        <FaUndo size={11} /> Restore
                      </button>
                      <button
                        onClick={() => onPermanentDelete(item)}
                        title="Delete permanently"
                        className="px-2.5 py-1 bg-white dark:bg-[#21262d] border border-[#e1e4e8] dark:border-[#30363d] hover:border-[#d73a49] text-[#d73a49] text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors"
                      >
                        <FaTrashAlt size={11} /> Erase
                      </button>
                    </div>
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

export default TrashBin;
