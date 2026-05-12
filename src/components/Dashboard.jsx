import React, { useRef } from 'react';
import { useGithub } from '../context/GithubContext';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  FaSpinner,
  FaDatabase,
  FaShieldAlt,
  FaFolder,
  FaFileAlt,
  FaArrowLeft,
  FaTimes,
  FaUpload,
  FaCheck,
  FaLayerGroup,
  FaHdd,
  FaFolderPlus,
  FaTrash,
  FaEllipsisV,
  FaDownload,
  FaEdit,
  FaEye
} from 'react-icons/fa';
import axios from 'axios';
import Sidebar from './Sidebar';
import Header from './Header';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const {
    user,
    firebaseUser,
    githubToken,
    githubUsername,
    repoName,
    repoStatus,
    isGithubConnected,
    connectGithubAccount,
    logout,
  } = useGithub();

  const [selectedFiles, setSelectedFiles] = React.useState([]);
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editingFile, setEditingFile] = React.useState(null);
  const [editorContent, setEditorContent] = React.useState('');
  const [previewFile, setPreviewFile] = React.useState(null);
  const [currentPath, setCurrentPath] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeView, setActiveView] = React.useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [firestoreFiles, setFirestoreFiles] = React.useState([]);
  const [dragActive, setDragActive] = React.useState(false);
  const [uploadQueue, setUploadQueue] = React.useState([]);
  const [activeMenu, setActiveMenu] = React.useState(null);
  
  const fileInputRef = useRef(null);
  const repository = repoName || 'github-drive';

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setSelectedFiles([]);
  };

  const fetchContents = async (silent = false) => {
    if (repoStatus !== 'ready' || !user || !githubToken) {
      setLoading(false);
      return;
    }
    try {
      if (!silent) setLoading(true);
      // Added cache buster to bypass GitHub API eventual consistency delay
      const cacheBuster = `?cb=${Date.now()}`;
      const url = currentPath 
        ? `https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(currentPath)}${cacheBuster}`
        : `https://api.github.com/repos/${githubUsername}/${repository}/contents${cacheBuster}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' }
      });
      const rawItems = Array.isArray(response.data) ? response.data : [response.data];
      const displayItems = rawItems.filter(item => item.name !== '.keep');

      const itemsWithDates = await Promise.all(displayItems.map(async (item) => {
        try {
          const commitResp = await axios.get(`https://api.github.com/repos/${githubUsername}/${repository}/commits`, {
            params: { path: item.path, per_page: 1 },
            headers: { Authorization: `Bearer ${githubToken}` }
          });
          return { ...item, lastModified: commitResp.data[0]?.commit?.committer?.date };
        } catch (e) {
          return item;
        }
      }));
      
      setItems(itemsWithDates);
      if (firebaseUser) {
        // Prepare metadata for Firestore
        const newFilesData = itemsWithDates.map(i => ({
          name: i.name, 
          path: i.path, 
          sha: i.sha, 
          size: i.size, 
          type: i.type,
          download_url: i.download_url, 
          lastModified: i.lastModified || null
        }));

        // Merge current branch into the master 'allFiles' list in Firestore
        const mergedFiles = [...firestoreFiles];
        newFilesData.forEach(newFile => {
          const index = mergedFiles.findIndex(f => f.path === newFile.path);
          if (index !== -1) mergedFiles[index] = newFile;
          else mergedFiles.push(newFile);
        });

        await updateDoc(doc(db, 'users', firebaseUser.uid), { 
          allFiles: mergedFiles,
          lastSync: new Date().toISOString()
        });
      }
    } catch (err) {
      if (err.response?.status === 404) setItems([]);
      else console.error('Fetch error:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchContents();
  }, [user, githubToken, repoStatus, currentPath, refreshKey]);

  // Real-time Firestore Sync
  React.useEffect(() => {
    if (!firebaseUser) return;
    const unsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setFirestoreFiles(data.allFiles || []);
      }
    });
    return () => unsub();
  }, [firebaseUser]);

  // Filter items based on path from Firestore master list
  const displayItems = React.useMemo(() => {
    return firestoreFiles.filter(file => {
      const pathParts = file.path.split('/');
      const fileName = pathParts.pop();
      const parentPath = pathParts.join('/');
      return parentPath === currentPath;
    });
  }, [firestoreFiles, currentPath]);

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;
    
    const toastId = toast.loading('Creating folder...');
    try {
      const placeholderPath = currentPath 
        ? `${currentPath}/${folderName}/.keep` 
        : `${folderName}/.keep`;
      
      await axios.put(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${placeholderPath}`, {
        message: `Create folder ${folderName}`,
        content: btoa('') 
      }, {
        headers: { Authorization: `Bearer ${githubToken}` }
      });
      toast.success('Folder created successfully', { id: toastId });
      setTimeout(triggerRefresh, 1200);
    } catch (err) {
      toast.error(err.response?.status === 422 ? 'Folder already exists' : 'Failed to create folder', { id: toastId });
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    processFiles(files);
  };

  const processFiles = (files) => {
    const newUploads = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      progress: 0,
      status: 'pending',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    setUploadQueue(prev => [...prev, ...newUploads]);
  };

  const startUploads = async () => {
    const pending = uploadQueue.filter(u => u.status === 'pending');
    if (pending.length === 0) return;

    for (const item of pending) {
      setUploadQueue(prev => prev.map(u => u.id === item.id ? { ...u, status: 'uploading' } : u));
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target.result.split(',')[1];
        try {
          const uploadPath = currentPath ? `${currentPath}/${item.name}` : item.name;
          await axios.put(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${uploadPath}`, {
            message: `Upload ${item.name}`,
            content
          }, {
            headers: { Authorization: `Bearer ${githubToken}` }
          });
          
          setUploadQueue(prev => prev.map(u => u.id === item.id ? { ...u, status: 'completed', progress: 100 } : u));
          toast.success(`${item.name} uploaded`);
        } catch (err) {
          setUploadQueue(prev => prev.map(u => u.id === item.id ? { ...u, status: 'error' } : u));
          toast.error(`Failed to upload ${item.name}`);
        }
      };
      reader.readAsDataURL(item.file);
    }
    
    setTimeout(() => {
      setUploadQueue([]);
      triggerRefresh();
    }, 3000);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const fetchAllLeaves = async (item) => {
    if (item.type !== 'dir') return [item];
    
    // Use a cache buster for folder fetches to ensure we see new files immediately
    const cacheBuster = `?cb=${Date.now()}`;
    const resp = await axios.get(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(item.path)}${cacheBuster}`, {
      headers: { Authorization: `Bearer ${githubToken}` }
    });
    const subItems = Array.isArray(resp.data) ? resp.data : [resp.data];
    let leaves = [];
    for (const subItem of subItems) {
      const subLeaves = await fetchAllLeaves(subItem);
      leaves = [...leaves, ...subLeaves];
    }
    return leaves;
  };

  const handleDelete = async () => {
    if (selectedFiles.length === 0) return;
    if (!window.confirm(`Delete ${selectedFiles.length} item(s)? Note: This will delete folders and ALL their contents permanently.`)) return;
    
    const toastId = toast.loading('Calculated items to delete...');
    try {
      let allFilesToDelete = [];
      for (const path of selectedFiles) {
        const item = items.find(i => i.path === path);
        if (item) {
          const leaves = await fetchAllLeaves(item);
          allFilesToDelete = [...allFilesToDelete, ...leaves];
        }
      }

      toast.loading(`Deleting ${allFilesToDelete.length} files...`, { id: toastId });

      for (const file of allFilesToDelete) {
        await axios.delete(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(file.path)}`, {
          headers: { Authorization: `Bearer ${githubToken}` },
          data: { message: `Cleanup for deletion of ${file.path}`, sha: file.sha }
        });
      }

      // Sync Firestore by removing deleted items locally first
      if (firebaseUser) {
        const deletedPaths = allFilesToDelete.map(f => f.path);
        const updatedFiles = firestoreFiles.filter(f => !deletedPaths.includes(f.path));
        await updateDoc(doc(db, 'users', firebaseUser.uid), { allFiles: updatedFiles });
      }

      toast.success('Successfully deleted all items', { id: toastId });
      setTimeout(triggerRefresh, 1500);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Deletion failed. GitHub API limit or connection issue.', { id: toastId });
      triggerRefresh();
    }
  };

  const handleDoubleClick = async (file) => {
    if (file.type === 'dir') {
      setCurrentPath(file.path);
      return;
    }
    
    const toastId = toast.loading(`Opening ${file.name}...`);
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isMedia = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'mp4', 'webm', 'mp3', 'pdf'].includes(ext);

    try {
      if (isMedia) {
        const response = await axios.get(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(file.path)}`, {
          headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.raw' },
          responseType: 'blob'
        });
        const blobUrl = URL.createObjectURL(response.data);
        setPreviewFile({ ...file, dataUrl: blobUrl, mediaType: ext === 'pdf' ? 'pdf' : (['mp4', 'webm'].includes(ext) ? 'video' : 'image') });
      } else {
        const response = await axios.get(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(file.path)}`, {
          headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' }
        });
        const content = decodeURIComponent(escape(window.atob(response.data.content)));
        setEditingFile(file);
        setEditorContent(content);
      }
      toast.dismiss(toastId);
    } catch (err) {
       window.open(file.download_url, '_blank');
       toast.dismiss(toastId);
    }
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;
    setSaving(true);
    const toastId = toast.loading('Saving changes...');
    try {
      const content = window.btoa(unescape(encodeURIComponent(editorContent)));
      await axios.put(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${editingFile.path}`, {
        message: `Update ${editingFile.name}`,
        content,
        sha: editingFile.sha
      }, {
        headers: { Authorization: `Bearer ${githubToken}` }
      });
      toast.success('File saved', { id: toastId });
      setEditingFile(null);
      setTimeout(triggerRefresh, 1200);
    } catch (err) {
      toast.error('Save failed', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (file) => {
    const toastId = toast.loading(`Downloading ${file.name}...`);
    try {
      const response = await axios.get(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(file.path)}`, {
        headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.raw' },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Download started', { id: toastId });
    } catch (err) {
      toast.error('Download failed', { id: toastId });
    }
  };

  const handleRename = async (file) => {
    const newName = prompt('Enter new name:', file.name);
    if (!newName || newName === file.name) return;

    const toastId = toast.loading(`Renaming to ${newName}...`);
    try {
      // 1. Get current file content (SHA is needed for delete, content for new file)
      const res = await axios.get(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(file.path)}`, {
        headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' }
      });

      const newPath = file.path.replace(file.name, newName);

      // 2. Create new file with same content
      await axios.put(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(newPath)}`, {
        message: `Rename ${file.name} to ${newName}`,
        content: res.data.content
      }, {
        headers: { Authorization: `Bearer ${githubToken}` }
      });

      // 3. Delete old file
      await axios.delete(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(file.path)}`, {
        headers: { Authorization: `Bearer ${githubToken}` },
        data: { message: `Delete old file after rename`, sha: file.sha }
      });

      toast.success('Renamed successfully', { id: toastId });
      triggerRefresh();
    } catch (err) {
      toast.error('Rename failed', { id: toastId });
    }
  };

  const totalLimitBytes = 1024 * 1024 * 1024;
  const totalSizeBytes = firestoreFiles.reduce((acc, item) => acc + (item.size || 0), 0);
  const percentage = (totalSizeBytes / totalLimitBytes) * 100;

  const filteredItems = displayItems
    .filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .map(i => ({
      ...i,
      displaySize: i.type === 'dir' ? '--' : (i.size / 1024 < 1024 ? `${(i.size / 1024).toFixed(1)} KB` : `${(i.size / (1024 * 1024)).toFixed(1)} MB`)
    }));

  return (
    <div 
      className={`flex bg-[#f6f8fa] min-h-screen font-sans text-[#24292e] relative ${dragActive ? 'bg-blue-50' : ''}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      {dragActive && (
        <div className="fixed inset-0 z-[200] bg-[#0366d6]/10 border-4 border-dashed border-[#0366d6] flex items-center justify-center pointer-events-none">
          <div className="bg-white p-8 rounded shadow-2xl flex flex-col items-center gap-4">
            <FaUpload size={48} className="text-[#0366d6] animate-bounce" />
            <p className="text-xl font-bold text-[#0366d6]">Drop files to upload to {currentPath || 'Root'}</p>
          </div>
        </div>
      )}

      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        usedStorage={(totalSizeBytes/(1024*1024)).toFixed(1) + ' MB'}
        totalStorage="1 GB"
        percentage={percentage}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} activeView={activeView} />
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {(!isGithubConnected || repoStatus !== 'ready') ? (
            <div className="max-w-2xl mx-auto mt-12 p-10 bg-white border border-[#e1e4e8] rounded shadow-sm text-center">
              <div className="w-16 h-16 bg-[#f6f8fa] border border-[#e1e4e8] rounded flex items-center justify-center text-[#586069] mx-auto mb-6">
                {loading ? <FaSpinner className="animate-spin" /> : <FaDatabase size={24} />}
              </div>
              <h3 className="text-xl font-bold mb-2">Configure GitHub Backend</h3>
              <p className="text-[#586069] text-sm mb-8">Link your GitHub account to enable secure cloud storage powered by Git repositories.</p>
              <button 
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2ea44f] text-white text-sm font-semibold rounded hover:bg-[#2c974b] transition-colors"
                onClick={connectGithubAccount}
              >
                <FaShieldAlt /> {loading ? 'Connecting...' : 'Connect via GitHub'}
              </button>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto">
              {activeView === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white border border-[#e1e4e8] rounded p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4 text-[#586069]">
                      <FaHdd size={18} />
                      <span className="text-xs font-bold uppercase tracking-wider">Total Storage</span>
                    </div>
                    <div className="text-2xl font-bold">1.0 GB</div>
                    <p className="text-xs text-[#586069] mt-1">Enterprise Plan</p>
                  </div>
                  <div className="bg-white border border-[#e1e4e8] rounded p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4 text-[#0366d6]">
                      <FaLayerGroup size={18} />
                      <span className="text-xs font-bold uppercase tracking-wider">Used Space</span>
                    </div>
                    <div className="text-2xl font-bold">{(totalSizeBytes/(1024*1024)).toFixed(1)} MB</div>
                    <p className="text-xs text-[#586069] mt-1">{percentage.toFixed(2)}% Capacity</p>
                  </div>
                  <div className="bg-white border border-[#e1e4e8] rounded p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4 text-[#2ea44f]">
                      <FaCheck size={18} />
                      <span className="text-xs font-bold uppercase tracking-wider">Status</span>
                    </div>
                    <div className="text-2xl font-bold">Optimal</div>
                    <p className="text-xs text-[#586069] mt-1">All systems functional</p>
                  </div>
                </div>
              )}

              {(activeView === 'mystorage' || activeView === 'dashboard') && (
                <div className="bg-white border border-[#e1e4e8] rounded shadow-sm overflow-hidden">
                  <div className="px-6 py-4 flex items-center justify-between border-b border-[#e1e4e8] bg-[#fafbfc]">
                    <div className="flex items-center gap-3">
                      {currentPath && (
                        <button onClick={() => {
                          const parts = currentPath.split('/'); parts.pop(); setCurrentPath(parts.join('/'));
                        }} className="p-1.5 text-[#586069] hover:bg-[#f3f4f6] rounded"><FaArrowLeft size={12} /></button>
                      )}
                      <span className="text-sm font-semibold">{activeView === 'dashboard' ? 'Recent Files' : `/ ${currentPath || 'Root'}`}</span>
                    </div>
                    <div className="flex gap-2">
                      {selectedFiles.length > 0 && (
                        <button onClick={handleDelete} className="px-3 py-1.5 bg-white border border-[#d73a49] text-[#d73a49] text-xs font-semibold rounded hover:bg-[#feeef0] flex items-center gap-2"><FaTrash /> Delete</button>
                      )}
                      <>
                        <button onClick={handleCreateFolder} className="px-3 py-1.5 bg-white border border-[#e1e4e8] text-[#24292e] text-xs font-semibold rounded hover:bg-[#f3f4f6] flex items-center gap-2"><FaFolderPlus /> New Folder</button>
                        <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-[#2ea44f] text-white text-xs font-semibold rounded border border-[#2c974b] hover:bg-[#2c974b] flex items-center gap-2"><FaUpload /> Upload</button>
                      </>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-[#fafbfc] border-b border-[#e1e4e8] text-[#586069]">
                            <th className="px-6 py-3 font-semibold text-xs w-10">
                              <input 
                                type="checkbox" 
                                className="rounded border-[#e1e4e8]" 
                                onChange={(e) => setSelectedFiles(e.target.checked ? filteredItems.map(i => i.path) : [])} 
                                checked={filteredItems.length > 0 && selectedFiles.length === filteredItems.length} 
                              />
                            </th>
                            <th className="px-6 py-3 font-semibold text-xs">Name</th>
                            <th className="px-6 py-3 font-semibold text-xs text-right">Size</th>
                            <th className="px-6 py-3 font-semibold text-xs text-right w-16">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e1e4e8]">
                          {loading && filteredItems.length === 0 ? (
                            <tr><td colSpan="4" className="px-6 py-8 text-center text-[#586069]"><FaSpinner className="animate-spin inline mr-2" /> Initializing storage...</td></tr>
                          ) : filteredItems.length === 0 ? (
                            <tr><td colSpan="4" className="px-6 py-12 text-center text-[#586069]">
                              <div className="flex flex-col items-center gap-2">
                                <FaFolder size={32} className="text-[#e1e4e8]" />
                                <p>No files found in this directory.</p>
                              </div>
                            </td></tr>
                          ) : (
                            filteredItems.map((item, idx) => (
                              <tr key={idx} onDoubleClick={() => handleDoubleClick(item)} className={`hover:bg-[#f6f8fa] group cursor-pointer ${selectedFiles.includes(item.path) ? 'bg-[#f1f8ff]' : ''}`}>
                                <td className="px-6 py-3">
                                  <input 
                                    type="checkbox" 
                                    className="rounded border-[#e1e4e8]" 
                                    checked={selectedFiles.includes(item.path)} 
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      setSelectedFiles(prev => prev.includes(item.path) ? prev.filter(p => p !== item.path) : [...prev, item.path]);
                                    }} 
                                  />
                                </td>
                                <td className="px-6 py-3">
                                  <div className="flex items-center gap-3">
                                    {item.type === 'dir' ? <FaFolder className="text-[#0366d6]" /> : <FaFileAlt className="text-[#959da5]" />}
                                    <span className={item.type === 'dir' ? 'text-[#0366d6] font-medium hover:underline' : 'text-[#24292e]'}>{item.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-right text-[#586069] text-xs">{item.displaySize}</td>
                                <td className="px-6 py-3 text-right relative">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === idx ? null : idx); }}
                                    className="p-2 hover:bg-[#e1e4e8] rounded-full text-[#586069]"
                                  >
                                    <FaEllipsisV size={14} />
                                  </button>
                                  
                                  {activeMenu === idx && (
                                    <>
                                      <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)}></div>
                                      <div className="absolute right-6 top-10 w-44 bg-white border border-[#e1e4e8] rounded shadow-xl z-20 overflow-hidden py-1">
                                        <button onClick={(e) => { e.stopPropagation(); setActiveMenu(null); handleDoubleClick(item); }} className="w-full px-4 py-2 text-left text-xs hover:bg-[#f6f8fa] flex items-center gap-2">
                                          <FaEye className="text-[#586069]" /> Preview / Open
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setActiveMenu(null); handleDownload(item); }} className="w-full px-4 py-2 text-left text-xs hover:bg-[#f6f8fa] flex items-center gap-2">
                                          <FaDownload className="text-[#586069]" /> Download
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setActiveMenu(null); handleRename(item); }} className="w-full px-4 py-2 text-left text-xs hover:bg-[#f6f8fa] flex items-center gap-2">
                                          <FaEdit className="text-[#586069]" /> Rename
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setActiveMenu(null); setSelectedFiles([item.path]); handleDelete(); }} className="w-full px-4 py-2 text-left text-xs hover:bg-[#feeef0] text-[#d73a49] flex items-center gap-2">
                                          <FaTrash /> Delete
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                  </div>
                </div>
              )}

              {activeView === 'settings' && (
                <div className="bg-white border border-[#e1e4e8] rounded p-8 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 border-b pb-4">Account Settings</h3>
                  <div className="space-y-6 max-w-md">
                    <div>
                      <label className="block text-xs font-bold text-[#586069] uppercase mb-2">Connected Repository</label>
                      <div className="flex items-center gap-2 p-3 bg-[#f6f8fa] border border-[#e1e4e8] rounded text-sm text-[#24292e]">
                        <FaLayerGroup className="text-[#959da5]" />
                        {githubUsername}/{repository}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#586069] uppercase mb-2">Cloud Provider</label>
                      <div className="flex items-center gap-2 p-3 bg-[#f6f8fa] border border-[#e1e4e8] rounded text-sm text-[#24292e]">
                        <FaDatabase className="text-[#959da5]" />
                        GitHub API (Enterprise)
                      </div>
                    </div>
                    <div className="pt-4">
                      <button onClick={logout} className="px-4 py-2 bg-white border border-[#d73a49] text-[#d73a49] text-sm font-semibold rounded hover:bg-[#feeef0] transition-colors">
                        Sign Out of Session
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange} />
      
      {/* Upload Preview Queue */}
      {uploadQueue.length > 0 && (
        <div className="fixed bottom-6 right-6 w-80 bg-white border border-[#e1e4e8] rounded shadow-2xl z-[150] overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-[#fafbfc] border-b border-[#e1e4e8] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#586069]">Upload Queue ({uploadQueue.length})</span>
            <button onClick={() => setUploadQueue([])} className="text-[#586069] hover:text-[#d73a49]"><FaTimes size={12} /></button>
          </div>
          <div className="max-h-60 overflow-y-auto p-2 space-y-2">
            {uploadQueue.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-2 bg-[#f6f8fa] border border-[#e1e4e8] rounded">
                {item.preview ? (
                  <img src={item.preview} className="w-10 h-10 object-cover rounded border border-[#e1e4e8]" />
                ) : (
                  <div className="w-10 h-10 bg-white border border-[#e1e4e8] rounded flex items-center justify-center text-[#959da5]">
                    <FaFileAlt size={16} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.name}</p>
                  <div className="w-full bg-[#e1e4e8] h-1 rounded-full mt-1 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${item.status === 'error' ? 'bg-[#d73a49]' : item.status === 'completed' ? 'bg-[#2ea44f]' : 'bg-[#0366d6]'}`}
                      style={{ width: `${item.status === 'completed' ? 100 : item.status === 'uploading' ? 50 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="text-[10px] font-bold text-[#586069]">
                  {item.status === 'pending' && <span className="text-[#0366d6]">WAIT</span>}
                  {item.status === 'uploading' && <FaSpinner className="animate-spin" />}
                  {item.status === 'completed' && <FaCheck className="text-[#2ea44f]" />}
                  {item.status === 'error' && <FaTimes className="text-[#d73a49]" />}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-[#e1e4e8] bg-[#fafbfc]">
            <button 
              onClick={startUploads}
              disabled={uploadQueue.every(u => u.status !== 'pending')}
              className="w-full py-2 bg-[#2ea44f] text-white text-xs font-bold rounded hover:bg-[#2c974b] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FaUpload /> Confirm & Upload All
            </button>
          </div>
        </div>
      )}

      {/* Code Editor */}
      {editingFile && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl h-[80vh] flex flex-col rounded border border-[#e1e4e8] shadow-2xl">
            <div className="h-12 px-6 flex items-center justify-between border-b border-[#e1e4e8] bg-[#fafbfc]">
              <span className="text-sm font-semibold">{editingFile.name}</span>
              <div className="flex gap-2">
                <button onClick={() => setEditingFile(null)} className="px-3 py-1 bg-white border border-[#e1e4e8] rounded text-xs">Cancel</button>
                <button onClick={handleSaveFile} disabled={saving} className="px-4 py-1 bg-[#2ea44f] text-white rounded text-xs font-semibold">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
            <textarea className="flex-1 p-6 font-mono text-sm outline-none resize-none bg-[#fdfdfe]" value={editorContent} onChange={e => setEditorContent(e.target.value)} spellCheck="false" />
          </div>
        </div>
      )}

      {/* Media Preview */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
          <div className="bg-black max-w-4xl w-full max-h-[90vh] flex flex-col rounded overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="h-10 px-4 flex items-center justify-between bg-black/50 border-b border-white/10 text-white text-xs">
              <span>{previewFile.name}</span>
              <button onClick={() => setPreviewFile(null)}><FaTimes /></button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
              {previewFile.mediaType === 'image' && <img src={previewFile.dataUrl} className="max-w-full max-h-full" />}
              {previewFile.mediaType === 'video' && <video src={previewFile.dataUrl} controls className="max-w-full" />}
              {previewFile.mediaType === 'pdf' && <iframe src={previewFile.dataUrl} className="w-full h-full bg-white" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
