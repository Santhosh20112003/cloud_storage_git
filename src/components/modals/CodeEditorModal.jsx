import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  FaSave, 
  FaTimes, 
  FaSpinner, 
  FaCode, 
  FaCopy, 
  FaCheck,
  FaFileAlt
} from 'react-icons/fa';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import { detectLanguage } from '../FilePreview';
import { formatBytes } from '../../config/commonUtils';

const CodeEditorModal = ({ file, isOpen, onClose, onSave, saving, initialContent = '' }) => {
  const [content, setContent] = useState(initialContent || '');
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isOpen && initialContent !== undefined) {
      setContent(initialContent || '');
    }
  }, [isOpen, initialContent, file]);

  if (!isOpen || !file) return null;

  const language = detectLanguage(file.name, content);

  const handleSave = () => {
    onSave(content);
  };

  const copyContent = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullscreen = () => {
    if (!fullscreen) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
    setFullscreen(f => !f);
  };

  return (
    <div 
      className="fixed inset-0 z-[180] flex items-center justify-center sm:p-4 select-none animate-overlay-in" 
      style={{ backgroundColor: 'var(--scrim)' }}
      onClick={onClose}
    >
      <div 
        ref={containerRef}
        className="w-full h-full sm:max-w-[95vw] sm:max-h-[95vh] flex flex-col sm:rounded-xl overflow-hidden elevation-dialog animate-modal-in"
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '12px',
          border: '1px solid var(--outline-variant)',
          color: 'var(--on-surface)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Unified Top Header matching FilePreview */}
        <div 
          className="h-14 px-6 flex items-center justify-between shrink-0"
          style={{
            borderBottom: '1px solid var(--outline-variant)',
            backgroundColor: 'var(--surface-variant)'
          }}
        >
          {/* File Meta Info */}
          <div className="flex items-center gap-3 min-w-0">
            <span style={{ color: 'var(--primary)' }} className="shrink-0 text-sm">
              <FaCode size={15} />
            </span>
            <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-lg" style={{ color: 'var(--on-surface)' }}>
              {file.name}
            </span>
            <span 
              className="hidden sm:inline text-[11px] px-2 py-0.5 rounded font-mono uppercase tracking-wider shrink-0"
              style={{
                backgroundColor: 'var(--outline-variant)',
                color: 'var(--on-surface-variant)'
              }}
            >
              {language}
            </span>
            {file.size > 0 && (
              <span className="hidden sm:inline text-xs font-mono shrink-0" style={{ color: 'var(--on-surface-variant)' }}>
                {formatBytes(file.size)}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Primary Action Button: Commit change */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-8 px-4 text-xs font-medium rounded-full flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)'
              }}
            >
              {saving ? <FaSpinner className="animate-spin" size={11} /> : <FaSave size={11} />}
              <span>{saving ? 'Saving...' : 'Commit change'}</span>
            </button>

            {/* Copy button */}
            <button
              onClick={copyContent}
              title="Copy code"
              className="p-2 rounded-full hover:bg-[#E8EAED] transition-colors cursor-pointer"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              {copied ? <FaCheck size={13} className="text-green-600" /> : <FaCopy size={13} />}
            </button>

            {/* Fullscreen button */}
            <button 
              onClick={toggleFullscreen} 
              title="Fullscreen"
              className="p-2 rounded-full hover:bg-[#E8EAED] transition-colors cursor-pointer"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              {fullscreen ? <MdFullscreenExit size={16}/> : <MdFullscreen size={16}/>}
            </button>

            <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--outline-variant)' }} />

            {/* Close button */}
            <button 
              onClick={onClose} 
              title="Close editor"
              className="p-2 rounded-full hover:bg-[#E8EAED] transition-colors cursor-pointer"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              <FaTimes size={14} />
            </button>
          </div>
        </div>

        {/* Monaco Editor in Light Theme */}
        <div className="flex-1 w-full overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
          <Editor
            height="100%"
            language={language}
            value={content}
            theme="vs-light"
            onChange={(val) => setContent(val || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
              padding: { top: 14, bottom: 14 },
              renderLineHighlight: 'all',
              smoothScrolling: true
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CodeEditorModal;
