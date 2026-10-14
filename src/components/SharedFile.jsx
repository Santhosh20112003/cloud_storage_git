import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { 
  FaCloud, FaDownload, FaFileAlt, FaSpinner, 
  FaExclamationTriangle, FaShieldAlt, FaExternalLinkAlt 
} from 'react-icons/fa';
import FilePreview from './FilePreview';
import { formatBytes } from '../config/commonUtils';
import { decryptShareToken } from '../config/shareCrypto';
import { decompressBlobLossless } from '../config/smartSlicer';

const SharedFile = () => {
  const { shareId } = useParams();
  const [shareData, setShareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    const parseToken = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!shareId) {
          setError('Invalid share link.');
          return;
        }

        const data = await decryptShareToken(shareId);
        if (!data || !data.token || !data.path || !data.owner || !data.repo) {
          setError('This shared link is invalid, corrupted, or has been tampered with.');
          return;
        }

        setShareData(data);
      } catch (err) {
        console.error('Error decoding share link:', err);
        setError('Failed to decrypt and open share link.');
      } finally {
        setLoading(false);
      }
    };

    parseToken();
  }, [shareId]);

  // TanStack useMutation for shared file download
  const downloadMutation = useMutation({
    mutationFn: async (data) => {
      let finalBlob;

      if (data.isChunked && Array.isArray(data.chunkPaths) && data.chunkPaths.length > 0) {
        const chunkBlobs = await Promise.all(
          data.chunkPaths.map(async (cPath) => {
            const res = await axios.get(
              `https://api.github.com/repos/${data.owner}/${data.repo}/contents/${encodeURIComponent(cPath)}`,
              {
                headers: { Authorization: `Bearer ${data.token}`, Accept: 'application/vnd.github.raw' },
                responseType: 'blob'
              }
            );
            return res.data;
          })
        );
        finalBlob = new Blob(chunkBlobs, { type: data.mimeType || 'application/octet-stream' });
      } else {
        const response = await axios.get(
          `https://api.github.com/repos/${data.owner}/${data.repo}/contents/${encodeURIComponent(data.path)}`,
          {
            headers: { 
              Authorization: `Bearer ${data.token}`, 
              Accept: 'application/vnd.github.raw' 
            },
            responseType: 'blob'
          }
        );
        finalBlob = response.data;
      }

      if (data.isCompressed) {
        finalBlob = await decompressBlobLossless(finalBlob);
      }

      const blobUrl = window.URL.createObjectURL(finalBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', data.name);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    },
    onError: (err) => {
      console.error('Download error:', err);
      alert('Failed to download file. Please verify the file still exists in the repository.');
    }
  });

  const handleDownload = async () => {
    if (!shareData) return;
    setDownloading(true);
    try {
      await downloadMutation.mutateAsync(shareData);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center p-4 text-[#c9d1d9]">
        <div className="w-12 h-12 border-4 border-[#0366d6] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Opening secure shared file...</p>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-950/40 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-900/50">
            <FaExclamationTriangle size={28} />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Link Unavailable</h2>
          <p className="text-xs text-[#8b949e] mb-6 leading-relaxed">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-semibold rounded-lg border border-[#30363d] transition-colors"
          >
            Go to GitHub Drive
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col text-[#c9d1d9]">
      {/* Top Navigation */}
      <header className="h-14 px-6 border-b border-[#30363d] bg-[#161b22] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-900/40 text-[#58a6ff] rounded-lg">
            <FaCloud size={16} />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">GitHub Drive</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-[#8b949e]">
          <FaShieldAlt className="text-emerald-400" />
          <span>Private Repository Shared Access</span>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 sm:p-10 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-[#21262d] border border-[#30363d] rounded-2xl flex items-center justify-center text-[#58a6ff] mb-5 shadow-inner">
              <FaFileAlt size={36} />
            </div>

            <h1 className="text-base sm:text-lg font-bold text-white break-all truncate max-w-full" title={shareData.name}>
              {shareData.name}
            </h1>
            <p className="text-xs text-[#8b949e] mt-1 font-mono">
              {formatBytes(shareData.size || 0)} · Shared from private repository
            </p>

            {/* File info details */}
            <div className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl p-3 my-6 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8b949e]">Repository</span>
                <span className="font-mono text-[#58a6ff]">{shareData.owner}/{shareData.repo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b949e]">Format</span>
                <span className="uppercase font-semibold text-white">{shareData.name.split('.').pop()}</span>
              </div>
              {shareData.createdAt && (
                <div className="flex justify-between">
                  <span className="text-[#8b949e]">Generated</span>
                  <span className="text-[#8b949e]">{new Date(shareData.createdAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="w-full space-y-3">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full py-2.5 bg-[#2ea44f] hover:bg-[#2c974b] text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {downloading ? <FaSpinner className="animate-spin" /> : <FaDownload />}
                {downloading ? 'Downloading from Private Repo...' : 'Download File'}
              </button>

              <button
                onClick={() => setPreviewing(true)}
                className="w-full py-2.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <FaExternalLinkAlt size={11} /> Preview File in Browser
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Embedded File Preview */}
      {previewing && (
        <FilePreview
          file={{
            name: shareData.name,
            path: shareData.path,
            size: shareData.size || 0,
            download_url: ''
          }}
          githubToken={shareData.token}
          githubUsername={shareData.owner}
          repository={shareData.repo}
          onClose={() => setPreviewing(false)}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
};

export default SharedFile;
