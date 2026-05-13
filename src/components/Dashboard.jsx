import React, { useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  FaFileArchive,
  FaPlus
} from 'react-icons/fa';
import axios from 'axios';
import Sidebar from './Sidebar';
import Header from './Header';
import FilePreview from './FilePreview';
import toast from 'react-hot-toast';
import Overview from './dashboard/Overview';
import AllFiles from './dashboard/AllFiles';
import Settings from './dashboard/Settings';
import { STORAGE_CONFIG, formatBytes } from '../config/commonUtils';

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
    repositories,
    repoStatus,
    isGithubConnected,
    connectGithubAccount,
    logout,
    switchActiveRepo,
    updateRepoName,
    deleteRepo,
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
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Map current path segments to internal view state
  const activeView = React.useMemo(() => {
    const path = location.pathname;
    if (path.includes('/dashboard/overview')) return 'dashboard';
    if (path.includes('/dashboard/all-files')) return 'mystorage';
    if (path.includes('/dashboard/settings')) return 'settings';
    return 'dashboard';
  }, [location.pathname]);

  // Handler for setting active view via route
  const setActiveView = (view) => {
    const route = view === 'dashboard' ? 'overview' : view === 'mystorage' ? 'all-files' : 'settings';
    navigate(`/dashboard/${route}`);
  };

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

        // Store files inside the specific repository object within the repositories array
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const updatedRepos = (userData.repositories || []).map(r => {
            if (r.name === repository) {
              return { ...r, files: reconciledFiles };
            }
            return r;
          });

          await updateDoc(userRef, { 
            repositories: updatedRepos,
            lastSync: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setItems([]);
        // The context handles removing the repository from the list
        // if checkOrCreateRepo fails with a 404.
      } else console.error('Fetch error:', err);
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
        const activeRepo = (data.repositories || []).find(r => r.name === repository);
        setFirestoreFiles(activeRepo?.files || []);
      }
    });
    return () => unsub();
  }, [firebaseUser, repository]);

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
    if (files.length > STORAGE_CONFIG.MAX_BATCH_UPLOAD_COUNT) {
      toast.error(`Maximum ${STORAGE_CONFIG.MAX_BATCH_UPLOAD_COUNT} files can be uploaded at once.`);
      return;
    }

    const MAX_FILE_SIZE = STORAGE_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024; 

    const validatedFiles = files.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds the ${STORAGE_CONFIG.MAX_FILE_SIZE_MB}MB limit.`);
        return false;
      }
      
      if (STORAGE_CONFIG.BANNED_EXTENSIONS.includes(ext)) {
        toast.error(`${ext.toUpperCase()} files are restricted for security.`);
        return false;
      }

      if (file.name.length > STORAGE_CONFIG.MAX_FILENAME_LENGTH) {
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
        const base64Content = event.target.result.split(',')[1];
        try {
          const uploadPath = currentPath ? `${currentPath}/${item.name}` : item.name;
          
          // 1. Create a Blob (GitHub supports up to 100MB via Blobs)
          const blobRes = await axios.post(`https://api.github.com/repos/${githubUsername}/${repository}/git/blobs`, {
            content: base64Content,
            encoding: 'base64'
          }, {
            headers: { Authorization: `Bearer ${githubToken}` }
          });
          const blobSha = blobRes.data.sha;

          // 2. Get the current commit SHA (to build on top of it)
          const refRes = await axios.get(`https://api.github.com/repos/${githubUsername}/${repository}/git/refs/heads/main`, {
            headers: { Authorization: `Bearer ${githubToken}` }
          });
          const lastCommitSha = refRes.data.object.sha;

          // 3. Create a Tree with the single new file
          // Note: base_tree is essential to keep existing files
          const treeRes = await axios.post(`https://api.github.com/repos/${githubUsername}/${repository}/git/trees`, {
            base_tree: lastCommitSha,
            tree: [{
              path: uploadPath,
              mode: '100644', // 100644 for blob (file), 100755 for executable, 040000 for subdirectory
              type: 'blob',
              sha: blobSha
            }]
          }, {
            headers: { Authorization: `Bearer ${githubToken}` }
          });
          const treeSha = treeRes.data.sha;

          // 4. Create a Commit
          const commitRes = await axios.post(`https://api.github.com/repos/${githubUsername}/${repository}/git/commits`, {
            message: `Upload ${item.name} via Blob API`,
            tree: treeSha,
            parents: [lastCommitSha]
          }, {
            headers: { Authorization: `Bearer ${githubToken}` }
          });
          const commitSha = commitRes.data.sha;

          // 5. Update the reference (push)
          await axios.patch(`https://api.github.com/repos/${githubUsername}/${repository}/git/refs/heads/main`, {
            sha: commitSha
          }, {
            headers: { Authorization: `Bearer ${githubToken}` }
          });
          
          // Optimization: Update Firestore immediately after successful GitHub upload
          if (firebaseUser) {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              const repositories = userData.repositories || [];
              const targetRepo = repositories.find(r => r.name === repository);
              const currentFiles = targetRepo?.files || [];
              
              const newFileMeta = {
                name: item.name,
                path: uploadPath,
                type: 'file',
                lastModified: new Date().toISOString(),
                size: item.file.size
              };
              
              // Filter out if file already exists in metadata to avoid duplicates
              const updatedFiles = [...currentFiles.filter(f => f.path !== uploadPath), newFileMeta];
              
              const updatedRepos = repositories.map(r => 
                r.name === repository ? { ...r, files: updatedFiles } : r
              );
              
              await updateDoc(userRef, { repositories: updatedRepos });
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
        
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const updatedRepos = (userData.repositories || []).map(r => 
            r.name === repository ? { ...r, files: updatedFiles } : r
          );
          await updateDoc(userRef, { repositories: updatedRepos });
        }
      }

      toast.success('Successfully deleted all items', { id: toastId });
      setTimeout(triggerRefresh, 1500);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Deletion failed. GitHub API limit or connection issue.', { id: toastId });
      triggerRefresh();
    }
  };

  const handleDoubleClick = (file) => {
    if (file.type === 'dir') {
      setCurrentPath(file.path);
      return;
    }
    
    // Open all files in the preview modal - let FilePreview component handle the logic
    setPreviewFile(file);
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

  const totalLimitBytes = STORAGE_CONFIG.TOTAL_CAPACITY_GB * 1024 * 1024 * 1024;
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
      const nameA = a?.name || '';
      const nameB = b?.name || '';
      if (sortBy === 'name') return nameA.localeCompare(nameB);
      if (sortBy === 'date') return new Date(b.lastModified || 0) - new Date(a.lastModified || 0);
      if (sortBy === 'size') return (b.size || 0) - (a.size || 0);
      return 0;
    });

    return result.map(i => ({
      ...i,
      displaySize: i.type === 'dir' ? '--' : formatBytes(i.size)
    }));
  }, [displayItems, searchQuery, filterType, sortBy]);

  return (
    <div 
      className={`flex flex-col md:flex-row bg-[#f6f8fa] min-h-screen font-sans text-[#24292e] relative transition-colors duration-300 ${dragActive ? 'bg-blue-50/50' : ''}`}
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
        usedStorage={formatBytes(totalSizeBytes)}
        totalStorage={`${STORAGE_CONFIG.TOTAL_CAPACITY_GB} GB`}
        percentage={percentage}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} activeView={activeView} />
        
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-8">
          {(!isGithubConnected || repoStatus !== 'ready') ? (
            <div className="w-full max-w-2xl mx-auto mt-8 p-4 sm:p-8 md:p-10 bg-white border border-[#e1e4e8] rounded shadow-sm text-center">
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
            <div className="w-full max-w-6xl mx-auto">
              {activeView === 'dashboard' && (
                <>
                  <Overview 
                    totalSizeBytes={totalSizeBytes} 
                    percentage={percentage} 
                    firestoreFiles={firestoreFiles}
                  />
                  <AllFiles 
                    currentPath={currentPath}
                    setCurrentPath={setCurrentPath}
                    selectedFiles={selectedFiles}
                    setSelectedFiles={setSelectedFiles}
                    handleDelete={handleDelete}
                    handleCreateFolder={handleCreateFolder}
                    fileInputRef={fileInputRef}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    filterType={filterType}
                    setFilterType={setFilterType}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    loading={loading}
                    filteredItems={filteredItems}
                    handleDoubleClick={handleDoubleClick}
                    getFileIcon={getFileIcon}
                    setDetailsFile={setDetailsFile}
                    activeView={activeView}
                  />
                </>
              )}

              {activeView === 'mystorage' && (
                <AllFiles 
                  currentPath={currentPath}
                  setCurrentPath={setCurrentPath}
                  selectedFiles={selectedFiles}
                  setSelectedFiles={setSelectedFiles}
                  handleDelete={handleDelete}
                  handleCreateFolder={handleCreateFolder}
                  fileInputRef={fileInputRef}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  filterType={filterType}
                  setFilterType={setFilterType}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  loading={loading}
                  filteredItems={filteredItems}
                  handleDoubleClick={handleDoubleClick}
                  getFileIcon={getFileIcon}
                  setDetailsFile={setDetailsFile}
                  activeView={activeView}
                />
              )}

              {activeView === 'settings' && (
                <Settings 
                  repositories={repositories}
                  repoName={repoName}
                  switchActiveRepo={switchActiveRepo}
                  updateRepoName={updateRepoName}
                  deleteRepo={deleteRepo}
                  githubUsername={githubUsername}
                  logout={logout}
                />
              )}
            </div>
          )}
        </div>
      </main>

      <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange} />
      
      {/* Upload Preview Queue */}
      {uploadQueue.length > 0 && (
        <div className="fixed bottom-2 right-2 w-[95vw] max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg bg-white border border-[#e1e4e8] rounded shadow-2xl z-[150] overflow-hidden flex flex-col">
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
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white w-full max-w-5xl h-[90vh] flex flex-col rounded border border-[#e1e4e8] shadow-2xl">
            <div className="h-12 px-2 sm:px-6 flex items-center justify-between border-b border-[#e1e4e8] bg-[#fafbfc]">
              <span className="text-sm font-semibold">{editingFile.name}</span>
              <div className="flex gap-2">
                <button onClick={() => setEditingFile(null)} className="px-3 py-1 bg-white border border-[#e1e4e8] rounded text-xs">Cancel</button>
                <button onClick={handleSaveFile} disabled={saving} className="px-4 py-1 bg-[#2ea44f] text-white rounded text-xs font-semibold">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
            <textarea className="flex-1 p-2 sm:p-6 font-mono text-sm outline-none resize-none bg-[#fdfdfe] min-w-0" value={editorContent} onChange={e => setEditorContent(e.target.value)} spellCheck="false" />
          </div>
        </div>
      )}

      {/* Media Preview */}
      {previewFile && (
        <FilePreview 
          file={previewFile}
          githubToken={githubToken}
          githubUsername={githubUsername}
          repository={repository}
          onClose={() => setPreviewFile(null)}
          onDownload={handleDownload}
        />
      )}

      {/* Details Side Panel */}
      {detailsFile && (
        <div className="fixed inset-0 bg-black/20 z-[110] flex justify-end items-end sm:items-stretch" onClick={() => setDetailsFile(null)}>
          <div className="bg-white w-full sm:max-w-md h-[90vh] sm:h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-[#e1e4e8] flex items-center justify-between bg-[#fafbfc]">
              <h3 className="font-bold text-gray-900">File Details</h3>
              <button onClick={() => setDetailsFile(null)} className="p-2 hover:bg-[#f3f4f6] rounded transition-colors">
                <FaTimes className="text-[#586069]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
              <div className="flex flex-col items-center mb-10 text-center">
                <div className="w-20 h-20 bg-[#f6f8fa] border border-[#e1e4e8] rounded-2xl flex items-center justify-center text-[#0366d6] mb-4 shadow-sm mx-auto">
                  {detailsFile.type === 'dir' ? <FaFolder size={40} /> : <FaFileAlt size={40} className="text-[#959da5]" />}
                </div>
                <h4 className="text-lg font-bold text-gray-900 break-all truncate max-w-full" title={detailsFile.name}>{detailsFile.name}</h4>
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
                    <p className="text-xs font-mono text-[#586069] break-all leading-relaxed truncate max-w-full" title={detailsFile.path}>
                      {detailsFile.path}
                    </p>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <button 
                    onClick={() => { handleDownload(detailsFile); }}
                    disabled={detailsFile.type === 'dir'}
                    className="w-full py-2.5 bg-[#2ea44f] text-white text-sm font-semibold rounded-lg hover:bg-[#2c974b] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <FaDownload size={14} /> Download File
                  </button>
                  <button 
                    onClick={() => { handleRename(detailsFile); setDetailsFile(null); }}
                    className="w-full py-2.5 bg-white border border-[#e1e4e8] text-[#24292e] text-sm font-semibold rounded-lg hover:bg-[#f6f8fa] transition-all flex items-center justify-center gap-2"
                  >
                    <FaEdit size={14} /> Rename Item
                  </button>
                  <button 
                    onClick={async () => { 
                      if (!window.confirm(`Delete "${detailsFile.name}"?`)) return;
                      const toastId = toast.loading(`Deleting ${detailsFile.name}...`);
                      try {
                        const leaves = await fetchAllLeaves(detailsFile);
                        for (const file of leaves) {
                          await axios.delete(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(file.path)}`, {
                            headers: { Authorization: `Bearer ${githubToken}` },
                            data: { message: `Delete ${file.path}`, sha: file.sha }
                          });
                        }
                        const deletedPaths = leaves.map(f => f.path);
                        const updatedFiles = firestoreFiles.filter(f => !deletedPaths.includes(f.path));
                        
                        const userRef = doc(db, 'users', firebaseUser.uid);
                        const userDoc = await getDoc(userRef);
                        if (userDoc.exists()) {
                          const userData = userDoc.data();
                          const updatedRepos = (userData.repositories || []).map(r => 
                            r.name === repository ? { ...r, files: updatedFiles } : r
                          );
                          await updateDoc(userRef, { repositories: updatedRepos });
                        }

                        toast.success('Deleted successfully', { id: toastId });
                        setDetailsFile(null);
                        setTimeout(triggerRefresh, 1500);
                      } catch (err) {
                        toast.error('Deletion failed', { id: toastId });
                      }
                    }}
                    className="w-full py-2.5 bg-white border border-[#d73a49] text-[#d73a49] text-sm font-semibold rounded-lg hover:bg-[#feeef0] transition-all flex items-center justify-center gap-2"
                  >
                    <FaTrash size={14} /> Delete Permanently
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
