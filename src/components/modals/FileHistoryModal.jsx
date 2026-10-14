import React, { useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { FaTimes, FaHistory, FaSpinner, FaDownload, FaGitAlt, FaUserCircle, FaCalendarAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { decompressBlobLossless } from '../../config/smartSlicer';

const FileHistoryModal = ({ isOpen, onClose, file, githubUsername, repository, githubToken }) => {
  const [downloadingSha, setDownloadingSha] = useState(null);

  const { data: commits = [], isLoading: loading, isError } = useQuery({
    queryKey: ['file-history', repository, file?.path],
    queryFn: async () => {
      const response = await axios.get(
        `https://api.github.com/repos/${githubUsername}/${repository}/commits`,
        {
          params: { path: file.path, per_page: 30 },
          headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' }
        }
      );
      return response.data || [];
    },
    enabled: Boolean(isOpen && file && file.path && githubToken && githubUsername && repository),
    staleTime: 1000 * 60,
  });

  const handleDownloadVersion = async (commit) => {
    const sha = commit.sha;
    setDownloadingSha(sha);
    const toastId = toast.loading(`Downloading ${file.name} at commit ${sha.substring(0, 7)}...`);

    try {
      // Fetch file content at this specific git commit SHA (ref: sha)
      const res = await axios.get(
        `https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(file.path)}`,
        {
          params: { ref: sha },
          headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.raw' },
          responseType: 'blob'
        }
      );

      let finalBlob = res.data;

      // Check if file is a smart_slicer_manifest JSON blob
      try {
        const textSlice = await finalBlob.slice(0, 500).text();
        if (textSlice.includes('smart_slicer_manifest')) {
          const fullText = await finalBlob.text();
          const parsedManifest = JSON.parse(fullText);

          if (Array.isArray(parsedManifest.chunkPaths) && parsedManifest.chunkPaths.length > 0) {
            toast.loading(`Reassembling ${parsedManifest.chunkPaths.length} chunks from commit ${sha.substring(0, 7)}...`, { id: toastId });
            const chunkBlobs = await Promise.all(
              parsedManifest.chunkPaths.map(async (cPath) => {
                const chunkRes = await axios.get(
                  `https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(cPath)}`,
                  {
                    params: { ref: sha },
                    headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.raw' },
                    responseType: 'blob'
                  }
                );
                return chunkRes.data;
              })
            );
            finalBlob = new Blob(chunkBlobs, { type: parsedManifest.mimeType || 'application/octet-stream' });
          }

          if (parsedManifest.isCompressed) {
            finalBlob = await decompressBlobLossless(finalBlob);
          }
        }
      } catch (manifestErr) {
        // Not a manifest or fallback
      }

      // If file metadata says compressed and not already decompressed via manifest
      if (file.isCompressed && !(finalBlob.type && !finalBlob.type.includes('gzip'))) {
        try {
          finalBlob = await decompressBlobLossless(finalBlob);
        } catch (e) {}
      }

      // Trigger download
      const downloadUrl = window.URL.createObjectURL(finalBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Format filename with commit short-sha for clarity
      const dotIndex = file.name.lastIndexOf('.');
      const versionFileName = dotIndex > 0 
        ? `${file.name.substring(0, dotIndex)}_${sha.substring(0, 7)}${file.name.substring(dotIndex)}`
        : `${file.name}_${sha.substring(0, 7)}`;

      link.setAttribute('download', versionFileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`Downloaded version ${sha.substring(0, 7)}`, { id: toastId });
    } catch (err) {
      console.error('Error downloading version:', err);
      toast.error('Failed to download this version: ' + (err.response?.data?.message || err.message), { id: toastId });
    } finally {
      setDownloadingSha(null);
    }
  };

  const error = isError ? 'Could not retrieve commit history for this file.' : null;

  if (!isOpen || !file) return null;

  return (
    <div 
      className="fixed inset-0 z-[160] flex items-center justify-center p-4 animate-overlay-in" 
      style={{ backgroundColor: 'var(--scrim)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden elevation-dialog animate-modal-in"
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '16px',
          border: '1px solid var(--outline-variant)',
          color: 'var(--on-surface)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="h-14 px-6 flex items-center justify-between"
          style={{
            borderBottom: '1px solid var(--outline-variant)',
            backgroundColor: 'var(--surface)'
          }}
        >
          <div className="flex items-center gap-2.5">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--primary-container)', color: 'var(--primary)' }}
            >
              <FaHistory size={14} />
            </div>
            <div>
              <h3 className="font-medium text-sm" style={{ color: 'var(--on-surface)' }}>
                Version history
              </h3>
              <p className="text-[11px] font-mono" style={{ color: 'var(--on-surface-variant)' }}>
                {file.name}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors cursor-pointer"
            style={{ color: 'var(--on-surface-variant)' }}
            title="Close"
          >
            <FaTimes size={13} />
          </button>
        </div>

        {/* Timeline Commits Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="py-20 text-center text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              <FaSpinner className="animate-spin inline mr-2" style={{ color: 'var(--primary)' }} size={16} />
              <span>Fetching Git commit tree...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-xs text-center rounded-lg" style={{ color: 'var(--error)', backgroundColor: '#FCE8E6', border: '1px solid #FAD2CF' }}>
              {error}
            </div>
          ) : commits.length === 0 ? (
            <div className="py-20 text-center text-xs" style={{ color: 'var(--on-surface-variant)' }}>
              No version history records found.
            </div>
          ) : (
            <div className="relative pl-6">
              {/* Continuous vertical timeline connector line */}
              <div 
                className="absolute left-[11px] top-3 bottom-6 w-0.5"
                style={{ backgroundColor: 'var(--outline-variant)' }}
              />

              <div className="space-y-6">
                {commits.map((c, idx) => {
                  const isLatest = idx === 0;
                  const commitDate = c.commit?.author?.date 
                    ? new Date(c.commit.author.date).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })
                    : 'Unknown date';
                  
                  const isDownloadingThis = downloadingSha === c.sha;

                  return (
                    <div key={c.sha || idx} className="relative flex items-start gap-4 group">
                      {/* Timeline Node Point */}
                      <div 
                        className={`absolute -left-6 mt-1.5 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-transform ${isLatest ? 'ring-4 ring-blue-50' : ''}`}
                        style={{
                          backgroundColor: isLatest ? 'var(--primary)' : 'var(--surface)',
                          border: isLatest ? 'none' : '2px solid var(--outline)',
                          color: isLatest ? '#FFFFFF' : 'var(--on-surface-variant)'
                        }}
                      >
                        {isLatest ? (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--outline)' }} />
                        )}
                      </div>

                      {/* Version Card */}
                      <div 
                        className="flex-1 p-3.5 rounded-xl transition-all"
                        style={{
                          backgroundColor: 'var(--surface)',
                          border: isLatest ? '1px solid #D2E3FC' : '1px solid var(--outline-variant)',
                          boxShadow: isLatest ? '0 1px 3px rgba(26,115,232,0.08)' : 'none'
                        }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium" style={{ color: 'var(--on-surface)' }}>
                                {c.commit?.message || 'Update file'}
                              </span>
                              {isLatest && (
                                <span 
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: 'var(--primary-container)',
                                    color: 'var(--primary)'
                                  }}
                                >
                                  Current Version
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>
                              <span className="flex items-center gap-1 font-medium">
                                <FaUserCircle size={11} className="opacity-70" />
                                {c.commit?.author?.name || c.author?.login || 'User'}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-mono">
                                <FaCalendarAlt size={10} className="opacity-70" />
                                {commitDate}
                              </span>
                            </div>
                          </div>

                          {/* Commit SHA badge + Download Version button */}
                          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                            <span 
                              className="font-mono text-[11px] px-2 py-1 rounded" 
                              style={{ 
                                backgroundColor: 'var(--surface-variant)', 
                                border: '1px solid var(--outline-variant)', 
                                color: 'var(--on-surface-variant)' 
                              }}
                              title={`Full commit SHA: ${c.sha}`}
                            >
                              {c.sha.substring(0, 7)}
                            </span>

                            <button
                              onClick={() => handleDownloadVersion(c)}
                              disabled={isDownloadingThis}
                              className="h-7 px-3 text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 hover:bg-[#F8F9FA]"
                              style={{
                                border: '1px solid var(--outline)',
                                color: 'var(--primary)'
                              }}
                              title="Download this version"
                            >
                              {isDownloadingThis ? (
                                <FaSpinner className="animate-spin" size={11} />
                              ) : (
                                <FaDownload size={10} />
                              )}
                              <span>Download</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div 
          className="px-6 py-3 flex items-center justify-between text-xs"
          style={{
            borderTop: '1px solid var(--outline-variant)',
            backgroundColor: 'var(--surface-variant)',
            color: 'var(--on-surface-variant)'
          }}
        >
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <FaGitAlt size={13} style={{ color: 'var(--primary)' }} />
            {commits.length} commit{commits.length === 1 ? '' : 's'} recorded
          </span>

          <button
            onClick={onClose}
            className="h-8 px-5 text-xs font-medium rounded-full cursor-pointer hover:bg-white transition-colors"
            style={{
              border: '1px solid var(--outline)',
              color: 'var(--on-surface)',
              backgroundColor: 'var(--surface)'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileHistoryModal;
