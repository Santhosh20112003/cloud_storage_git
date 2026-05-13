import React from 'react';
import { FaHdd, FaPlus, FaTrash } from 'react-icons/fa';
import { STORAGE_CONFIG } from '../../config/commonUtils';

const Settings = ({ 
  repositories, 
  repoName, 
  switchActiveRepo, 
  updateRepoName, 
  deleteRepo,
  githubUsername, 
  logout 
}) => {
  return (
    <div className="bg-white border border-[#e1e4e8] rounded p-8 shadow-sm">
      <h3 className="text-lg font-bold mb-6 border-b pb-4">Storage Management</h3>
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-[#586069] uppercase mb-4">Your Cloud Drives</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {repositories.map((repo) => (
              <div 
                key={repo.name}
                className={`relative p-4 border rounded-xl transition-all group ${
                  repoName === repo.name 
                    ? 'border-[#0366d6] bg-[#f1f8ff] ring-2 ring-[#0366d6]/20' 
                    : 'border-[#e1e4e8] bg-white hover:border-[#0366d6] hover:shadow-md'
                }`}
              >
                <div 
                  onClick={() => switchActiveRepo(repo.name)}
                  className="cursor-pointer flex-1 pr-8"
                >
                  <div className="flex items-center justify-between mb-2">
                    <FaHdd className={repoName === repo.name ? 'text-[#0366d6]' : 'text-[#959da5]'} />
                    {repoName === repo.name && <span className="text-[10px] bg-[#0366d6] text-white px-2 py-0.5 rounded-full font-bold">ACTIVE</span>}
                  </div>
                  <p className="font-bold text-sm truncate">{repo.name}</p>
                  <p className="text-[10px] text-[#586069] mt-1 italic">
                    {STORAGE_CONFIG.TOTAL_CAPACITY_GB}.0 GB Capacity
                  </p>
                </div>
              </div>
            ))}
            {repositories.length < STORAGE_CONFIG.MAX_REPOSITORIES ? (
              <div 
                onClick={() => {
                  const nextRepoNum = repositories.length + 1;
                  const nextName = `github-drive-${nextRepoNum}`;
                  updateRepoName(nextName);
                }}
                className="p-4 border border-dashed border-[#e1e4e8] rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-[#f6f8fa] hover:border-[#0366d6] text-[#586069] cursor-pointer group"
              >
                <FaPlus className="group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Add New Drive</span>
              </div>
            ) : (
              <div className="p-4 border border-dashed border-[#e1e4e8] rounded-xl flex flex-col items-center justify-center gap-2 bg-[#f8f9fa] opacity-60 cursor-not-allowed">
                <span className="text-[10px] font-bold text-[#d73a49]">LIMIT REACHED</span>
                <span className="text-xs font-bold text-[#586069]">Maximum {STORAGE_CONFIG.MAX_REPOSITORIES} Drives</span>
              </div>
            )}
          </div>
        </div>

        <div className="pt-8 border-t">
           <label className="block text-xs font-bold text-[#586069] uppercase mb-2">Current Connection</label>
           <p className="text-xs text-[#586069] mb-4">You are currently storing data in <span className="font-bold text-[#24292e]">{githubUsername}/{repoName}</span></p>
           <button onClick={logout} className="px-4 py-2 bg-white border border-[#d73a49] text-[#d73a49] text-sm font-semibold rounded hover:bg-[#feeef0] transition-colors">
            Sign Out of Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
