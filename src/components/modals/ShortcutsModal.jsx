import React from 'react';
import { FaTimes, FaKeyboard } from 'react-icons/fa';

const ShortcutsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + U', desc: 'Trigger file upload dialog' },
    { key: 'Ctrl + F', desc: 'Focus drive search bar' },
    { key: 'Del / Backspace', desc: 'Delete selected files' },
    { key: 'Ctrl + K', desc: 'Toggle keyboard shortcuts menu' },
    { key: 'Esc', desc: 'Close any active modal or file preview' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[170] flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-[#161b22] text-[#24292e] dark:text-[#c9d1d9] border border-[#e1e4e8] dark:border-[#30363d] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#e1e4e8] dark:border-[#30363d] flex items-center justify-between bg-[#fafbfc] dark:bg-[#0d1117]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-[#0366d6] dark:text-[#58a6ff] rounded-md">
              <FaKeyboard size={14} />
            </div>
            <h3 className="font-semibold text-sm">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#586069] dark:text-[#8b949e] hover:bg-[#f3f4f6] dark:hover:bg-[#21262d] rounded">
            <FaTimes size={15} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between py-1.5 border-b border-[#e1e4e8]/50 dark:border-[#30363d]/50 last:border-0">
              <span className="text-xs text-[#586069] dark:text-[#8b949e]">{s.desc}</span>
              <kbd className="px-2 py-1 bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#e1e4e8] dark:border-[#30363d] text-[#24292e] dark:text-white rounded-md text-[11px] font-mono font-semibold shadow-2xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-[#e1e4e8] dark:border-[#30363d] bg-[#fafbfc] dark:bg-[#0d1117] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0366d6] text-white text-xs font-semibold rounded-lg hover:bg-[#0256b4] transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
