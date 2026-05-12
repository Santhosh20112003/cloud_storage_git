import React, { useRef } from 'react';
import { useGithub } from '../context/GithubContext';
import { 
  Loader2, Database, Shield, Zap, Folder, File, Clock, Settings, Search, HardDrive, LogOut, ChevronRight, MoreVertical, PlusSquare, ListFilter,
  Image as ImageIcon, Video, FileText, MoreHorizontal, ExternalLink, CheckCircle2, FolderPlus, Edit3, ArrowLeft
} from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';

const Dashboard = () => {
  const { user, token, repoStatus, logout } = useGithub();
  const [selectedFiles, setSelectedFiles] = React.useState([]);
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editingFile, setEditingFile] = React.useState(null);
  const [editorContent, setEditorContent] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeView, setActiveView] = React.useState('dashboard');
  const [previewFile, setPreviewFile] = React.useState(null);
  const [currentPath, setCurrentPath] = React.useState('');
  const fileInputRef = useRef(null);

  const fetchContents = async () => {
    if (repoStatus !== 'ready' || !user || !token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const url = currentPath 
        ? `https://api.github.com/repos/${user.login}/github-drive/contents/${encodeURIComponent(currentPath)}`
        : `https://api.github.com/repos/${user.login}/github-drive/contents`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `token ${token}` }
      });
      const rawItems = Array.isArray(response.data) ? response.data : [response.data];
      setItems(rawItems);

      // Background fetch for modification dates
      const itemsWithDates = await Promise.all(rawItems.map(async (item) => {
        try {
          const commitResp = await axios.get(`https://api.github.com/repos/${user.login}/github-drive/commits`, {
            params: { path: item.path, per_page: 1 },
            headers: { Authorization: `token ${token}` }
          });
          const date = commitResp.data[0]?.commit?.committer?.date;
          return { ...item, lastModified: date };
        } catch (e) {
          return item;
        }
      }));
      setItems(itemsWithDates);
    } catch (err) {
      console.error('Failed to fetch repo contents', err);
      setItems([]);
    } finally {
      setLoading(false);
      setSelectedFiles([]);
    }
  };

  React.useEffect(() => {
    fetchContents();
  }, [user, token, repoStatus, currentPath]);

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
        await axios.put(`https://api.github.com/repos/${user.login}/github-drive/contents/${encodeURIComponent(uploadPath)}`, {
          message: `Upload ${file.name}`,
          content
        }, {
          headers: { Authorization: `token ${token}` }
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
    const textExtensions = ['txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'json', 'py', 'java', 'c', 'cpp', 'sh', 'sql', 'env', 'gitignore'];

    if (imageExtensions.includes(ext)) {
      try {
        setLoading(true);
        const response = await axios.get(`https://api.github.com/repos/${user.login}/github-drive/contents/${encodeURIComponent(file.path)}`, {
          headers: { Authorization: `token ${token}` }
        });
        const dataUrl = `data:image/${ext === 'svg' ? 'svg+xml' : ext};base64,${response.data.content.replace(/\n/g, '')}`;
        setPreviewFile({ ...file, type: 'image', dataUrl });
      } catch (err) {
        console.error('Failed to fetch image content', err);
        alert('Could not preview image. Try downloading it instead.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (ext === 'pdf') {
      window.open(file.download_url, '_blank');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`https://api.github.com/repos/${user.login}/github-drive/contents/${encodeURIComponent(file.path)}`, {
        headers: { Authorization: `token ${token}` }
      });
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
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;
    setSaving(true);
    try {
      const content = window.btoa(unescape(encodeURIComponent(editorContent)));
      await axios.put(`https://api.github.com/repos/${user.login}/github-drive/contents/${encodeURIComponent(editingFile.path)}`, {
        message: `Update ${editingFile.name}`,
        content,
        sha: editingFile.sha
      }, {
        headers: { Authorization: `token ${token}` }
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
    { label: 'Images', color: '#22c55e', bytes: categorizedStorage.Image.size, count: categorizedStorage.Image.count, icon: <ImageIcon size={20}/>, bg: '#f0fdf4' },
    { label: 'Documents', color: '#f59e0b', bytes: categorizedStorage.Document.size, count: categorizedStorage.Document.count, icon: <FileText size={20}/>, bg: '#fffbeb' },
    { label: 'Videos', color: '#3b82f6', bytes: categorizedStorage.Video.size, count: categorizedStorage.Video.count, icon: <Video size={20}/>, bg: '#eff6ff' },
    { label: 'Others', color: '#ec4899', bytes: categorizedStorage.Others.size, count: categorizedStorage.Others.count, icon: <MoreHorizontal size={20}/>, bg: '#fdf2f8' },
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
    .filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
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
          await axios.delete(`https://api.github.com/repos/${user.login}/github-drive/contents/${encodeURIComponent(item.path)}`, {
            headers: { Authorization: `token ${token}` },
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
      await axios.put(`https://api.github.com/repos/${user.login}/github-drive/contents/${encodeURIComponent(path)}`, {
        message: `Create folder ${folderName}`,
        content: window.btoa('')
      }, {
        headers: { Authorization: `token ${token}` }
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
        const resp = await axios.get(`https://api.github.com/repos/${user.login}/github-drive/contents/${encodeURIComponent(oldPath)}`, {
          headers: { Authorization: `token ${token}` }
        });
        
        await axios.put(`https://api.github.com/repos/${user.login}/github-drive/contents/${encodeURIComponent(newPath)}`, {
          message: `Rename ${item.name} to ${newName}`,
          content: resp.data.content,
        }, {
          headers: { Authorization: `token ${token}` }
        });

        await axios.delete(`https://api.github.com/repos/${user.login}/github-drive/contents/${encodeURIComponent(oldPath)}`, {
          headers: { Authorization: `token ${token}` },
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
    <div className="app-container">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        usedStorage={formatMbGb(totalSizeBytes)}
        totalStorage="1 GB"
        percentage={(totalSizeBytes / totalLimitBytes) * 100}
      />
      <main className="main-content">
        <Header />
        <div className="dashboard-content">
          
          {activeView === 'dashboard' && (
            <div className="dashboard-header-row mb-6">
              <div className="dashboard-search">
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search files and folders..." 
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="search-keys">
                  <kbd>⌘</kbd>
                  <kbd>K</kbd>
                </div>
              </div>
            </div>
          )}

          {activeView === 'recent' && (
            <section className="dashboard-section">
              <div className="section-header space-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock size={20} className="text-indigo-600" />
                  <h3>Recent Activity</h3>
                </div>
                <button className="btn-view-all" onClick={() => setActiveView('dashboard')}>
                  <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
                  Back to Dashboard
                </button>
              </div>
              <div className="cards-grid">
                {allFiles
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((file, i) => {
                    const isSelected = selectedFiles.includes(file.path);
                    return (
                      <div 
                        key={i} 
                        className={`card recent-file-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleSelection(file.path)}
                        onDoubleClick={() => handleDoubleClick(file)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="file-icon-box">
                          <File size={20} className="icon-blue" />
                        </div>
                        <div className="file-info">
                          <p className="file-name">{file.name}</p>
                          <p className="file-meta">{file.size} • {file.type}</p>
                        </div>
                        <button 
                          className="more-btn" 
                          onClick={(e) => { e.stopPropagation(); toggleSelection(file.path); }}
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {activeView === 'docs' && (
            <section className="dashboard-section">
              <div className="section-header space-between mb-4">
                <div className="flex items-center gap-2">
                  <File size={20} className="text-indigo-600" />
                  <h3>Documentations</h3>
                </div>
                <button className="btn-view-all" onClick={() => setActiveView('dashboard')}>
                  <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
                  Back to Dashboard
                </button>
              </div>
              <div className="cards-grid">
                {allFiles
                  .filter(f => ['pdf', 'doc', 'docx', 'txt', 'md'].includes(f.name.split('.').pop()?.toLowerCase()))
                  .length > 0 ? allFiles
                  .filter(f => ['pdf', 'doc', 'docx', 'txt', 'md'].includes(f.name.split('.').pop()?.toLowerCase()))
                  .map((file, i) => {
                    const isSelected = selectedFiles.includes(file.path);
                    return (
                      <div 
                        key={i} 
                        className={`card recent-file-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleSelection(file.path)}
                        onDoubleClick={() => handleDoubleClick(file)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="file-icon-box">
                          <File size={20} className="icon-blue" />
                        </div>
                        <div className="file-info">
                          <p className="file-name">{file.name}</p>
                          <p className="file-meta">{file.size} • {file.type}</p>
                        </div>
                        <button 
                          className="more-btn" 
                          onClick={(e) => { e.stopPropagation(); toggleSelection(file.path); }}
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    );
                  }) : (
                    <div className="empty-state-container">
                      <div className="empty-state-icon">
                        <File size={40} />
                      </div>
                      <h4>No document found</h4>
                      <p>You haven't uploaded any documents yet. Supported formats: PDF, DOC, TXT, MD.</p>
                    </div>
                  )}
              </div>
            </section>
          )}

          {activeView === 'folders' && (
            <section className="dashboard-section">
              <div className="section-header space-between mb-4">
                <div className="flex items-center gap-2">
                  <Folder size={20} className="text-indigo-600" />
                  <h3>Folders</h3>
                </div>
                <button className="btn-view-all" onClick={() => setActiveView('dashboard')}>
                  <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
                  Back to Dashboard
                </button>
              </div>
              <div className="cards-grid">
                {allFiles
                  .filter(f => f.type === 'Folder')
                  .length > 0 ? allFiles
                  .filter(f => f.type === 'Folder')
                  .map((folder, i) => {
                    const isSelected = selectedFiles.includes(folder.path);
                    return (
                      <div 
                        key={i} 
                        className={`card recent-file-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleSelection(folder.path)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="file-icon-box">
                          <Folder size={20} className="icon-folder" fill="currentColor" />
                        </div>
                        <div className="file-info">
                          <p className="file-name">{folder.name}</p>
                          <p className="file-meta">Folder • {folder.date}</p>
                        </div>
                        <button 
                          className="more-btn" 
                          onClick={(e) => { e.stopPropagation(); toggleSelection(folder.path); }}
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    );
                  }) : (
                    <div className="empty-state-container">
                      <div className="empty-state-icon">
                        <Folder size={40} />
                      </div>
                      <h4>No folder found</h4>
                      <p>You haven't created any folders in this repository yet.</p>
                    </div>
                  )}
              </div>
            </section>
          )}

          {activeView === 'settings' && (
            <section className="dashboard-section">
              <div className="section-header space-between mb-4">
                <div className="flex items-center gap-2">
                  <Settings size={20} className="text-indigo-600" />
                  <h3>Account Settings</h3>
                </div>
                <button className="btn-view-all" onClick={() => setActiveView('dashboard')}>
                  <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
                  Back to Dashboard
                </button>
              </div>
              <div className="card settings-card p-6">
                <div className="settings-user-info mb-6">
                  <img src={user?.avatar_url} alt="profile" className="settings-avatar" />
                  <div>
                    <h4>{user?.name || user?.login}</h4>
                    <p className="text-muted">{user?.login}</p>
                  </div>
                </div>
                
                <div className="settings-options">
                  <div className="settings-item">
                    <div className="item-label">
                      <h5>Storage Plan</h5>
                      <p>You are currently on the free 1 GB plan.</p>
                    </div>
                    <span className="badge-primary">Free Tier</span>
                  </div>
                  
                  <hr className="my-6 border-slate-100" />
                  
                  <div className="settings-section">
                    <h5 className="section-subtitle">Account Management</h5>
                    <p className="section-desc">Manage your session and account connections.</p>
                    <div className="account-actions-grid">
                      <div className="action-card danger">
                        <div className="action-info">
                          <h6>Sign Out</h6>
                          <p>Securely log out from your current session.</p>
                        </div>
                        <button onClick={logout} className="btn-danger-solid">
                          <LogOut size={18} />
                          Sign Out
                        </button>
                      </div>

                      <div className="action-card">
                        <div className="action-info">
                          <h6>Switch Account</h6>
                          <p>Connect with a different GitHub profile.</p>
                        </div>
                        <button onClick={logout} className="btn-switch">
                          <ExternalLink size={18} />
                          Switch Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeView === 'mystorage' && (
            <section className="dashboard-section">
              <div className="section-header space-between mb-4">
                <div className="flex items-center gap-2">
                  <HardDrive size={20} className="text-indigo-600" />
                  <h3>Storage Breakdown</h3>
                </div>
                <button className="btn-view-all" onClick={() => setActiveView('dashboard')}>
                  <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
                  Back to Dashboard
                </button>
              </div>
              
              {/* Total Storage Summary */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card storage-summary-card mb-8"
              >
                <div className="summary-header">
                  <div>
                    <h4 className="text-xl font-bold">{formatMbGb(totalSizeBytes)} used</h4>
                    <p className="text-muted">of {formatGb(totalLimitBytes)} total storage</p>
                  </div>
                  <div className="percentage-pill">
                    {((totalSizeBytes / totalLimitBytes) * 100).toFixed(1)}% Full
                  </div>
                </div>
                <div className="summary-progress-outer">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(totalSizeBytes / totalLimitBytes) * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="summary-progress-inner"
                  />
                </div>
              </motion.div>

              <div className="storage-grid">
                {storageData.map((s, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="storage-card" 
                    style={{ '--accent': s.color, '--bg': s.bg }}
                  >
                    <div className="storage-card-header">
                      <div className="storage-icon-box">
                        {s.icon}
                      </div>
                      <span className="storage-percentage">{s.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="storage-card-body">
                      <div className="storage-info">
                        <h4>{s.label}</h4>
                        <p>{s.count} files</p>
                      </div>
                      <div className="storage-bar">
                        <div className="storage-progress" style={{ width: `${s.percentage}%` }} />
                      </div>
                      <div className="storage-size">{formatMbGb(s.bytes)}</div>
                    </div>
                  </motion.div>
                ))}
                
                {/* Available Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="storage-card available"
                >
                  <div className="storage-card-content">
                    <div className="storage-icon-box">
                      <Database size={20} />
                    </div>
                    <div className="storage-card-info">
                      <h4>Available</h4>
                      <p>Free space</p>
                    </div>
                  </div>
                  <div className="storage-card-footer">
                    <span className="storage-card-size">{formatMbGb(remainingBytes)}</span>
                    <div className="storage-mini-bar">
                      <div className="storage-mini-progress" style={{ width: `${(remainingBytes / totalLimitBytes) * 100}%`, background: '#e2e8f0' }} />
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>
          )}

          {activeView === 'dashboard' && (
            <>
              <section className="dashboard-section">
                <div className="section-header space-between">
                  <h3>Recently Modified</h3>
                  <button 
                    className="btn-view-all" 
                    onClick={() => setActiveView('recent')}
                  >
                    View All
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="cards-grid">
                  {recentFiles.map((file, i) => (
                    <div 
                      key={i} 
                      className="card recent-file-card"
                      onDoubleClick={() => handleDoubleClick(file)}
                    >
                      <div className="file-icon-box">
                        <File size={24} className="icon-blue" />
                      </div>
                      <div className="file-info">
                        <p className="file-name">{file.name}</p>
                        <p className="file-meta">{file.size} • {file.type}</p>
                      </div>
                      <button className="more-btn"><MoreVertical size={16} /></button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="dashboard-section">
                <div className="section-header space-between">
                  <div className="flex items-center gap-4">
                    <h3>Cloud Storage</h3>
                    {currentPath && (
                      <button className="btn-ghost p-1" onClick={goBack}>
                        <ArrowLeft size={18} />
                      </button>
                    )}
                    <div className="breadcrumb">
                      <span onClick={() => setCurrentPath('')} style={{ cursor: 'pointer' }}>Root</span>
                      {currentPath.split('/').filter(Boolean).map((part, idx, arr) => (
                        <React.Fragment key={idx}>
                          <span className="mx-1 text-muted">/</span>
                          <span 
                            onClick={() => setCurrentPath(arr.slice(0, idx + 1).join('/'))}
                            style={{ cursor: 'pointer' }}
                          >
                            {part}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <div className="section-actions">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      onChange={handleFileChange} 
                    />
                    <button className="btn-primary shadow-btn" onClick={handleUploadClick}>
                      Upload File
                    </button>
                    <button className="btn-outline" onClick={handleCreateFolder}>
                      <FolderPlus size={16} />
                      New Folder
                    </button>
                  </div>
                </div>
                <div className="table-container card">
                  {loading && (
                    <div className="loading-overlay">
                      <Loader2 className="spinner" size={32} />
                    </div>
                  )}
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="checkbox-cell"><div className="checkbox-custom" /></th>
                        <th>Name</th>
                        <th>Size</th>
                        <th>Type</th>
                        <th>Last Modified</th>
                        <th>Owner</th>
                        <th className="action-cell"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {allFiles.length > 0 ? allFiles.map((file, i) => {
                        const isSelected = selectedFiles.includes(file.path);
                        return (
                          <tr 
                            key={i} 
                            onClick={() => toggleSelection(file.path)} 
                            onDoubleClick={() => handleDoubleClick(file)}
                            className={isSelected ? 'selected' : ''}
                          >
                            <td className="checkbox-cell">
                              <div className={`checkbox-custom ${isSelected ? 'checked' : ''}`} />
                            </td>
                            <td>
                              <div className="name-cell">
                                {file.type === 'Folder' ? (
                                  <Folder size={20} className="icon-folder" fill="currentColor" />
                                ) : (
                                  <File size={20} className="icon-file" />
                                )}
                                <span className="item-name">{file.name}</span>
                              </div>
                            </td>
                            <td className="meta-cell">{file.size}</td>
                            <td className="meta-cell">{file.type}</td>
                            <td className="meta-cell">{file.date}</td>
                            <td>
                              <div className="owner-cell">
                                <img src={user?.avatar_url || `https://i.pravatar.cc/150?u=${i}`} alt="owner" className="owner-avatar" />
                                <span className="owner-name">{file.owner}</span>
                              </div>
                            </td>
                            <td className="action-cell">
                              <button className="more-btn" onClick={(e) => { e.stopPropagation(); toggleSelection(file.path); }}><MoreVertical size={16} /></button>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan="7" className="empty-table">
                            No files found. Upload something to get started!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  
                  {selectedFiles.length > 0 && (
                    <div className="selection-bar">
                      <div className="selection-info">
                        <CheckCircle2 size={16} className="text-green-500" />
                        <span>{selectedFiles.length} items selected</span>
                      </div>
                      <div className="selection-actions">
                        <button className="btn-ghost" onClick={() => setSelectedFiles([])}>Deselect All</button>
                        {selectedFiles.length === 1 && (
                          <button className="btn-ghost" onClick={handleRename}>
                            <Edit3 size={16} /> Rename
                          </button>
                        )}
                        <button className="btn-primary" onClick={handleDownload}>Download</button>
                        <button className="btn-danger" onClick={handleDelete}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        {/* Modals */}
        {previewFile && previewFile.type === 'image' && (
          <div className="editor-overlay">
            <div className="preview-modal">
              <div className="editor-toolbar">
                <div className="editor-title">
                  <ImageIcon size={14} />
                  <span>Preview — {previewFile.name}</span>
                </div>
                <div className="editor-actions p-0 bg-transparent border-0">
                  <button className="btn-vscode-outline" onClick={() => setPreviewFile(null)}>Close</button>
                  <button className="btn-vscode" onClick={() => window.open(previewFile.download_url, '_blank')}>
                    <ExternalLink size={14} />
                    Open Original
                  </button>
                </div>
              </div>
              <div className="preview-body">
                <img src={previewFile.dataUrl || previewFile.download_url} alt={previewFile.name} className="preview-image" />
              </div>
            </div>
          </div>
        )}

        {editingFile && (
          <div className="editor-overlay">
            <div className="editor-modal">
              <div className="editor-header">
                <div className="editor-toolbar">
                  <div className="editor-title">
                    <Database size={14} />
                    <span>GitHub Drive — {editingFile.name}</span>
                  </div>
                  <div className="editor-title">
                    <span>{editingFile.path}</span>
                  </div>
                </div>
                <div className="editor-tabs">
                  <div className="editor-tab">
                    <File size={14} className="text-blue-400" />
                    <span>{editingFile.name}</span>
                  </div>
                </div>
                <div className="editor-actions">
                  <button className="btn-vscode-outline" onClick={() => setEditingFile(null)}>Cancel</button>
                  <button className="btn-vscode" onClick={handleSaveFile} disabled={saving}>
                    {saving ? <Loader2 className="spinner" size={14} /> : <Zap size={14} />}
                    Save
                  </button>
                </div>
              </div>
              <textarea 
                className="editor-textarea"
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                spellCheck="false"
                autoFocus
              />
              <div className="editor-footer">
                <div className="footer-item">
                  <div className="flex items-center gap-1">
                    <Shield size={12} />
                    <span>Main</span>
                  </div>
                  <span>UTF-8</span>
                </div>
                <div className="footer-item">
                  <span>Spaces: 2</span>
                  <span>Ln 1, Col 1</span>
                  <span>JavaScript</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
