import React from 'react';
import { FaHdd, FaLayerGroup, FaCheck, FaFileAlt, FaCalendarAlt, FaChartLine } from 'react-icons/fa';
import { STORAGE_CONFIG, formatBytes } from '../../config/commonUtils';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, AreaChart, Area, CartesianGrid } from 'recharts';

const Overview = ({ totalSizeBytes, percentage, firestoreFiles = [] }) => {
  // Activity over time (Mocking trends based on lastModified)
  const activityData = React.useMemo(() => {
    const dates = {};
    const today = new Date();
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      dates[d.toLocaleDateString('en-US', { weekday: 'short' })] = 0;
    }

    firestoreFiles.forEach(file => {
      if (file.lastModified) {
        const day = new Date(file.lastModified).toLocaleDateString('en-US', { weekday: 'short' });
        if (dates[day] !== undefined) dates[day]++;
      }
    });

    return Object.entries(dates).map(([name, count]) => ({ name, count }));
  }, [firestoreFiles]);

  // Average file size calculation
  const AvgFileSize = React.useMemo(() => {
    const filesOnly = firestoreFiles.filter(f => f.type === 'file');
    if (filesOnly.length === 0) return '0 B';
    const avg = totalSizeBytes / filesOnly.length;
    return formatBytes(avg);
  }, [firestoreFiles, totalSizeBytes]);

  // Calculate file type distribution
  const typeStats = React.useMemo(() => {
    const counts = {
      image: 0,
      video: 0,
      pdf: 0,
      doc: 0,
      other: 0
    };

    firestoreFiles.forEach(file => {
      if (file.type === 'dir') return;
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) counts.image++;
      else if (['mp4', 'webm'].includes(ext)) counts.video++;
      else if (ext === 'pdf') counts.pdf++;
      else if (['doc', 'docx', 'txt', 'md'].includes(ext)) counts.doc++;
      else counts.other++;
    });

    return [
      { name: 'Images', value: counts.image, color: '#0366d6' },
      { name: 'Videos', value: counts.video, color: '#8a63d2' },
      { name: 'PDFs', value: counts.pdf, color: '#d73a49' },
      { name: 'Docs', value: counts.doc, color: '#2ea44f' },
      { name: 'Other', value: counts.other, color: '#6a737d' }
    ].filter(t => t.value > 0);
  }, [firestoreFiles]);

  // Calculate storage by type
  const storageStats = React.useMemo(() => {
    const sizes = {
      image: 0,
      video: 0,
      pdf: 0,
      doc: 0,
      other: 0
    };

    firestoreFiles.forEach(file => {
      if (file.type === 'dir') return;
      const ext = file.name.split('.').pop()?.toLowerCase();
      const size = file.size || 0;
      if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) sizes.image += size;
      else if (['mp4', 'webm'].includes(ext)) sizes.video += size;
      else if (ext === 'pdf') sizes.pdf += size;
      else if (['doc', 'docx', 'txt', 'md'].includes(ext)) sizes.doc += size;
      else sizes.other += size;
    });

    return [
      { name: 'Images', displaySize: Number((sizes.image / 1024 / 1024).toFixed(2)) },
      { name: 'Videos', displaySize: Number((sizes.video / 1024 / 1024).toFixed(2)) },
      { name: 'PDFs', displaySize: Number((sizes.pdf / 1024 / 1024).toFixed(2)) },
      { name: 'Docs', displaySize: Number((sizes.doc / 1024 / 1024).toFixed(2)) },
      { name: 'Other', displaySize: Number((sizes.other / 1024 / 1024).toFixed(2)) }
    ].filter(t => t.displaySize > 0);
  }, [firestoreFiles]);

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-[#e1e4e8] rounded-xl p-5 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-3 text-[#586069]">
            <FaHdd size={16} className="group-hover:text-[#0366d6] transition-colors" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Storage</span>
          </div>
          <div className="text-xl font-bold text-[#24292e]">{STORAGE_CONFIG.TOTAL_CAPACITY_GB}.0 GB</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2ea44f]"></span>
            <p className="text-[10px] text-[#586069] font-medium">Enterprise Plan</p>
          </div>
        </div>

        <div className="bg-white border border-[#e1e4e8] rounded-xl p-5 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-3 text-[#0366d6]">
            <FaLayerGroup size={16} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Used Space</span>
          </div>
          <div className="text-xl font-bold text-[#24292e]">{formatBytes(totalSizeBytes)}</div>
          <div className="mt-3 w-full bg-[#e1e4e8] h-1.5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#0366d6] transition-all duration-1000 ease-out"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-[#586069] mt-2 font-medium">{percentage.toFixed(1)}% Capacity</p>
        </div>

        <div className="bg-white border border-[#e1e4e8] rounded-xl p-5 shadow-sm hover:shadow-md transition-all group sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 mb-3 text-[#2ea44f]">
            <FaCheck size={16} className="group-hover:rotate-12 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Status</span>
          </div>
          <div className="text-xl font-bold text-[#24292e]">Optimal</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2ea44f] animate-pulse"></span>
            <p className="text-[10px] text-[#586069] font-medium">All systems functional</p>
          </div>
        </div>

        <div className="bg-white border border-[#e1e4e8] rounded-xl p-5 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-3 text-[#f66a0a]">
            <FaCalendarAlt size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Avg. File Size</span>
          </div>
          <div className="text-xl font-bold text-[#24292e]">{AvgFileSize}</div>
          <p className="text-[10px] text-[#586069] mt-1 font-medium">Across {firestoreFiles.filter(f => f.type === 'file').length} files</p>
        </div>

        <div className="bg-white border border-[#e1e4e8] rounded-xl p-5 shadow-sm hover:shadow-md transition-all group sm:col-span-2 lg:col-span-2">
          <div className="flex items-center gap-3 mb-3 text-[#8a63d2]">
            <FaChartLine size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Recent Activity</span>
          </div>
          <div className="h-[40px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8a63d2" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8a63d2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="count" stroke="#8a63d2" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-[#586069] mt-2 font-medium">File uploads/modifications this week</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-[#e1e4e8] rounded-xl p-5 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[11px] font-bold text-[#24292e] uppercase tracking-wider">File Distribution</h3>
            <span className="text-[10px] text-[#6a737d] font-medium bg-[#f6f8fa] px-2 py-0.5 rounded-full border border-[#e1e4e8]">{firestoreFiles.filter(f => f.type !== 'dir').length} Files</span>
          </div>
          <div className="h-[220px] w-full relative">
            {typeStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeStats}
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {typeStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: '1px solid #e1e4e8', 
                      fontSize: '11px', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      padding: '8px 12px'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle" 
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#6a737d] bg-[#fafbfc] rounded-lg border border-dashed border-[#e1e4e8]">
                <FaFileAlt size={32} className="mb-2 opacity-20" />
                <p className="text-[11px] font-medium">No files uploaded yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#e1e4e8] rounded-xl p-5 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[11px] font-bold text-[#24292e] uppercase tracking-wider">Storage Usage (MB)</h3>
            <span className="text-[10px] text-[#6a737d] font-medium bg-[#f6f8fa] px-2 py-0.5 rounded-full border border-[#e1e4e8]">ByType</span>
          </div>
          <div className="h-[220px] w-full">
            {storageStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={storageStats} 
                  layout="vertical" 
                  margin={{ left: -10, right: 30, top: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#586069', fontWeight: 500 }}
                    width={70}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f6f8fa', radius: 4 }}
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: '1px solid #e1e4e8', 
                      fontSize: '11px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}
                    formatter={(value) => [`${value} MB`, 'Size']}
                  />
                  <Bar 
                    dataKey="displaySize" 
                    fill="#0366d6" 
                    radius={[0, 4, 4, 0]} 
                    barSize={16}
                    background={{ fill: '#f6f8fa', radius: 4 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#6a737d] bg-[#fafbfc] rounded-lg border border-dashed border-[#e1e4e8]">
                <FaLayerGroup size={32} className="mb-2 opacity-20" />
                <p className="text-[11px] font-medium">Upload files to see analytics</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Activity Detail Chart */}
      <div className="bg-white border border-[#e1e4e8] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[11px] font-bold text-[#24292e] uppercase tracking-wider">Upload Frequency (7 Days)</h3>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8a63d2]"></span>
            <span className="text-[10px] text-[#6a737d] font-medium">Daily Operations</span>
          </div>
        </div>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#586069' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#586069' }} 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e1e4e8', fontSize: '11px' }}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#8a63d2" 
                fillOpacity={0.1} 
                fill="#8a63d2" 
                strokeWidth={2}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Overview;
