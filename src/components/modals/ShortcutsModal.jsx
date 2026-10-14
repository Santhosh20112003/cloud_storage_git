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
    <div 
      className="fixed inset-0 z-[170] flex items-center justify-center p-4 animate-overlay-in" 
      style={{ backgroundColor: 'var(--scrim)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md overflow-hidden elevation-dialog animate-modal-in"
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '12px',
          border: '1px solid var(--outline-variant)',
          color: 'var(--on-surface)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div 
          className="h-14 px-6 flex items-center justify-between"
          style={{
            borderBottom: '1px solid var(--outline-variant)',
            backgroundColor: 'var(--surface-variant)'
          }}
        >
          <div className="flex items-center gap-2.5">
            <FaKeyboard size={14} style={{ color: 'var(--primary)' }} />
            <h3 className="font-medium text-sm" style={{ color: 'var(--on-surface)' }}>
              Keyboard shortcuts
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-[#E8EAED] transition-colors"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            <FaTimes size={14} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {shortcuts.map((s, idx) => (
            <div 
              key={idx} 
              className="flex items-center justify-between py-2"
              style={{ borderBottom: idx === shortcuts.length - 1 ? 'none' : '1px solid var(--outline-variant)' }}
            >
              <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>{s.desc}</span>
              <kbd 
                className="px-2.5 py-1 text-xs font-mono font-medium rounded"
                style={{
                  backgroundColor: 'var(--surface-variant)',
                  border: '1px solid var(--outline)',
                  color: 'var(--on-surface)'
                }}
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div 
          className="px-6 py-3.5 flex justify-end"
          style={{
            borderTop: '1px solid var(--outline-variant)',
            backgroundColor: 'var(--surface-variant)'
          }}
        >
          <button
            onClick={onClose}
            className="h-9 px-5 text-xs font-medium rounded-full cursor-pointer hover:bg-white"
            style={{
              border: '1px solid var(--outline)',
              color: 'var(--on-surface)'
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
