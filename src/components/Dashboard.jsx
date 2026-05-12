import React, { useRef } from 'react';
import { useGithub } from '../context/GithubContext';
import {
  FaSpinner,
  FaDatabase,
  FaShieldAlt,
  FaBolt,
  FaFolder,
  FaFile,
  FaClock,
  FaCog,
  FaSearch,
  FaHdd,
  FaSignOutAlt,
  FaChevronRight,
  FaEllipsisV,
  FaPlusSquare,
  FaFilter,
  FaImage,
  FaVideo,
  FaFileAlt,
  FaEllipsisH,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaFolderPlus,
  FaEdit,
  FaArrowLeft,
  FaRegClock,
} from 'react-icons/fa';
import axios from 'axios';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';

const Dashboard = () => {
  const {
    user,
    githubToken,
    githubUsername,
    repoName,
    repoStatus,
    isGithubConnected,
    connectGithubAccount,
    logout,
    switchGithubAccount,
    updateRepoName,
  } = useGithub();
  const [selectedFiles, setSelectedFiles] = React.useState([]);
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [repoInput, setRepoInput] = React.useState(repoName);
  const [editingFile, setEditingFile] = React.useState(null);
  const [editorContent, setEditorContent] = React.useState('');
  React.useEffect(() => {
    setRepoInput(repoName);
  }, [repoName]);
  const repository = repoName || 'github-drive';
  const [saving, setSaving] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeView, setActiveView] = React.useState('dashboard');
  const [previewFile, setPreviewFile] = React.useState(null);
  const [currentPath, setCurrentPath] = React.useState('');
  const fileInputRef = useRef(null);

  const fetchContents = async () => {
    if (repoStatus !== 'ready' || !user || !githubToken) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const url = currentPath 
        ? `https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(currentPath)}`
        : `https://api.github.com/repos/${githubUsername}/${repository}/contents`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
      });
      const rawItems = Array.isArray(response.data) ? response.data : [response.data];
      setItems(rawItems);

      // Background fetch for modification dates
      const itemsWithDates = await Promise.all(rawItems.map(async (item) => {
        try {
          const commitResp = await axios.get(`https://api.github.com/repos/${githubUsername}/${repository}/commits`, {
            params: { path: item.path, per_page: 1 },
            headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
          });
          const date = commitResp.data[0]?.commit?.committer?.date;
          return { ...item, lastModified: date };
        } catch (e) {
          return item;
        }
      }));
      setItems(itemsWithDates);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // Empty repository, not an error
        setItems([]);
      } else {
        console.error('Failed to fetch repo contents', err);
        setItems([]);
      }
    } finally {
      setLoading(false);
      setSelectedFiles([]);
    }
  };

  React.useEffect(() => {
    fetchContents();
  }, [user, githubToken, repoStatus, currentPath]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (totalSizeBytes + file.size > totalLimitBytes) {
      alert(`Storage limit exceeded! You only have ${formatMbGb(remainingBytes)} left.`);
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result.split(',')[1];
      try {
        const uploadPath = currentPath ? `${currentPath}/${file.name}` : file.name;
        await axios.put(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(uploadPath)}`, {
          message: `Upload ${file.name}`,
          content
        }, {
          headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
        });
        fetchContents();
      } catch (err) {
        console.error(err);
        alert('Upload failed');
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDoubleClick = async (file) => {
    if (file.type === 'Folder') {
      setCurrentPath(file.path);
      return;
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
    const videoExtensions = ['mp4', 'webm', 'ogg'];
    const audioExtensions = ['mp3', 'wav', 'ogg'];
    const textExtensions = ['txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'json', 'py', 'java', 'c', 'cpp', 'sh', 'sql', 'env', 'gitignore'];

    if (imageExtensions.includes(ext) || videoExtensions.includes(ext) || audioExtensions.includes(ext) || ext === 'pdf') {
      try {
        setLoading(true);
        if (ext === 'pdf' || videoExtensions.includes(ext) || audioExtensions.includes(ext)) {
            // For these types, it's better to stream directly from raw.githubusercontent or download URL
            // Since private repos require token for raw, let's use the UI friendly download_url which might work or provide a way
            // Sometimes download_url redirects. However, GitHub API doesn't allow direct stream via API without careful manipulation.
            const response = await axios.get(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(file.path)}`, {
               headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.raw' },
               responseType: 'blob'
            });
            const blobUrl = URL.createObjectURL(response.data);
            
            let type = 'raw';
            if(ext === 'pdf') type = 'pdf';
            else if(videoExtensions.includes(ext)) type = 'video';
            else if(audioExtensions.includes(ext)) type = 'audio';

            setPreviewFile({ ...file, type, dataUrl: blobUrl });
        } else {
            const response = await axios.get(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(file.path)}`, {
              headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
            });
            const dataUrl = `data:image/${ext === 'svg' ? 'svg+xml' : ext};base64,${response.data.content.replace(/\n/g, '')}`;
            setPreviewFile({ ...file, type: 'image', dataUrl });
        }
      } catch (err) {
        console.error('Failed to fetch media content', err);
        alert('Could not preview media. Try downloading it instead.');
        window.open(file.download_url, '_blank');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (textExtensions.includes(ext) || !ext) {
      try {
        setLoading(true);
        const response = await axios.get(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(file.path)}`, {
          headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
        });
        // Handle utf-8 properly
        const content = decodeURIComponent(escape(window.atob(response.data.content)));
        setEditingFile(file);
        setEditorContent(content);
      } catch (err) {
        console.error('Failed to fetch file content', err);
        if (file.download_url) {
          alert('Could not open this file for direct editing. Downloading instead...');
          window.open(file.download_url, '_blank');
        } else {
          alert('Could not open or download this file.');
        }
      } finally {
        setLoading(false);
      }
    } else {
      // If extension is not handled, download it
      window.open(file.download_url, '_blank');
    }
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;
    setSaving(true);
    try {
      const content = window.btoa(unescape(encodeURIComponent(editorContent)));
      await axios.put(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(editingFile.path)}`, {
        message: `Update ${editingFile.name}`,
        content,
        sha: editingFile.sha
      }, {
        headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
      });
      setEditingFile(null);
      fetchContents();
    } catch (err) {
      console.error('Failed to save file', err);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fetching...';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' mins ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' hours ago';
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '--';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalLimitBytes = 1 * 1024 * 1024 * 1024; // 1 GB
  const totalSizeBytes = items.reduce((acc, item) => acc + (item.size || 0), 0);
  const remainingBytes = Math.max(0, totalLimitBytes - totalSizeBytes);
  
  const categorizedStorage = React.useMemo(() => {
    const data = { 
      Image: { size: 0, count: 0 }, 
      Document: { size: 0, count: 0 }, 
      Video: { size: 0, count: 0 }, 
      Others: { size: 0, count: 0 } 
    };
    items.forEach(item => {
      if (item.type === 'file') {
        const ext = item.name.split('.').pop()?.toLowerCase();
        let cat = 'Others';
        if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) cat = 'Image';
        else if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) cat = 'Document';
        else if (['mp4', 'avi', 'mov', 'webm'].includes(ext)) cat = 'Video';
        
        data[cat].size += item.size;
        data[cat].count += 1;
      }
    });
    return data;
  }, [items]);

  const storageData = [
    { label: 'Images', color: '#22c55e', bytes: categorizedStorage.Image.size, count: categorizedStorage.Image.count, icon: <FaImage size={20}/>, bg: '#f0fdf4' },
    { label: 'Documents', color: '#f59e0b', bytes: categorizedStorage.Document.size, count: categorizedStorage.Document.count, icon: <FaFileAlt size={20}/>, bg: '#fffbeb' },
    { label: 'Videos', color: '#3b82f6', bytes: categorizedStorage.Video.size, count: categorizedStorage.Video.count, icon: <FaVideo size={20}/>, bg: '#eff6ff' },
    { label: 'Others', color: '#ec4899', bytes: categorizedStorage.Others.size, count: categorizedStorage.Others.count, icon: <FaEllipsisH size={20}/>, bg: '#fdf2f8' },
  ].map(s => ({
    ...s,
    percentage: totalLimitBytes > 0 ? (s.bytes / totalLimitBytes) * 100 : 0
  }));

  const formatGb = (bytes) => (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  const formatMbGb = (bytes) => {
      if(bytes > 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
      if(bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
      return formatSize(bytes);
  };

  const allFiles = items
    .filter(i => i && i.name && i.name.toLowerCase().includes((searchQuery || '').toLowerCase()))
    .map(i => ({
      name: i.name,
      size: i.type === 'dir' ? '--' : formatSize(i.size),
      type: i.type === 'dir' ? 'Folder' : 'File',
      date: formatDate(i.lastModified), 
      owner: user?.name || user?.login,
      sha: i.sha,
      download_url: i.download_url,
      path: i.path
    }));

  const recentFiles = allFiles.filter(f => f.type === 'File').slice(0, 2);

  const toggleSelection = (path) => {
    setSelectedFiles(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedFiles.length} item(s)?`)) return;
    setLoading(true);
    for (const path of selectedFiles) {
      const item = items.find(i => i.path === path);
      if (item) {
        try {
          await axios.delete(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(item.path)}`, {
            headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
            data: { message: `Delete ${item.name}`, sha: item.sha }
          });
        } catch (e) {
          console.error('Failed to delete', path, e);
        }
      }
    }
    fetchContents();
  };

  const handleDownload = () => {
    for (const path of selectedFiles) {
      const item = items.find(i => i.path === path);
      if (item && item.download_url) {
        window.open(item.download_url, '_blank');
      }
    }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    setLoading(true);
    try {
      const path = currentPath ? `${currentPath}/${folderName}/.gitkeep` : `${folderName}/.gitkeep`;
      await axios.put(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(path)}`, {
        message: `Create folder ${folderName}`,
        content: window.btoa('')
      }, {
        headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
      });
      fetchContents();
    } catch (err) {
      console.error(err);
      alert('Failed to create folder');
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (selectedFiles.length !== 1) return;
    const oldPath = selectedFiles[0];
    const item = items.find(i => i.path === oldPath);
    if (!item) return;

    const newName = prompt('Enter new name:', item.name);
    if (!newName || newName === item.name) return;

    const parentPath = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/') + 1) : '';
    const newPath = parentPath + newName;

    setLoading(true);
    try {
      if (item.type === 'file') {
        const resp = await axios.get(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(oldPath)}`, {
          headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
        });
        
        await axios.put(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(newPath)}`, {
          message: `Rename ${item.name} to ${newName}`,
          content: resp.data.content,
        }, {
          headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
        });

        await axios.delete(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(oldPath)}`, {
          headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
          data: { message: `Delete old file after rename`, sha: item.sha }
        });
      } else {
        alert('Renaming folders is not supported yet.');
        setLoading(false);
        return;
      }
      fetchContents();
    } catch (err) {
      console.error(err);
      alert('Rename failed');
      setLoading(false);
    }
  };

  const goBack = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
  };


  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        usedStorage={formatMbGb(totalSizeBytes)}
        totalStorage="1 GB"
        percentage={(totalSizeBytes / totalLimitBytes) * 100}
      />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header />
        
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          {(!isGithubConnected || repoStatus !== 'ready') && (
            <div className="mb-8 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900">{isGithubConnected ? 'Finalize Storage' : 'Connect GitHub'}</h3>
                  <p className="text-slate-500 max-w-lg">
                    {isGithubConnected
                      ? 'Your account is connected. Waiting for repository initialization...'
                      : 'Connect your GitHub account to enable secure cloud storage for your files.'}
                  </p>
                  <div className="flex items-center gap-3 mt-4">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wider border border-slate-200">
                      Repo: <span className="text-blue-600">{repository}</span>
                    </span>
                    {githubUsername && (
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-100">
                        User: {githubUsername}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button 
                    className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                    onClick={connectGithubAccount}
                  >
                    {isGithubConnected ? 'Reconnect GitHub' : 'Connect Account'}
                  </button>
                  {isGithubConnected && (
                    <button 
                      className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all active:scale-[0.98]"
                      onClick={switchGithubAccount}
                    >
                      Switch Account
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeView === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-10">
              <div className="relative group max-w-2xl">
                <FaSearch size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search your drive..." 
                  className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 flex gap-1 items-center">
                  <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black text-slate-400 font-sans shadow-sm">⌘</kbd>
                  <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black text-slate-400 font-sans shadow-sm">K</kbd>
                </div>
              </div>

              {/* Storage Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {storageData.map((data, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                    <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110`} style={{ backgroundColor: data.color }}>
                      {data.icon}
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 tracking-tight">{data.label}</h4>
                      <p className="text-slate-400 text-sm font-bold">{data.count} Files • {formatMbGb(data.bytes)}</p>
                    </div>
                    <div className="mt-6 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${data.percentage}%`, backgroundColor: data.color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Recently Modified Section */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                    Recently Modified
                  </h3>
                  <button className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group" onClick={() => setActiveView('recent')}>
                    View All <FaChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {recentFiles.map((file, i) => (
                    <div 
                      key={i} 
                      className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group cursor-pointer active:scale-95"
                      onDoubleClick={() => handleDoubleClick(file)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <FaFile size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 truncate mb-0.5 group-hover:text-blue-600 transition-colors">{file.name}</p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{file.size} • {file.type}</p>
                        </div>
                        <button className="more-btn p-1 text-slate-300 hover:text-slate-600 transition-colors"><FaEllipsisV size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Cloud Storage Table Section */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">Cloud Storage</h3>
                    {currentPath && (
                      <button className="p-2 hover:bg-slate-200 rounded-xl transition-colors" onClick={goBack}>
                        <FaArrowLeft size={16} className="text-slate-600" />
                      </button>
                    )}
                    <nav className="flex items-center bg-slate-100 px-4 py-2 rounded-xl text-xs font-bold text-slate-500">
                      <span className="hover:text-blue-600 cursor-pointer" onClick={() => setCurrentPath('')}>Root</span>
                      {currentPath.split('/').filter(Boolean).map((part, idx, arr) => (
                        <React.Fragment key={idx}>
                          <span className="mx-2 opacity-30">/</span>
                          <span 
                            className={`hover:text-blue-600 cursor-pointer ${idx === arr.length - 1 ? 'text-blue-600' : ''}`}
                            onClick={() => setCurrentPath(arr.slice(0, idx + 1).join('/'))}
                          >
                            {part}
                          </span>
                        </React.Fragment>
                      ))}
                    </nav>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95"
                      onClick={handleUploadClick}
                    >
                      Upload File
                    </button>
                    <button 
                      className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 active:scale-95"
                      onClick={handleCreateFolder}
                    >
                      <FaFolderPlus size={16} /> New Folder
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 w-12"><div className="w-4 h-4 rounded border border-slate-300"></div></th>
                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Name</th>
                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell whitespace-nowrap">Size</th>
                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell whitespace-nowrap">Type</th>
                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest hidden lg:table-cell whitespace-nowrap">Modified</th>
                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest hidden xl:table-cell whitespace-nowrap">Owner</th>
                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 relative">
                      {loading && (
                        <tr>
                          <td colSpan="7" className="py-24 text-center">
                            <FaSpinner size={32} className="animate-spin text-blue-600 mx-auto" />
                          </td>
                        </tr>
                      )}
                      
                      {!loading && allFiles.length === 0 && (
                        <tr>
                          <td colSpan="7" className="py-24 text-center">
                            <div className="max-w-xs mx-auto space-y-4">
                              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto border border-dashed border-slate-200">
                                <FaFolder size={32} />
                              </div>
                              <div className="space-y-1">
                                <p className="font-bold text-slate-800">Empty directory</p>
                                <p className="text-sm text-slate-400 font-medium">Upload files to populate your drive storage.</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {!loading && allFiles.map((file, i) => {
                        const isSelected = selectedFiles.includes(file.path);
                        return (
                          <tr 
                            key={i} 
                            onClick={() => toggleSelection(file.path)} 
                            onDoubleClick={() => handleDoubleClick(file)}
                            className={`group cursor-pointer transition-all ${isSelected ? 'bg-blue-50/70 py-6' : 'hover:bg-slate-50'}`}
                          >
                            <td className="px-6 py-4">
                              <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 group-hover:border-slate-400'}`}>
                                {isSelected && <FaCheckCircle size={10} />}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${file.type === 'Folder' ? 'bg-amber-50 text-amber-500 border border-amber-100' : 'bg-blue-50 text-blue-500 border border-blue-100'}`}>
                                  {file.type === 'Folder' ? <FaFolder size={20} /> : <FaFileAlt size={20} />}
                                </div>
                                <span className="font-bold text-slate-700 truncate max-w-[200px] group-hover:text-blue-600 transition-colors">{file.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-400 hidden sm:table-cell">{file.size}</td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-400 hidden md:table-cell">{file.type}</td>
                            <td className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hidden lg:table-cell">{file.date}</td>
                            <td className="px-6 py-4 hidden xl:table-cell">
                              <div className="flex items-center gap-2">
                                <img src={user?.avatar_url || `https://i.pravatar.cc/150?u=${i}`} alt="owner" className="w-7 h-7 rounded-full border border-white ring-1 ring-slate-200" />
                                <span className="text-sm font-bold text-slate-600">{file.owner || 'You'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                className="p-2 hover:bg-white rounded-lg transition-all text-slate-300 hover:text-slate-700"
                                onClick={(e) => { e.stopPropagation(); toggleSelection(file.path); }}
                              >
                                <FaEllipsisV size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700/50 text-white px-8 py-4 rounded-[40px] shadow-2xl flex items-center gap-10 z-50 animate-in slide-in-from-bottom-10 backdrop-blur-xl bg-opacity-90">
                    <div className="flex items-center gap-4 border-r border-slate-700/50 pr-10">
                      <div className="w-8 h-8 bg-blue-600 rounded-2xl flex items-center justify-center text-sm font-black shadow-lg shadow-blue-600/20">{selectedFiles.length}</div>
                      <span className="text-sm font-bold tracking-tight text-slate-200 whitespace-nowrap">Selected Items</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <button className="text-sm font-bold text-slate-400 hover:text-white transition-colors" onClick={() => setSelectedFiles([])}>Deselect</button>
                      <button className="px-5 py-2.5 bg-white text-slate-900 rounded-2xl text-sm font-black hover:bg-slate-100 transition-all active:scale-95" onClick={handleDownload}>Download</button>
                      {selectedFiles.length === 1 && (
                        <button className="px-5 py-2.5 bg-slate-800 text-white rounded-2xl text-sm font-black hover:bg-slate-700 transition-all border border-slate-700 active:scale-95" onClick={handleRename}>Rename</button>
                      )}
                      <button className="px-5 py-2.5 bg-red-600/10 text-red-500 rounded-2xl text-sm font-black hover:bg-red-600 hover:text-white transition-all active:scale-95" onClick={handleDelete}>Delete</button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeView === 'mystorage' && (
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="bg-slate-900 rounded-[48px] p-12 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
                <div className="relative z-10 space-y-8">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h3 className="text-4xl font-bold tracking-tight">{formatMbGb(totalSizeBytes)} <span className="text-slate-500 font-light italic">used</span></h3>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Of {formatGb(totalLimitBytes)} Total Storage Plan</p>
                    </div>
                    <div className="px-6 py-2 bg-blue-600 text-[11px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-blue-600/20">
                      {((totalSizeBytes / totalLimitBytes) * 100).toFixed(1)}% Utilization
                    </div>
                  </div>
                  <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm p-1 border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(totalSizeBytes / totalLimitBytes) * 100}%` }}
                      transition={{ duration: 1.5, ease: "circOut" }}
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {storageData.map((s, i) => (
                  <div key={i} className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm transition-all hover:translate-y-[-4px] hover:shadow-xl group">
                    <div className="flex items-center justify-between mb-10">
                      <div className="w-14 h-14 rounded-3xl flex items-center justify-center text-white shadow-2xl transition-transform group-hover:scale-110 rotate-3" style={{ backgroundColor: s.color }}>
                        {s.icon}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Percentage</p>
                        <p className="text-xl font-black text-slate-800" style={{ color: s.color }}>{s.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-lg font-black text-slate-900 tracking-tight">{s.label}</h4>
                        <p className="text-sm font-bold text-slate-400 italic">{s.count} Files Found</p>
                      </div>
                      <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${s.percentage}%`, backgroundColor: s.color }} />
                      </div>
                      <p className="text-2xl font-black text-slate-900 tabular-nums">{formatMbGb(s.bytes)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'settings' && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-12 border-b border-slate-100 flex items-center gap-8">
                  <div className="relative group">
                    <img src={user?.photoURL || user?.avatar_url} alt="profile" className="w-24 h-24 rounded-[32px] border-4 border-white shadow-2xl group-hover:scale-105 transition-transform" />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white border-4 border-white"><FaEdit size={12} /></div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-3xl font-black text-slate-900 tracking-tight">{user?.name || user?.login}</h4>
                    <p className="text-slate-400 font-bold tracking-widest text-sm uppercase">Personal Drive Account • {user?.email}</p>
                  </div>
                </div>
                
                <div className="p-12 space-y-10">
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Storage Configuration</h5>
                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 truncate max-w-xs">{repository}</p>
                        <p className="text-xs font-bold text-slate-400 italic">Connected storage repository</p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={repoInput}
                          onChange={(e) => setRepoInput(e.target.value)}
                          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/10 placeholder:font-light"
                          placeholder="github-drive"
                        />
                        <button className="px-6 py-2 bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all" onClick={() => updateRepoName(repoInput)}>Update</button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-10 border-t border-slate-50">
                    <h5 className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em]">Session & Security</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={logout} className="p-8 bg-red-50 hover:bg-red-100 rounded-3xl border border-red-100 transition-all group flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-600 shadow-sm group-hover:scale-110 transition-transform"><FaSignOutAlt size={20} /></div>
                        <span className="text-sm font-black text-red-600 uppercase tracking-widest">Sign Out Session</span>
                      </button>
                      <button onClick={switchGithubAccount} className="p-8 bg-slate-50 hover:bg-slate-100 rounded-3xl border border-slate-100 transition-all group flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-600 shadow-sm group-hover:scale-110 transition-transform"><FaExternalLinkAlt size={20} /></div>
                        <span className="text-sm font-black text-slate-600 uppercase tracking-widest">Switch Profile</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Default views like recent, docs, folders would follow similar grid-3 patterns with Tailwind */}
        </div>
      </main>
      
      {/* Modals & Overlays */}
      {previewFile && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[100] flex items-center justify-center p-10 animate-in fade-in">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3 font-bold text-slate-700">
                <FaImage className="text-blue-500" />
                <span className="truncate max-w-xs">{previewFile.name}</span>
              </div>
              <div className="flex gap-3">
                <button className="px-5 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-800 transition-colors" onClick={() => setPreviewFile(null)}>Close</button>
                <button className="px-6 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-blue-600/20" onClick={() => window.open(previewFile.download_url, '_blank')}>Open Original</button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100/50 p-6 md:p-12 overflow-y-auto flex items-center justify-center min-h-[50vh]">
              {previewFile.type === 'image' && (
                <img src={previewFile.dataUrl} alt={previewFile.name} className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl" />
              )}
              {previewFile.type === 'pdf' && (
                <iframe src={previewFile.dataUrl} title={previewFile.name} className="w-full h-[70vh] rounded-2xl shadow-2xl bg-white" />
              )}
              {previewFile.type === 'video' && (
                <video src={previewFile.dataUrl} controls className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl bg-black" />
              )}
              {previewFile.type === 'audio' && (
                <audio src={previewFile.dataUrl} controls className="w-full max-w-md shadow-xl" />
              )}
            </div>
          </div>
        </div>
      )}

      {editingFile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xl z-[100] flex items-center justify-center p-6 sm:p-20 animate-in fade-in">
          <div className="bg-[#1e1e1e] w-full max-w-6xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95">
            <div className="px-8 py-4 bg-[#252526] border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] rounded-t-xl border-t-2 border-blue-500">
                  <FaFileAlt className="text-blue-400" size={14} />
                  <span className="text-xs font-bold text-white tracking-tight">{editingFile.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors" onClick={() => setEditingFile(null)}>Discard</button>
                <button className="px-6 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-2xl shadow-blue-500/40 hover:bg-blue-500 transition-all flex items-center gap-2 active:scale-95" onClick={handleSaveFile}>
                  {saving ? <FaSpinner className="animate-spin" /> : <FaBolt />}
                  Save Changes
                </button>
              </div>
            </div>
            <div className="flex-1 p-0 flex">
              <div className="w-12 bg-[#333333] border-r border-white/5 flex flex-col items-center py-6 gap-6">
                <div className="w-6 h-6 text-white/20"><FaFile /></div>
                <div className="w-6 h-6 text-white/20"><FaSearch /></div>
                <div className="w-6 h-6 text-white/20"><FaCog /></div>
              </div>
              <textarea 
                className="flex-1 bg-transparent text-slate-300 p-10 font-mono text-sm leading-relaxed resize-none outline-none custom-scrollbar"
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                spellCheck="false"
              />
            </div>
            <div className="px-6 py-2 bg-[#007acc] text-white/80 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><FaShieldAlt size={10} /> main</span>
                <span className="opacity-50">/</span>
                <span>UTF-8</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Space: 2</span>
                <span>Ln 1, Col 1</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
