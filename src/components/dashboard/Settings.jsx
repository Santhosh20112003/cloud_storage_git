import React, { useState } from 'react';
import { FaHdd, FaPlus, FaSignOutAlt, FaShieldAlt, FaTrash, FaEdit, FaCheck, FaTimes, FaLayerGroup } from 'react-icons/fa';
import { STORAGE_CONFIG, formatBytes } from '../../config/commonUtils';
import toast from 'react-hot-toast';

const Settings = ({ 
  repositories = [], 
  repoName, 
  switchActiveRepo, 
  updateRepoName, 
  deleteRepo,
  githubUsername, 
  logout 
}) => {
  const [isAddingVolume, setIsAddingVolume] = useState(false);
  const [newVolumeName, setNewVolumeName] = useState('');
  const [editingRepo, setEditingRepo] = useState(null);
  const [editNameValue, setEditNameValue] = useState('');

  const handleAddCustomVolume = (e) => {
    e.preventDefault();
    const trimmed = newVolumeName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!trimmed) return toast.error('Please enter a valid volume name');
    
    if (repositories.some(r => r.name.toLowerCase() === trimmed)) {
      return toast.error(`A volume named "${trimmed}" already exists in your pool.`);
    }

    if (repositories.length >= STORAGE_CONFIG.MAX_REPOSITORIES) {
      return toast.error(`Maximum volume limit (${STORAGE_CONFIG.MAX_REPOSITORIES}) reached.`);
    }

    updateRepoName(trimmed);
    setNewVolumeName('');
    setIsAddingVolume(false);
    toast.success(`Provisioned new storage volume: ${trimmed}`);
  };

  const handleStartRename = (repo, e) => {
    e.stopPropagation();
    setEditingRepo(repo.name);
    setEditNameValue(repo.name);
  };

  const handleSaveRename = (oldName, e) => {
    e.stopPropagation();
    const clean = editNameValue.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!clean) return toast.error('Volume name cannot be empty');
    if (clean === oldName) {
      setEditingRepo(null);
      return;
    }
    if (repositories.some(r => r.name.toLowerCase() === clean && r.name !== oldName)) {
      return toast.error(`Volume "${clean}" already exists`);
    }

    // Provision new and notify
    updateRepoName(clean);
    setEditingRepo(null);
    toast.success(`Volume alias updated to ${clean}`);
  };

  const totalPoolGB = Math.max(repositories.length, 1) * (STORAGE_CONFIG.PER_REPO_CAPACITY_GB || 2);

  return (
    <div className="bg-white dark:bg-[#161b22] border border-[#e1e4e8] dark:border-[#30363d] rounded-xl p-6 sm:p-8 shadow-xs text-[#24292e] dark:text-[#c9d1d9] transition-colors max-w-4xl">
      <div className="flex items-center justify-between border-b border-[#e1e4e8] dark:border-[#30363d] pb-4 mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#24292e] dark:text-white flex items-center gap-2">
            <FaLayerGroup className="text-[#0366d6] dark:text-[#58a6ff]" /> Storage Volume Configuration
          </h3>
          <p className="text-xs text-[#586069] dark:text-[#8b949e] mt-1">
            Manage your Git repository partitions, expand unified drive pool, or configure custom storage volumes.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-[#0366d6] dark:text-[#58a6ff] bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-900/40">
            Pool Capacity: {totalPoolGB} GB
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-xs font-bold text-[#586069] dark:text-[#8b949e] uppercase tracking-wider">
              Connected Storage Volumes ({repositories.length}/{STORAGE_CONFIG.MAX_REPOSITORIES})
            </label>
            {!isAddingVolume && repositories.length < STORAGE_CONFIG.MAX_REPOSITORIES && (
              <button
                onClick={() => setIsAddingVolume(true)}
                className="flex items-center gap-1.5 text-xs text-[#0366d6] dark:text-[#58a6ff] hover:underline font-semibold"
              >
                <FaPlus size={10} /> Add Custom Volume
              </button>
            )}
          </div>

          {/* Add custom volume form modal/box */}
          {isAddingVolume && (
            <form onSubmit={handleAddCustomVolume} className="mb-4 p-4 border border-[#0366d6] dark:border-[#58a6ff] rounded-xl bg-blue-50/30 dark:bg-blue-950/20">
              <p className="text-xs font-semibold text-[#24292e] dark:text-white mb-2">Provision New Storage Repository Partition</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newVolumeName}
                  onChange={(e) => setNewVolumeName(e.target.value)}
                  placeholder="e.g. backup-drive or media-archive"
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-[#0d1117] border border-[#e1e4e8] dark:border-[#30363d] rounded-lg outline-none focus:border-[#0366d6] font-mono text-[#24292e] dark:text-[#c9d1d9]"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#0366d6] text-white text-xs font-semibold rounded-lg hover:bg-[#0256b4] transition-colors"
                  >
                    Create Volume
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAddingVolume(false); setNewVolumeName(''); }}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-[#21262d] text-[#586069] dark:text-[#8b949e] text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-[#586069] dark:text-[#8b949e] mt-1.5">
                Will automatically connect or create this private Git repository on your GitHub account as an active +{STORAGE_CONFIG.PER_REPO_CAPACITY_GB || 2} GB partition.
              </p>
            </form>
          )}

          {/* Volume cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {repositories.map((repo) => {
              const isDefaultTarget = repoName === repo.name;
              const fileCount = Array.isArray(repo.files) ? repo.files.length : 0;
              const repoSizeBytes = (repo.files || []).reduce((acc, f) => acc + (f.size || 0), 0);

              return (
                <div 
                  key={repo.name}
                  onClick={() => switchActiveRepo(repo.name)}
                  className={`relative p-4 border rounded-xl transition-all cursor-pointer group flex flex-col justify-between ${
                    isDefaultTarget 
                      ? 'border-[#0366d6] dark:border-[#58a6ff] bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-[#0366d6]/20' 
                      : 'border-[#e1e4e8] dark:border-[#30363d] bg-white dark:bg-[#0d1117] hover:border-[#0366d6] dark:hover:border-[#58a6ff] hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FaHdd className={isDefaultTarget ? 'text-[#0366d6] dark:text-[#58a6ff]' : 'text-[#959da5] dark:text-[#8b949e]'} />
                        <span className="text-[10px] uppercase font-bold text-[#586069] dark:text-[#8b949e]">Volume</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isDefaultTarget && (
                          <span className="text-[10px] bg-[#0366d6] dark:bg-[#58a6ff] text-white px-2 py-0.5 rounded-full font-bold">
                            PRIMARY TARGET
                          </span>
                        )}
                        {deleteRepo && repositories.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteRepo(repo.name);
                            }}
                            className="p-1 hover:text-[#d73a49] text-[#959da5] transition-colors rounded"
                            title="Remove volume partition reference"
                          >
                            <FaTrash size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    {editingRepo === repo.name ? (
                      <div className="flex items-center gap-1.5 my-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          className="px-2 py-1 text-xs border rounded bg-white dark:bg-[#161b22] text-[#24292e] dark:text-white font-mono flex-1 outline-none focus:border-[#0366d6]"
                          autoFocus
                        />
                        <button
                          onClick={(e) => handleSaveRename(repo.name, e)}
                          className="p-1 text-[#2ea44f] hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="Save"
                        >
                          <FaCheck size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingRepo(null); }}
                          className="p-1 text-[#d73a49] hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="Cancel"
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm truncate text-[#24292e] dark:text-white font-mono" title={repo.name}>
                          {repo.name}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#e1e4e8]/60 dark:border-[#30363d]/60 flex items-center justify-between text-[11px] text-[#586069] dark:text-[#8b949e]">
                    <span>{fileCount} {fileCount === 1 ? 'file' : 'files'} ({formatBytes(repoSizeBytes)})</span>
                    <span className="font-semibold text-[#0366d6] dark:text-[#58a6ff]">
                      {STORAGE_CONFIG.PER_REPO_CAPACITY_GB || 2}.0 GB Max
                    </span>
                  </div>
                </div>
              );
            })}

            {repositories.length < STORAGE_CONFIG.MAX_REPOSITORIES && (
              <div 
                onClick={() => {
                  const nextRepoNum = repositories.length + 1;
                  const nextName = `github-drive-${nextRepoNum}`;
                  updateRepoName(nextName);
                }}
                className="p-4 border border-dashed border-[#e1e4e8] dark:border-[#30363d] rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-[#f6f8fa] dark:hover:bg-[#21262d] hover:border-[#0366d6] dark:hover:border-[#58a6ff] text-[#586069] dark:text-[#8b949e] cursor-pointer group transition-all min-h-[110px]"
              >
                <FaPlus className="group-hover:scale-110 transition-transform text-[#0366d6] dark:text-[#58a6ff]" />
                <span className="text-xs font-semibold">Quick Add Next Partition (+2 GB)</span>
                <span className="text-[10px] text-[#959da5]">Auto-provisions github-drive-{repositories.length + 1}</span>
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-[#e1e4e8] dark:border-[#30363d]">
          <label className="block text-xs font-bold text-[#586069] dark:text-[#8b949e] uppercase mb-2 tracking-wider">Session & Auth</label>
          <p className="text-xs text-[#586069] dark:text-[#8b949e] mb-4">
            Connected GitHub account: <span className="font-semibold text-[#24292e] dark:text-white">{githubUsername}</span> / Default Upload Target: <span className="font-mono text-[#0366d6] dark:text-[#58a6ff]">{repoName}</span>
          </p>
          <button 
            onClick={logout} 
            className="px-4 py-2 bg-white dark:bg-[#21262d] border border-[#d73a49] text-[#d73a49] text-xs font-semibold rounded-lg hover:bg-[#feeef0] dark:hover:bg-red-950/30 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <FaSignOutAlt /> Sign Out of Drive
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
