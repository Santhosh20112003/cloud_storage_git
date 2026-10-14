import React from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { FaTimes, FaHistory, FaCodeBranch, FaClock, FaUser, FaExternalLinkAlt, FaSpinner } from 'react-icons/fa';

const FileHistoryModal = ({ isOpen, onClose, file, githubUsername, repository, githubToken }) => {
  const { data: commits = [], isLoading: loading, isError } = useQuery({
    queryKey: ['file-history', repository, file?.path],
    queryFn: async () => {
      const response = await axios.get(
        `https://api.github.com/repos/${githubUsername}/${repository}/commits`,
        {
          params: { path: file.path, per_page: 20 },
          headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' }
        }
      );
      return response.data || [];
    },
    enabled: Boolean(isOpen && file && file.path && githubToken && githubUsername && repository),
    staleTime: 1000 * 60, // 1 minute
  });

  const error = isError ? 'Could not retrieve commit history for this file.' : null;

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[160] flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-[#161b22] text-[#24292e] dark:text-[#c9d1d9] border border-[#e1e4e8] dark:border-[#30363d] rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e1e4e8] dark:border-[#30363d] flex items-center justify-between bg-[#fafbfc] dark:bg-[#0d1117]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-[#0366d6] dark:text-[#58a6ff] rounded-lg">
              <FaHistory size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Version History</h3>
              <p className="text-xs text-[#586069] dark:text-[#8b949e] truncate max-w-sm sm:max-w-md">{file.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-[#f3f4f6] dark:hover:bg-[#21262d] rounded-md text-[#586069] dark:text-[#8b949e] transition-colors"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Commit List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-[#586069] dark:text-[#8b949e]">
              <FaSpinner className="animate-spin inline mr-2 text-[#0366d6]" size={20} />
              <p className="text-sm mt-2">Loading version commits from Git...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-red-600 dark:text-red-400 text-sm text-center">
              {error}
            </div>
          ) : commits.length === 0 ? (
            <div className="py-12 text-center text-[#586069] dark:text-[#8b949e]">
              <FaCodeBranch size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No Git commit history found for this item.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-[#e1e4e8] dark:border-[#30363d] ml-4 space-y-6 py-2">
              {commits.map((c, index) => {
                const commitDate = new Date(c.commit.committer.date).toLocaleString();
                const authorName = c.commit.author?.name || c.author?.login || 'Git Author';
                const avatarUrl = c.author?.avatar_url;
                const commitMsg = c.commit.message;
                const shortSha = c.sha.substring(0, 7);

                return (
                  <div key={c.sha} className="relative pl-6 group">
                    {/* Timeline Node */}
                    <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 ${
                      index === 0 
                        ? 'bg-[#2ea44f] border-white dark:border-[#0d1117]' 
                        : 'bg-white dark:bg-[#0d1117] border-[#0366d6]'
                    }`} />

                    <div className="bg-[#f6f8fa] dark:bg-[#21262d]/60 border border-[#e1e4e8] dark:border-[#30363d] rounded-lg p-3 hover:border-[#0366d6] dark:hover:border-[#58a6ff] transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs font-semibold text-[#24292e] dark:text-white break-words">
                            {commitMsg}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#586069] dark:text-[#8b949e]">
                            <span className="flex items-center gap-1.5">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={authorName} className="w-4 h-4 rounded-full" />
                              ) : (
                                <FaUser size={10} />
                              )}
                              {authorName}
                            </span>
                            <span className="flex items-center gap-1">
                              <FaClock size={10} />
                              {commitDate}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[11px] bg-white dark:bg-[#0d1117] px-2 py-0.5 rounded border border-[#e1e4e8] dark:border-[#30363d] text-[#0366d6] dark:text-[#58a6ff]">
                            {shortSha}
                          </span>
                          <a
                            href={c.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-white dark:hover:bg-[#30363d] rounded text-[#586069] dark:text-[#8b949e] hover:text-[#0366d6] dark:hover:text-white transition-colors"
                            title="View commit on GitHub"
                          >
                            <FaExternalLinkAlt size={12} />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#e1e4e8] dark:border-[#30363d] bg-[#fafbfc] dark:bg-[#0d1117] flex justify-between items-center text-xs text-[#586069] dark:text-[#8b949e]">
          <span>Showing latest changes stored on repository branch</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#f6f8fa] dark:bg-[#21262d] hover:bg-[#e1e4e8] dark:hover:bg-[#30363d] border border-[#e1e4e8] dark:border-[#30363d] rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileHistoryModal;
