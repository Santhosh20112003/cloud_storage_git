import React from 'react';
import { FaHdd, FaLayerGroup, FaCheck } from 'react-icons/fa';
import { STORAGE_CONFIG, formatBytes } from '../../config/commonUtils';

const Overview = ({ totalSizeBytes, percentage }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
      <div className="bg-white border border-[#e1e4e8] rounded-xl p-6 shadow-sm hover:shadow-md transition-all group cursor-default">
        <div className="flex items-center gap-3 mb-4 text-[#586069]">
          <FaHdd size={18} className="group-hover:text-[#24292e] transition-colors" />
          <span className="text-xs font-bold uppercase tracking-wider">Total Storage</span>
        </div>
        <div className="text-2xl font-bold">{STORAGE_CONFIG.TOTAL_CAPACITY_GB}.0 GB</div>
        <p className="text-xs text-[#586069] mt-1">Enterprise Plan</p>
      </div>
      <div className="bg-white border border-[#e1e4e8] rounded-xl p-6 shadow-sm hover:shadow-md transition-all group cursor-default">
        <div className="flex items-center gap-3 mb-4 text-[#0366d6]">
          <FaLayerGroup size={18} className="group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-wider">Used Space</span>
        </div>
        <div className="text-2xl font-bold">{formatBytes(totalSizeBytes)}</div>
        <div className="mt-4 w-full bg-[#e1e4e8] h-1.5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#0366d6] transition-all duration-1000 ease-out"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <p className="text-xs text-[#586069] mt-2">{percentage.toFixed(2)}% Capacity</p>
      </div>
      <div className="bg-white border border-[#e1e4e8] rounded-xl p-6 shadow-sm hover:shadow-md transition-all group cursor-default">
        <div className="flex items-center gap-3 mb-4 text-[#2ea44f]">
          <FaCheck size={18} className="group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-wider">Status</span>
        </div>
        <div className="text-2xl font-bold">Optimal</div>
        <p className="text-xs text-[#586069] mt-1">All systems functional</p>
      </div>
    </div>
  );
};

export default Overview;
