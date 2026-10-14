import React, { useState, useEffect } from 'react';
import { FaTimes, FaShareAlt, FaCopy, FaCheck, FaLink, FaShieldAlt } from 'react-icons/fa';
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
    toast.success('Share link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-[160] flex items-center justify-center p-4 animate-overlay-in"
      style={{ backgroundColor: 'var(--scrim)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg flex flex-col overflow-hidden elevation-dialog animate-modal-in"
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
            <FaShareAlt size={14} style={{ color: 'var(--primary)' }} />
            <h3 className="font-medium text-sm" style={{ color: 'var(--on-surface)' }}>
              Share link
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

        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--on-surface-variant)' }}>
              File name
            </p>
            <p className="text-sm font-medium truncate" style={{ color: 'var(--on-surface)' }}>
              {file.name}
            </p>
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--on-surface-variant)' }}>
              Encrypted public link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={encrypting ? 'Generating encrypted key...' : shareLink}
                className="flex-1 h-10 px-3 text-xs font-mono outline-none"
                style={{
                  backgroundColor: 'var(--surface-variant)',
                  color: 'var(--on-surface)',
                  borderRadius: '8px',
                  border: '1px solid var(--outline)'
                }}
              />
              <button
                onClick={copyToClipboard}
                disabled={!shareLink || encrypting}
                className="h-10 px-5 text-xs font-medium rounded-full flex items-center gap-2 transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--on-primary)'
                }}
              >
                {copied ? <FaCheck size={12} /> : <FaCopy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
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
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
