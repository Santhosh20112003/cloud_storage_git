import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { FaSave, FaTimes, FaSpinner, FaCode } from 'react-icons/fa';

const EXT_TO_LANG = {
  js:'javascript', jsx:'javascript', ts:'typescript', tsx:'typescript',
  py:'python', java:'java', cs:'csharp', cpp:'cpp', c:'c', h:'c',
  rs:'rust', go:'go', rb:'ruby', php:'php', swift:'swift', kt:'kotlin',
  html:'html', css:'css', scss:'scss', sass:'scss', less:'less',
  json:'json', yaml:'yaml', yml:'yaml', xml:'xml', sql:'sql',
  sh:'shell', bash:'shell', zsh:'shell', ps1:'powershell', bat:'bat', cmd:'bat',
  dockerfile:'dockerfile', toml:'toml', ini:'ini', env:'shell',
  md:'markdown', txt:'plaintext', log:'plaintext',
  vue:'html', svelte:'html', svg:'xml', csv:'plaintext', tsv:'plaintext'
};

const CodeEditorModal = ({ file, isOpen, onClose, onSave, saving, initialContent = '' }) => {
  const [content, setContent] = useState(initialContent || '');

  // Crucial: Update content whenever initialContent or file changes
  useEffect(() => {
    if (isOpen && initialContent !== undefined) {
      setContent(initialContent || '');
    }
  }, [isOpen, initialContent, file]);

  if (!isOpen || !file) return null;

  const ext = file.name.split('.').pop()?.toLowerCase();
  const language = EXT_TO_LANG[ext] || 'plaintext';

  const handleSave = () => {
    onSave(content);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[180] flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-[#161b22] w-full max-w-5xl h-[90vh] flex flex-col rounded-xl border border-[#e1e4e8] dark:border-[#30363d] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Editor Top Bar */}
        <div className="h-13 px-4 sm:px-6 flex items-center justify-between border-b border-[#e1e4e8] dark:border-[#30363d] bg-[#fafbfc] dark:bg-[#0d1117]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-[#0366d6] dark:text-[#58a6ff] rounded-md shrink-0">
              <FaCode size={15} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#24292e] dark:text-white truncate max-w-[200px] sm:max-w-md">
                  {file.name}
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#e1e4e8] dark:bg-[#30363d] text-[#586069] dark:text-[#8b949e]">
                  {language}
                </span>
              </div>
              <p className="text-[10px] text-[#586069] dark:text-[#8b949e] font-mono truncate">{file.path}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              disabled={saving}
              className="px-3 py-1.5 bg-white dark:bg-[#21262d] hover:bg-[#f6f8fa] dark:hover:bg-[#30363d] border border-[#e1e4e8] dark:border-[#30363d] text-[#24292e] dark:text-[#c9d1d9] rounded-lg text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-[#2ea44f] hover:bg-[#2c974b] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
              {saving ? 'Committing...' : 'Save & Commit'}
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-[#f3f4f6] dark:hover:bg-[#21262d] rounded-md text-[#586069] dark:text-[#8b949e] ml-1"
            >
              <FaTimes size={15} />
            </button>
          </div>
        </div>

        {/* Monaco Editor Container */}
        <div className="flex-1 w-full overflow-hidden bg-[#1e1e1e]">
          <Editor 
            value={content}
            language={language}
            theme="vs-dark"
            onChange={(val) => setContent(val || '')}
            options={{
              minimap: { enabled: true },
              fontSize: 13,
              lineNumbers: 'on',
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              padding: { top: 12, bottom: 12 },
              tabSize: 2
            }}
          />
        </div>

        {/* Editor Status Bottom */}
        <div className="px-4 py-2 bg-[#fafbfc] dark:bg-[#0d1117] border-t border-[#e1e4e8] dark:border-[#30363d] flex items-center justify-between text-[11px] text-[#586069] dark:text-[#8b949e] font-mono">
          <span>Editing via Git Editor API</span>
          <span>Commit will be linked to branch: main</span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditorModal;
