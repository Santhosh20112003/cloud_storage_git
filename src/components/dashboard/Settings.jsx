import React, { useState } from 'react';
import { FaHdd, FaPlus, FaSignOutAlt, FaShieldAlt, FaTrash, FaEdit, FaCheck, FaTimes, FaLayerGroup } from 'react-icons/fa';
import { STORAGE_CONFIG, formatBytes } from '../../config/commonUtils';
import toast from 'react-hot-toast';

const Settings = ({
  repositories = [],
  updateRepoName,
  deleteRepo,
  githubUsername,
  logout
}) => {
  const [isAddingVolume, setIsAddingVolume] = useState(false);
  const [newVolumeName, setNewVolumeName] = useState('');

  const handleAddCustomVolume = (e) => {
    e.preventDefault();
    const trimmed = newVolumeName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!trimmed) return toast.error('Please enter a valid partition name');

    if (repositories.some(r => r.name.toLowerCase() === trimmed)) {
      return toast.error(`A partition named "${trimmed}" already exists.`);
    }

    if (repositories.length >= STORAGE_CONFIG.MAX_REPOSITORIES) {
      return toast.error(`Maximum partition limit (${STORAGE_CONFIG.MAX_REPOSITORIES}) reached.`);
    }

    updateRepoName(trimmed);
    setNewVolumeName('');
    setIsAddingVolume(false);
    toast.success(`Connected new partition: ${trimmed}`);
  };

  const totalPoolGB = Math.max(repositories.length, 1) * (STORAGE_CONFIG.PER_REPO_CAPACITY_GB || 2);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Card 1: Unified Storage Architecture */}
      <div
        className="p-6 rounded-xl"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--outline-variant)',
          color: 'var(--on-surface)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5" style={{ borderBottom: '1px solid var(--outline-variant)' }}>
          <div>
            <div className="flex items-center gap-2">
              <FaLayerGroup style={{ color: 'var(--primary)' }} size={16} />
              <h2 className="text-base font-medium" style={{ color: 'var(--on-surface)' }}>
                Unified Storage Pool
              </h2>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--on-surface-variant)' }}>
              All repository partitions are pooled together into a single unified Drive filesystem.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="px-3 py-1 text-xs font-mono font-medium rounded-full"
              style={{
                backgroundColor: 'var(--primary-container)',
                color: 'var(--on-primary-container)'
              }}
            >
              {totalPoolGB} GB Total Capacity
            </span>
          </div>
        </div>

        {/* Partitions List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--on-surface-variant)' }}>
              Connected Partitions ({repositories.length} of {STORAGE_CONFIG.MAX_REPOSITORIES})
            </span>

            {repositories.length < STORAGE_CONFIG.MAX_REPOSITORIES && !isAddingVolume && (
              <button
                onClick={() => setIsAddingVolume(true)}
                className="h-8 px-3.5 text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors cursor-pointer hover:bg-black/5"
                style={{
                  border: '1px solid var(--outline)',
                  color: 'var(--primary)'
                }}
              >
                <FaPlus size={10} /> Add Partition
              </button>
            )}
          </div>

          {/* Form to Add Partition */}
          {isAddingVolume && (
            <form onSubmit={handleAddCustomVolume} className="p-3.5 rounded-lg flex items-center gap-3" style={{ backgroundColor: 'var(--surface-variant)', border: '1px solid var(--outline-variant)' }}>
              <input
                type="text"
                placeholder={`e.g. github-drive-${repositories.length + 1}`}
                value={newVolumeName}
                onChange={(e) => setNewVolumeName(e.target.value)}
                className="flex-1 h-8 px-3 text-xs outline-none"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: '6px',
                  border: '1px solid var(--outline)'
                }}
                autoFocus
              />
              <button
                type="submit"
                className="h-8 px-4 text-xs font-medium text-white transition-colors cursor-pointer"
                style={{
                  borderRadius: '16px',
                  backgroundColor: 'var(--primary)'
                }}
              >
                Connect
              </button>
              <button
                type="button"
                onClick={() => setIsAddingVolume(false)}
                className="h-8 px-3 text-xs font-medium transition-colors cursor-pointer hover:bg-white"
                style={{
                  borderRadius: '16px',
                  border: '1px solid var(--outline)',
                  color: 'var(--on-surface-variant)'
                }}
              >
                Cancel
              </button>
            </form>
          )}

          {/* Connected Repositories List */}
          <div className="divide-y overflow-hidden" style={{ borderColor: 'var(--outline-variant)', border: '1px solid var(--outline-variant)', borderRadius: '8px' }}>
            {repositories.map((repo, idx) => (
              <div
                key={idx}
                className="px-4 py-3 flex items-center justify-between text-sm"
                style={{ backgroundColor: 'var(--surface)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'var(--surface-variant)', border: '1px solid var(--outline-variant)' }}
                  >
                    <FaHdd size={14} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium truncate" style={{ color: 'var(--on-surface)' }}>
                        {repo.name}
                      </span>
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#EDF2FC', color: 'var(--primary)' }}
                      >
                        Pooled ({STORAGE_CONFIG.PER_REPO_CAPACITY_GB || 2} GB)
                      </span>
                    </div>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
                      GitHub repository partition • Unified in drive view
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono hidden sm:inline" style={{ color: 'var(--on-surface-variant)' }}>
                    Active
                  </span>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--success)' }} title="Online" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card 2: GitHub Account & Session */}
      <div
        className="p-6 rounded-xl"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--outline-variant)',
          color: 'var(--on-surface)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ backgroundColor: 'var(--surface-variant)', border: '1px solid var(--outline-variant)', color: 'var(--on-surface)' }}
            >
              GH
            </div>
            <div>
              <h3 className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>GitHub Session</h3>
              <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
                Authenticated as <span className="font-semibold">{githubUsername}</span>
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="h-8 px-4 text-xs font-medium rounded-full flex items-center gap-2 transition-colors cursor-pointer hover:bg-[#F8F9FA]"
            style={{
              border: '1px solid var(--outline)',
              color: 'var(--error)'
            }}
          >
            <FaSignOutAlt size={11} /> Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
