import React, { useRef } from 'react';
import { useGithub } from '../context/GithubContext';
import { doc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';
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
  FaSearch,
  FaEye,
  FaFilePdf,
  FaFileWord,
  FaFilePowerpoint,
  FaFileImage,
  FaFileVideo,
  FaFileCode,
  FaFileArchive
} from 'react-icons/fa';
import axios from 'axios';
import Sidebar from './Sidebar';
import Header from './Header';
import toast from 'react-hot-toast';

const getFileIcon = (fileName, type) => {
  if (type === 'dir') return <FaFolder className="text-[#0366d6]" />;
  const ext = fileName?.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return <FaFilePdf className="text-[#d73a49]" />;
    case 'doc':
    case 'docx': return <FaFileWord className="text-[#0366d6]" />;
    case 'ppt':
    case 'pptx': return <FaFilePowerpoint className="text-[#f97316]" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg': return <FaFileImage className="text-[#2ea44f]" />;
    case 'mp4':
    case 'webm':
    case 'mp3': return <FaFileVideo className="text-[#0366d6]" />;
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'html':
    case 'css':
    case 'json':
    case 'md': return <FaFileCode className="text-[#0366d6]" />;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
    case 'jar': return <FaFileArchive className="text-[#6a737d]" />;
    default: return <FaFileAlt className="text-[#959da5]" />;
  }
};

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
  const [detailsFile, setDetailsFile] = React.useState(null);
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
  const [sortBy, setSortBy] = React.useState('name'); // 'name', 'date', 'size'
  const [filterType, setFilterType] = React.useState('all'); // 'all', 'image', 'video', 'pdf', 'doc'
  
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

        // Reconcile Firestore files with GitHub: 
        // 1. Filter out files in the current folder that are no longer on GitHub
        const freshPaths = new Set(newFilesData.map(f => f.path));
        let reconciledFiles = firestoreFiles.filter(f => {
          const pathParts = f.path.split('/');
          const parentPath = pathParts.slice(0, -1).join('/');
          
          // Only perform cleanup for matches in the current path we just fetched
          if (parentPath === (currentPath || '')) {
            return freshPaths.has(f.path);
          }
          return true; // Keep files in other directories
        });

        // 2. Add or update files from the fresh GitHub fetch
        newFilesData.forEach(newFile => {
          const index = reconciledFiles.findIndex(f => f.path === newFile.path);
          if (index !== -1) reconciledFiles[index] = newFile;
          else reconciledFiles.push(newFile);
        });

        await updateDoc(doc(db, 'users', firebaseUser.uid), { 
          allFiles: reconciledFiles,
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
    if (activeView === 'dashboard') {
      // Show only top 5 recently modified files across all paths
      return [...firestoreFiles]
        .filter(f => f.type === 'file')
        .sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0))
        .slice(0, 5);
    }
    
    return firestoreFiles.filter(file => {
      const pathParts = file.path.split('/');
      const fileName = pathParts.pop();
      const parentPath = pathParts.join('/');
      return parentPath === currentPath;
    });
  }, [firestoreFiles, currentPath, activeView]);

  const handleCreateFolder = async () => {
    let folderName = prompt('Enter folder name:');
    if (!folderName) return;
    
    // Basic folder validation
    folderName = folderName.trim();
    if (folderName.includes('/') || folderName.includes('\\')) {
      return toast.error('Folder name cannot contain slashes');
    }
    if (folderName.length > 50) {
      return toast.error('Folder name is too long');
    }
    
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
    const MAX_FILE_SIZE_MB = 100; // Easily configurable limit
    const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024; 
    const BANNED_EXTENSIONS = ['exe', 'bat', 'sh', 'msi'];

    const validatedFiles = files.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
        return false;
      }
      
      if (BANNED_EXTENSIONS.includes(ext)) {
        toast.error(`${ext.toUpperCase()} files are restricted for security.`);
        return false;
      }

      if (file.name.length > 100) {
        toast.error(`Filename "${file.name}" is too long.`);
        return false;
      }

      return true;
    });

    if (validatedFiles.length === 0) return;

    const newUploads = validatedFiles.map(file => ({
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
          
          // Optimization: Update Firestore immediately after successful GitHub upload
          if (firebaseUser) {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const currentFiles = userSnap.data().allFiles || [];
              const newFileMeta = {
                path: uploadPath,
                type: 'file',
                lastModified: new Date().toISOString(),
                size: item.file.size
              };
              // Filter out if file already exists in metadata to avoid duplicates
              const updatedFiles = [...currentFiles.filter(f => f.path !== uploadPath), newFileMeta];
              await updateDoc(userRef, { allFiles: updatedFiles });
            }
          }
          
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
    
    // Media types
    const images = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
    const videos = ['mp4', 'webm'];
    const audios = ['mp3', 'wav', 'ogg'];
    const docs = ['pdf', 'html', 'htm'];
    const office = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
    const textFiles = ['txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'css', 'json', 'py', 'java', 'c', 'cpp', 'sh'];
    const binaryFiles = ['jar', 'exe', 'bin', 'zip', 'rar', '7z', 'tar', 'gz'];

    try {
      if (binaryFiles.includes(ext)) {
        toast.dismiss(toastId);
        toast.error('Binary files cannot be previewed. Please download them.');
        return;
      }

      if (images.includes(ext) || videos.includes(ext) || audios.includes(ext) || docs.includes(ext)) {
        // For PDFs, we want to try and show in iframe. 
        // We use 'blob' for images/videos/audio to avoid issues, but for PDF we can use the raw URL if allowed, or blob.
        const response = await axios.get(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(file.path)}`, {
          headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.raw' },
          responseType: 'blob'
        });
        
        const blob = new Blob([response.data], { type: ext === 'pdf' ? 'application/pdf' : response.data.type });
        const blobUrl = URL.createObjectURL(blob);
        
        let mediaType = 'unknown';
        if (images.includes(ext)) mediaType = 'image';
        else if (videos.includes(ext)) mediaType = 'video';
        else if (audios.includes(ext)) mediaType = 'audio';
        else if (ext === 'pdf') mediaType = 'pdf';
        else if (['html', 'htm'].includes(ext)) mediaType = 'html';

        toast.dismiss(toastId);
        setPreviewFile({ ...file, dataUrl: blobUrl, mediaType });
      } else if (office.includes(ext)) {
        // Office files usually can't be read as raw blobs and shown in browser.
        // Google Viewer needs a publicly accessible URL. 
        // If the repo is private, download_url will have a token.
        toast.dismiss(toastId);
        setPreviewFile({ ...file, dataUrl: file.download_url, mediaType: 'office' });
      } else {
        // Assume text and try to edit
        const response = await axios.get(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(file.path)}`, {
          headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' }
        });
        const content = decodeURIComponent(escape(window.atob(response.data.content)));
        toast.dismiss(toastId);
        setEditingFile(file);
        setEditorContent(content);
      }
    } catch (err) {
       console.error('Preview error:', err);
       toast.dismiss(toastId);
       window.open(file.download_url, '_blank');
    }
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;
    
    // Safety check for empty content
    if (!editorContent.trim() && !window.confirm('Save empty file?')) return;
    if (editorContent.length > 500000) {
      return toast.error('File content too large for web editor (Max 500KB)');
    }

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

  const filteredItems = React.useMemo(() => {
    let result = [...displayItems];

    // Search Filter
    if (searchQuery) {
      result = result.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Type Filter
    if (filterType !== 'all') {
      result = result.filter(i => {
        const ext = i.name.split('.').pop()?.toLowerCase();
        if (filterType === 'image') return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
        if (filterType === 'video') return ['mp4', 'webm'].includes(ext);
        if (filterType === 'pdf') return ext === 'pdf';
        if (filterType === 'doc') return ['doc', 'docx', 'txt', 'md'].includes(ext);
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'date') return new Date(b.lastModified || 0) - new Date(a.lastModified || 0);
      if (sortBy === 'size') return (b.size || 0) - (a.size || 0);
      return 0;
    });

    return result.map(i => ({
      ...i,
      displaySize: i.type === 'dir' ? '--' : (i.size / 1024 < 1024 ? `${(i.size / 1024).toFixed(1)} KB` : `${(i.size / (1024 * 1024)).toFixed(1)} MB`)
    }));
  }, [displayItems, searchQuery, filterType, sortBy]);

  return (
    <div 
      className={`flex bg-[#f6f8fa] min-h-screen font-sans text-[#24292e] relative transition-colors duration-300 ${dragActive ? 'bg-blue-50/50' : ''}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      {dragActive && (
        <div className="fixed inset-0 z-[200] bg-[#0366d6]/5 backdrop-blur-sm border-4 border-dashed border-[#0366d6]/30 flex items-center justify-center pointer-events-none transition-all duration-300">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 scale-110 animate-bounce">
            <FaUpload size={48} className="text-[#0366d6]" />
            <p className="text-xl font-bold text-[#0366d6]">Drop files to upload</p>
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
                  <div className="bg-white border border-[#e1e4e8] rounded-xl p-6 shadow-sm hover:shadow-md transition-all group cursor-default">
                    <div className="flex items-center gap-3 mb-4 text-[#586069]">
                      <FaHdd size={18} className="group-hover:text-[#24292e] transition-colors" />
                      <span className="text-xs font-bold uppercase tracking-wider">Total Storage</span>
                    </div>
                    <div className="text-2xl font-bold">1.0 GB</div>
                    <p className="text-xs text-[#586069] mt-1">Enterprise Plan</p>
                  </div>
                  <div className="bg-white border border-[#e1e4e8] rounded-xl p-6 shadow-sm hover:shadow-md transition-all group cursor-default">
                    <div className="flex items-center gap-3 mb-4 text-[#0366d6]">
                      <FaLayerGroup size={18} className="group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold uppercase tracking-wider">Used Space</span>
                    </div>
                    <div className="text-2xl font-bold">{(totalSizeBytes/(1024*1024)).toFixed(1)} MB</div>
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
              )}

              {(activeView === 'mystorage' || activeView === 'dashboard') && (
                <div className="bg-white border border-[#e1e4e8] rounded shadow-sm overflow-visible">
                  <div className="px-6 py-4 flex flex-col gap-4 border-b border-[#e1e4e8] bg-[#fafbfc] rounded-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {currentPath && (
                          <button onClick={() => {
                            const parts = currentPath.split('/'); parts.pop(); setCurrentPath(parts.join('/'));
                          }} className="p-1.5 text-[#586069] hover:bg-[#f3f4f6] rounded transition-colors"><FaArrowLeft size={12} /></button>
                        )}
                        <span className="text-sm font-semibold">{activeView === 'dashboard' ? 'Recent Files' : `/ ${currentPath || 'Root'}`}</span>
                      </div>
                      <div className="flex gap-2">
                        {selectedFiles.length > 0 && (
                          <button onClick={handleDelete} className="px-3 py-1.5 bg-white border border-[#d73a49] text-[#d73a49] text-xs font-semibold rounded hover:bg-[#feeef0] flex items-center gap-2 transition-colors"><FaTrash /> Delete</button>
                        )}
                        <>
                          <button onClick={handleCreateFolder} className="px-3 py-1.5 bg-white border border-[#e1e4e8] text-[#24292e] text-xs font-semibold rounded hover:bg-[#f3f4f6] flex items-center gap-2 transition-colors"><FaFolderPlus /> New Folder</button>
                          <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-[#2ea44f] text-white text-xs font-semibold rounded border border-[#2c974b] hover:bg-[#2c974b] flex items-center gap-2 transition-colors"><FaUpload /> Upload</button>
                        </>
                      </div>
                    </div>
                    
                    {/* Search and Filters Bar */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <div className="relative flex-1 min-w-[200px]">
                        <input 
                          type="text"
                          placeholder="Search files..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#e1e4e8] rounded-lg text-sm focus:ring-2 focus:ring-[#0366d6]/20 focus:border-[#0366d6] outline-none transition-all"
                        />
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#959da5]" size={14} />
                      </div>
                      
                      <select 
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-[#e1e4e8] rounded-lg text-xs font-medium text-[#586069] outline-none hover:border-[#0366d6] transition-colors cursor-pointer"
                      >
                        <option value="all">All Types</option>
                        <option value="image">Images</option>
                        <option value="video">Videos</option>
                        <option value="pdf">PDFs</option>
                        <option value="doc">Documents</option>
                      </select>

                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-[#e1e4e8] rounded-lg text-xs font-medium text-[#586069] outline-none hover:border-[#0366d6] transition-colors cursor-pointer"
                      >
                        <option value="name">Sort by Name</option>
                        <option value="date">Sort by Recent</option>
                        <option value="size">Sort by Size</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-visible">
                      <table className="w-full text-left text-sm border-separate border-spacing-0">
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
                              <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
                                <FaFolder size={32} className="text-[#e1e4e8]" />
                                <p>No files found in this directory.</p>
                              </div>
                            </td></tr>
                          ) : (
                            filteredItems.map((item, idx) => (
                              <tr 
                                key={idx} 
                                onDoubleClick={() => handleDoubleClick(item)} 
                                className={`hover:bg-[#f6f8fbb0] group cursor-pointer transition-colors duration-150 ${selectedFiles.includes(item.path) ? 'bg-[#f1f8ff]' : ''}`}
                              >
                                <td className="px-6 py-3">
                                  <input 
                                    type="checkbox" 
                                    className="rounded border-[#e1e4e8] transition-all group-hover:border-[#0366d6]" 
                                    checked={selectedFiles.includes(item.path)} 
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      setSelectedFiles(prev => prev.includes(item.path) ? prev.filter(p => p !== item.path) : [...prev, item.path]);
                                    }} 
                                  />
                                </td>
                                <td className="px-6 py-3">
                                  <div className="flex items-center gap-3 transition-transform duration-200 group-hover:translate-x-1">
                                    {getFileIcon(item.name, item.type)}
                                    <span className={item.type === 'dir' ? 'text-[#0366d6] font-medium hover:underline' : 'text-[#24292e]'}>{item.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-right text-[#586069] text-xs font-medium">
                                  {item.displaySize}
                                </td>
                                <td className="px-6 py-3 text-right relative overflow-visible">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === idx ? null : idx); }}
                                    className="p-2 hover:bg-[#e1e4e8] rounded-full text-[#586069] transition-colors"
                                  >
                                    <FaEllipsisV size={14} />
                                  </button>
                                  
                                  {activeMenu === idx && (
                                    <>
                                      <div className="fixed inset-0 z-[100]" onClick={() => setActiveMenu(null)}></div>
                                      <div className="absolute right-6 top-0 w-48 bg-white border border-[#e1e4e8] rounded shadow-xl z-[101] overflow-hidden py-1 translate-x-0">
                                        <button onClick={(e) => { e.stopPropagation(); setActiveMenu(null); handleDoubleClick(item); }} className="w-full px-4 py-2.5 text-left text-xs hover:bg-[#f6f8fa] flex items-center gap-3 transition-colors">
                                          <FaEye className="text-[#586069] w-4" /> Preview / Open
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setActiveMenu(null); setDetailsFile(item); }} className="w-full px-4 py-2.5 text-left text-xs hover:bg-[#f6f8fa] flex items-center gap-3 transition-colors">
                                          <FaLayerGroup className="text-[#586069] w-4" /> Properties
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setActiveMenu(null); handleDownload(item); }} className="w-full px-4 py-2.5 text-left text-xs hover:bg-[#f6f8fa] flex items-center gap-3 transition-colors">
                                          <FaDownload className="text-[#586069] w-4" /> Download
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setActiveMenu(null); handleRename(item); }} className="w-full px-4 py-2.5 text-left text-xs hover:bg-[#f6f8fa] flex items-center gap-3 transition-colors">
                                          <FaEdit className="text-[#586069] w-4" /> Rename
                                        </button>
                                        <div className="h-[1px] bg-[#e1e4e8] my-1"></div>
                                        <button onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setActiveMenu(null); 
                                          const deleteItem = async () => {
                                            if (!window.confirm(`Delete "${item.name}"?`)) return;
                                            const toastId = toast.loading(`Deleting ${item.name}...`);
                                            try {
                                              const leaves = await fetchAllLeaves(item);
                                              for (const file of leaves) {
                                                await axios.delete(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(file.path)}`, {
                                                  headers: { Authorization: `Bearer ${githubToken}` },
                                                  data: { message: `Delete ${file.path}`, sha: file.sha }
                                                });
                                              }
                                              const deletedPaths = leaves.map(f => f.path);
                                              const updatedFiles = firestoreFiles.filter(f => !deletedPaths.includes(f.path));
                                              await updateDoc(doc(db, 'users', firebaseUser.uid), { allFiles: updatedFiles });
                                              toast.success('Deleted successfully', { id: toastId });
                                              setTimeout(triggerRefresh, 1500);
                                            } catch (err) {
                                              toast.error('Deletion failed', { id: toastId });
                                            }
                                          };
                                          deleteItem();
                                        }} className="w-full px-4 py-2.5 text-left text-xs hover:bg-[#feeef0] text-[#d73a49] flex items-center gap-3 transition-colors font-semibold">
                                          <FaTrash className="w-4" /> Delete
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
              <div key={item.id} className="flex items-center gap-3 p-2 bg-[#f6f8fa] border border-[#e1e4e8] rounded-lg transition-all animate-in slide-in-from-right-full duration-300">
                {item.preview ? (
                  <img src={item.preview} className="w-10 h-10 object-cover rounded shadow-sm border border-[#e1e4e8]" />
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
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center sm:p-4 backdrop-blur-sm transition-all duration-300 animate-in fade-in" onClick={() => setPreviewFile(null)}>
          <div className="bg-[#0d1117] w-full h-full sm:max-w-[95vw] sm:max-h-[95vh] flex flex-col sm:rounded-xl overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="h-12 px-6 flex items-center justify-between bg-[#161b22] border-b border-white/10 text-white">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-md">{previewFile.name}</span>
                <span className="text-[10px] px-2 py-0.5 bg-white/10 rounded-full text-white/60 uppercase tracking-widest leading-none">
                  {previewFile.mediaType}
                </span>
              </div>
              <button 
                onClick={() => setPreviewFile(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
              >
                <FaTimes size={18} />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden relative bg-[#090c10]">
              {previewFile.mediaType === 'image' && <img src={previewFile.dataUrl} className="max-w-full max-h-full object-contain" alt="Preview" />}
              {previewFile.mediaType === 'video' && <video src={previewFile.dataUrl} controls autoPlay className="max-w-full max-h-full" />}
              {previewFile.mediaType === 'audio' && (
                <div className="bg-[#161b22] p-12 rounded-2xl flex flex-col items-center gap-8 border border-white/10 shadow-2xl">
                  <div className="w-24 h-24 bg-[#1f6feb] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(31,111,235,0.3)] animate-pulse">
                    <FaFileVideo size={40} className="text-white" />
                  </div>
                  <audio src={previewFile.dataUrl} controls autoPlay className="w-80" />
                </div>
              )}
              {previewFile.mediaType === 'pdf' && (
                <object 
                  data={previewFile.dataUrl} 
                  type="application/pdf" 
                  className="w-full h-full bg-white rounded-lg"
                >
                  <div className="flex flex-col items-center justify-center h-full text-white p-8 text-center bg-[#0d1117]">
                    <FaFilePdf size={64} className="mb-6 text-[#f85149]" />
                    <h3 className="text-xl font-bold mb-2">Enhanced PDF Viewer</h3>
                    <p className="mb-8 text-white/60 max-w-sm">Direct preview is restricted. Open the document in a full window to view all pages and features.</p>
                    <button 
                      onClick={() => window.open(previewFile.dataUrl, '_blank')}
                      className="px-8 py-3 bg-[#1f6feb] hover:bg-[#388bfd] text-white rounded-lg font-bold transition-all shadow-lg"
                    >
                      Open Document
                    </button>
                  </div>
                </object>
              )}
              {previewFile.mediaType === 'html' && (
                <div className="w-full h-full bg-white rounded overflow-hidden shadow-2xl flex flex-col">
                  <div className="bg-[#f1f1f1] px-4 py-2 text-[10px] text-[#555] border-b border-[#ddd] flex items-center gap-2">
                    <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div><div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div><div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div></div>
                    <span className="font-mono">Rendered Preview</span>
                  </div>
                  <iframe src={previewFile.dataUrl} title="HTML Preview" className="w-full flex-1" />
                </div>
              )}
              {previewFile.mediaType === 'office' && (
                <div className="w-full h-full bg-[#f6f8fa] flex flex-col items-center justify-center p-8 text-center">
                   <div className="bg-white p-10 rounded-xl shadow-2xl border border-[#e1e4e8] max-w-sm">
                      <FaFileWord size={64} className="mx-auto mb-6 text-[#0366d6]" />
                      <h3 className="text-xl font-bold mb-2">Office Document</h3>
                      <p className="text-[#586069] text-sm mb-8">
                        Direct preview for {previewFile.name.split('.').pop().toUpperCase()} files is restricted for security. 
                        You can view it using Google Docs or download it.
                      </p>
                      <div className="flex flex-col gap-3">
                        <button 
                          onClick={() => window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(previewFile.dataUrl)}`, '_blank')}
                          className="w-full py-2.5 bg-[#0366d6] text-white rounded font-semibold hover:bg-[#0256b9]"
                        >
                          View via Google Docs
                        </button>
                        <button 
                          onClick={() => handleDownload(previewFile)}
                          className="w-full py-2.5 border border-[#e1e4e8] text-[#24292e] rounded font-semibold hover:bg-[#f6f8fa]"
                        >
                          Download File
                        </button>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details Side Panel */}
      {detailsFile && (
        <div className="fixed inset-0 bg-black/20 z-[110] flex justify-end" onClick={() => setDetailsFile(null)}>
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#e1e4e8] flex items-center justify-between bg-[#fafbfc]">
              <h3 className="font-bold text-gray-900">File Details</h3>
              <button onClick={() => setDetailsFile(null)} className="p-2 hover:bg-[#f3f4f6] rounded transition-colors">
                <FaTimes className="text-[#586069]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <div className="flex flex-col items-center mb-10 text-center">
                <div className="w-20 h-20 bg-[#f6f8fa] border border-[#e1e4e8] rounded-2xl flex items-center justify-center text-[#0366d6] mb-4 shadow-sm">
                  {detailsFile.type === 'dir' ? <FaFolder size={40} /> : <FaFileAlt size={40} className="text-[#959da5]" />}
                </div>
                <h4 className="text-lg font-bold text-gray-900 break-all">{detailsFile.name}</h4>
                <p className="text-sm text-[#586069] mt-1">{detailsFile.type === 'dir' ? 'Folder' : 'Document'}</p>
              </div>

              <div className="space-y-6">
                <div>
                  <h5 className="text-[10px] uppercase font-bold text-[#586069] tracking-widest mb-2 px-1">Meta Information</h5>
                  <div className="bg-[#f6f8fa] border border-[#e1e4e8] rounded-xl overflow-hidden divide-y divide-[#e1e4e8]">
                    <div className="flex justify-between px-4 py-3 text-sm">
                      <span className="text-[#586069]">Size</span>
                      <span className="font-semibold">{detailsFile.displaySize}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3 text-sm">
                      <span className="text-[#586069]">Type</span>
                      <span className="font-semibold uppercase text-[10px] bg-[#e1e4e8] px-2 py-0.5 rounded">{detailsFile.name.split('.').pop() || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3 text-sm">
                      <span className="text-[#586069]">SHA-1</span>
                      <span className="font-mono text-[10px] text-[#0366d6] truncate ml-4 max-w-[140px] bg-white px-2 py-1 rounded border border-[#e1e4e8]" title={detailsFile.sha}>
                        {detailsFile.sha}
                      </span>
                    </div>
                    <div className="flex justify-between px-4 py-3 text-sm">
                      <span className="text-[#586069]">Modified</span>
                      <span className="font-semibold">{detailsFile.lastModified ? new Date(detailsFile.lastModified).toLocaleString() : 'Just now'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-[10px] uppercase font-bold text-[#586069] tracking-widest mb-2 px-1">Location</h5>
                  <div className="bg-[#f6f8fa] border border-[#e1e4e8] rounded-xl p-4">
                    <p className="text-xs font-mono text-[#586069] break-all leading-relaxed">
                      {detailsFile.path}
                    </p>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <button 
                    onClick={() => { window.open(detailsFile.download_url || '#', '_blank'); }}
                    disabled={detailsFile.type === 'dir'}
                    className="w-full py-2.5 bg-[#2ea44f] text-white text-sm font-semibold rounded-lg hover:bg-[#2c974b] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <FaDownload size={14} /> Download File
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 bg-[#fafbfc] border-t border-[#e1e4e8]">
              <p className="text-[10px] text-[#586069] text-center italic">
                Verified via GitHub Enterprise Blockchain
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
