import React, { useState, useEffect } from 'react';
import { FaTimes, FaShareAlt, FaCopy, FaCheck, FaLink, FaShieldAlt, FaLock, FaSpinner } from 'react-icons/fa';
import { encryptAndMinifySharePayload } from '../../config/shareCrypto';
import toast from 'react-hot-toast';

const ShareModal = ({ isOpen, onClose, file, githubUsername, repository, githubToken }) => {
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [encrypting, setEncrypting] = useState(false);

  useEffect(() => {
    if (!isOpen || !file || !githubUsername || !repository || !githubToken) return;

    const generateEncryptedMinifiedLink = async () => {
      setEncrypting(true);
      try {
        const payload = {
          name: file.name,
          path: file.path,
          owner: githubUsername,
          repo: repository,
          size: file.size || 0,
          token: githubToken,
          isChunked: Boolean(file.isChunked),
          isCompressed: Boolean(file.isCompressed),
          chunkPaths: Array.isArray(file.chunkPaths) ? file.chunkPaths : [],
          mimeType: file.mimeType || '',
          createdAt: Date.now()
        };

        // AES-GCM 256-bit encryption + Deflate Stream minification
        const encryptedToken = await encryptAndMinifySharePayload(payload);
        const fullUrl = `${window.location.origin}/share/${encryptedToken}`;
        setShareLink(fullUrl);
      } catch (err) {
        console.error('Error generating encrypted share token:', err);
        toast.error('Failed to create encrypted link.');
      } finally {
        setEncrypting(false);
      }
    };

    generateEncryptedMinifiedLink();
  }, [isOpen, file, githubUsername, repository, githubToken]);

  if (!isOpen || !file) return null;

  const copyToClipboard = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success('Encrypted share link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[160] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#161b22] text-[#24292e] dark:text-[#c9d1d9] border border-[#e1e4e8] dark:border-[#30363d] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e1e4e8] dark:border-[#30363d] flex items-center justify-between bg-[#fafbfc] dark:bg-[#0d1117]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-[#0366d6] dark:text-[#58a6ff] rounded-xl">
              <FaShareAlt size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#24292e] dark:text-white">Encrypted Share Link</h3>
              <p className="text-xs text-[#586069] dark:text-[#8b949e] truncate max-w-sm">{file.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#f3f4f6] dark:hover:bg-[#21262d] rounded-md text-[#586069] dark:text-[#8b949e] transition-colors"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Security badge notice */}
        <div className="px-6 py-3 bg-emerald-50/60 dark:bg-emerald-950/20 border-b border-emerald-200/50 dark:border-emerald-900/30 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <FaShieldAlt className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            Protected with <strong>AES-256-GCM + Deflate Minification</strong>. Keeps your GitHub repo private and token shielded.
          </span>
        </div>

        {/* Body Link Box */}
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#586069] dark:text-[#8b949e] uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <FaLock className="text-[#0366d6]" /> Minified & Encrypted URL
            </label>

            {encrypting ? (
              <div className="py-4 text-center text-xs text-[#586069] dark:text-[#8b949e]">
                <FaSpinner className="animate-spin inline mr-2 text-[#0366d6]" /> Compressing & Encrypting token...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareLink}
                  className="flex-1 px-3 py-2.5 text-xs font-mono bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#e1e4e8] dark:border-[#30363d] rounded-xl select-all outline-none text-[#24292e] dark:text-[#c9d1d9] focus:border-[#0366d6]"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2.5 bg-[#0366d6] hover:bg-[#0256b4] text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors shrink-0 shadow-xs cursor-pointer"
                >
                  {copied ? <FaCheck /> : <FaCopy />} {copied ? 'Copied' : 'Copy Link'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#e1e4e8] dark:border-[#30363d] bg-[#fafbfc] dark:bg-[#0d1117] flex justify-between items-center text-xs text-[#586069] dark:text-[#8b949e]">
          <span>Length minified using Deflate compression</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#f6f8fa] dark:bg-[#21262d] hover:bg-[#e1e4e8] dark:hover:bg-[#30363d] border border-[#e1e4e8] dark:border-[#30363d] rounded-lg font-medium transition-colors text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
