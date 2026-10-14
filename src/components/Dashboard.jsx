import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGithub } from '../context/GithubContext';
import { doc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  FaSpinner,
  FaDatabase,
  FaShieldAlt,
  FaFolder,
  FaFileAlt,
  FaTimes,
  FaUpload,
  FaCheck,
  FaTrash,
  FaDownload,
  FaEdit,
  FaFilePdf,
  FaFileWord,
  FaFilePowerpoint,
  FaFileImage,
  FaFileVideo,
  FaFileCode,
  FaFileArchive,
  FaShareAlt,
  FaHistory
} from 'react-icons/fa';
import axios from 'axios';
import Sidebar from './Sidebar';
import Header from './Header';
import FilePreview from './FilePreview';
import toast from 'react-hot-toast';
import Overview from './dashboard/Overview';
import AllFiles from './dashboard/AllFiles';
import Settings from './dashboard/Settings';
import TrashBin from './dashboard/TrashBin';
import FileHistoryModal from './modals/FileHistoryModal';
import ShareModal from './modals/ShareModal';
import ShortcutsModal from './modals/ShortcutsModal';
import CodeEditorModal from './modals/CodeEditorModal';
import { STORAGE_CONFIG, formatBytes, sanitizeFileName } from '../config/commonUtils';
import { prepareSmartFile, blobToBase64, decompressBlobLossless } from '../config/smartSlicer';

const getFileIcon = (fileName, type) => {
  if (type === 'dir') return <FaFolder className="text-[#0366d6] dark:text-[#58a6ff]" />;
  const ext = fileName?.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return <FaFilePdf className="text-[#d73a49]" />;
    case 'doc':
    case 'docx': return <FaFileWord className="text-[#0366d6] dark:text-[#58a6ff]" />;
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
    case 'mp3': return <FaFileVideo className="text-[#8a63d2]" />;
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'html':
    case 'css':
    case 'json':
    case 'md': return <FaFileCode className="text-[#0366d6] dark:text-[#58a6ff]" />;
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

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFile, setEditingFile] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [detailsFile, setDetailsFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [historyModalFile, setHistoryModalFile] = useState(null);
  const [shareModalFile, setShareModalFile] = useState(null);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [starredPaths, setStarredPaths] = useState([]);
  const [trashItems, setTrashItems] = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read current folder path directly from URL query param (e.g. ?path=opencode-api)
  const urlPath = searchParams.get('path') || '';
  const [currentPath, setCurrentPathState] = useState(urlPath);

  // Sync state if URL changes (e.g. back/forward browser buttons or direct navigation)
  useEffect(() => {
    setCurrentPathState(urlPath);
  }, [urlPath]);

  // Folder navigation setter that persists path to the URL
  const setCurrentPath = useCallback((newPath) => {
    const trimmed = (newPath || '').trim();
    setCurrentPathState(trimmed);
    setSearchParams(prev => {
      const nextParams = new URLSearchParams(prev);
      if (trimmed) {
        nextParams.set('path', trimmed);
      } else {
        nextParams.delete('path');
      }
      return nextParams;
    }, { replace: false });
  }, [setSearchParams]);
  
  // Map current route to view
  const activeView = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/dashboard/overview')) return 'dashboard';
    if (path.includes('/dashboard/all-files')) return 'mystorage';
    if (path.includes('/dashboard/starred')) return 'starred';
    if (path.includes('/dashboard/trash')) return 'trash';
    if (path.includes('/dashboard/settings')) return 'settings';
    return 'dashboard';
  }, [location.pathname]);

  const setActiveView = (view) => {
    const route = 
      view === 'dashboard' ? 'overview' : 
      view === 'mystorage' ? 'all-files' : 
      view === 'starred' ? 'starred' :
      view === 'trash' ? 'trash' : 'settings';
    navigate(`/dashboard/${route}`);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [firestoreFiles, setFirestoreFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [filterType, setFilterType] = useState('all');
  
  const fileInputRef = useRef(null);
  const repository = repoName || 'github-drive';

  // Starred toggle handler (global across all repositories)
  const toggleStar = (filePath) => {
    setStarredPaths(prev => {
      const next = prev.includes(filePath) ? prev.filter(p => p !== filePath) : [...prev, filePath];
      localStorage.setItem('starred_unified_drive', JSON.stringify(next));
      return next;
    });
  };

  // Load starred items
  useEffect(() => {
    try {
      const saved = localStorage.getItem('starred_unified_drive') || localStorage.getItem(`starred_${repository}`);
      if (saved) setStarredPaths(JSON.parse(saved));
    } catch (e) {}
  }, []);

  // Fetch trash items from Firestore user document (pooled across all repositories)
  const fetchTrashItems = async () => {
    if (!firebaseUser) return;
    setTrashLoading(true);
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        const allTrash = (data.repositories || []).flatMap(r => 
          (r.trash || []).map(t => ({ ...t, repoName: t.repoName || r.name }))
        );
        setTrashItems(allTrash);
      }
    } catch (e) {
      console.error('Error fetching trash', e);
    } finally {
      setTrashLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'trash') {
      fetchTrashItems();
    }
  }, [activeView, firebaseUser]);

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Open shortcuts dialog: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShortcutsModalOpen(prev => !prev);
      }
      // Upload: Ctrl+U
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        fileInputRef.current?.click();
      }
      // Close open modals on Escape
      if (e.key === 'Escape') {
        setHistoryModalFile(null);
        setShareModalFile(null);
        setShortcutsModalOpen(false);
        setPreviewFile(null);
        setEditingFile(null);
        setDetailsFile(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const queryClient = useQueryClient();

  // TanStack useQuery for fetching folder contents with automatic caching and retry
  const { data: remoteFolderItems = [], isLoading: folderLoading, refetch: refetchFolder } = useQuery({
    queryKey: ['folder-contents', repository, currentPath],
    queryFn: async () => {
      const cacheBuster = `?cb=${Date.now()}`;
      const url = currentPath 
        ? `https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(currentPath)}${cacheBuster}`
        : `https://api.github.com/repos/${githubUsername}/${repository}/contents${cacheBuster}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' }
      });
      const raw = Array.isArray(response.data) ? response.data : [response.data];
      // Filter out internal marker files and the internal .chunks directory
      return raw.filter(item => item.name !== '.keep' && item.name !== '.chunks' && !item.path.startsWith('.chunks'));
    },
    enabled: Boolean(repoStatus === 'ready' && user && githubToken && repository),
    staleTime: 1000 * 20, // 20 seconds
    retry: 2
  });

  // Sync remote folder items to firestoreFiles
  useEffect(() => {
    if (!remoteFolderItems || remoteFolderItems.length === 0) return;

    // Filter out any internal chunk directories from displaying
    const cleanRemoteItems = remoteFolderItems.filter(item => 
      item.name !== '.chunks' && !item.path.startsWith('.chunks')
    );

    const itemsWithDates = cleanRemoteItems.map(item => {
      const existing = firestoreFiles.find(f => f.path === item.path);
      return {
        ...item,
        // Preserve original size for chunked/compressed files instead of the manifest size
        size: existing?.isChunked ? existing.size : item.size,
        isChunked: existing?.isChunked || false,
        isCompressed: existing?.isCompressed || false,
        chunkPaths: existing?.chunkPaths || [],
        totalChunks: existing?.totalChunks || 0,
        lastModified: existing?.lastModified || new Date().toISOString()
      };
    });

    setItems(itemsWithDates);

    if (firebaseUser) {
      const newFilesData = itemsWithDates.map(i => {
        const existing = firestoreFiles.find(f => f.path === i.path);
        return {
          name: i.name, 
          path: i.path, 
          sha: i.sha, 
          // Keep true unchunked original size
          size: existing?.isChunked ? existing.size : i.size, 
          type: i.type,
          download_url: i.download_url, 
          lastModified: i.lastModified || null,
          repoName: repository,
          isChunked: existing?.isChunked || false,
          isCompressed: existing?.isCompressed || false,
          chunkPaths: existing?.chunkPaths || [],
          totalChunks: existing?.totalChunks || 0
        };
      });

      const freshPaths = new Set(newFilesData.map(f => f.path));
      let reconciledFiles = firestoreFiles
        // Also remove any stray .chunks entries from existing firestore records
        .filter(f => f.name !== '.chunks' && !f.path.startsWith('.chunks'))
        .filter(f => {
          const pathParts = f.path.split('/');
          const parentPath = pathParts.slice(0, -1).join('/');
          if (parentPath === (currentPath || '')) {
            return freshPaths.has(f.path);
          }
          return true;
        });

      newFilesData.forEach(newFile => {
        const index = reconciledFiles.findIndex(f => f.path === newFile.path);
        if (index !== -1) {
          reconciledFiles[index] = { ...reconciledFiles[index], ...newFile };
        } else {
          reconciledFiles.push(newFile);
        }
      });

      if (reconciledFiles.length !== firestoreFiles.length) {
        (async () => {
          try {
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
          } catch (e) {
            console.error('Reconciliation error:', e);
          }
        })();
      }
    }
  }, [remoteFolderItems]);

  const triggerRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
    queryClient.invalidateQueries({ queryKey: ['file-history'] });
    setRefreshKey(prev => prev + 1);
    setSelectedFiles([]);
  };

  // Real-time Firestore Sync (Unified Drive: pool all repositories)
  useEffect(() => {
    if (!firebaseUser) return;
    const unsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const repos = data.repositories || [];
        
        // Pool files across all repository partitions and ensure repoName tag
        const pooledFiles = repos.flatMap(r => 
          (r.files || []).map(f => ({
            ...f,
            repoName: f.repoName || r.name
          }))
        );

        // Deduplicate by path (if same file path exists, prefer the latest modified)
        const dedupedMap = new Map();
        pooledFiles.forEach(f => {
          if (!dedupedMap.has(f.path)) {
            dedupedMap.set(f.path, f);
          } else {
            const existing = dedupedMap.get(f.path);
            if (new Date(f.lastModified || 0) > new Date(existing.lastModified || 0)) {
              dedupedMap.set(f.path, f);
            }
          }
        });

        const pooledTrash = repos.flatMap(r => 
          (r.trash || []).map(t => ({
            ...t,
            repoName: t.repoName || r.name
          }))
        );

        setFirestoreFiles(Array.from(dedupedMap.values()));
        setTrashItems(pooledTrash);
      }
    });
    return () => unsub();
  }, [firebaseUser]);

  // Filter items based on active view and path
  const displayItems = useMemo(() => {
    // Always exclude internal chunk directories from user view
    const visibleFiles = firestoreFiles.filter(f => f.name !== '.chunks' && !f.path.startsWith('.chunks'));

    if (activeView === 'dashboard') {
      return [...visibleFiles]
        .filter(f => f.type === 'file')
        .sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0))
        .slice(0, 10);
    }
    
    if (activeView === 'starred') {
      return visibleFiles.filter(file => starredPaths.includes(file.path));
    }

    return visibleFiles.filter(file => {
      const pathParts = file.path.split('/');
      pathParts.pop();
      const parentPath = pathParts.join('/');
      return parentPath === currentPath;
    });
  }, [firestoreFiles, currentPath, activeView, starredPaths]);

  // TanStack useMutation for creating folders
  const createFolderMutation = useMutation({
    mutationFn: async (folderName) => {
      const placeholderPath = currentPath 
        ? `${currentPath}/${folderName}/.keep` 
        : `${folderName}/.keep`;
      
      return await axios.put(`https://api.github.com/repos/${githubUsername}/${repository}/contents/${placeholderPath}`, {
        message: `Create folder ${folderName}`,
        content: btoa('') 
      }, {
        headers: { Authorization: `Bearer ${githubToken}` }
      });
    },
    onSuccess: () => {
      toast.success('Folder created successfully');
      queryClient.invalidateQueries({ queryKey: ['folder-contents', repository] });
      setTimeout(triggerRefresh, 800);
    },
    onError: (err) => {
      toast.error(err.response?.status === 422 ? 'Folder already exists' : 'Failed to create folder');
    }
  });

  const handleCreateFolder = async () => {
    let folderName = prompt('Enter folder name:');
    if (!folderName) return;
    
    folderName = folderName.trim();
    if (folderName.includes('/') || folderName.includes('\\')) {
      return toast.error('Folder name cannot contain slashes');
    }
    if (folderName.length > 50) {
      return toast.error('Folder name is too long');
    }
    
    const toastId = toast.loading('Creating folder in GitHub...');
    try {
      await createFolderMutation.mutateAsync(folderName);
      toast.dismiss(toastId);
    } catch (err) {
      toast.dismiss(toastId);
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    processFiles(files);
  };

  const processFiles = (files) => {
    if (files.length > STORAGE_CONFIG.MAX_BATCH_UPLOAD_COUNT) {
      toast.error(`Maximum ${STORAGE_CONFIG.MAX_BATCH_UPLOAD_COUNT} files can be queued at once.`);
      return;
    }

    const MAX_FILE_SIZE = STORAGE_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024; 

    const validatedFiles = files.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      
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

    const newUploads = validatedFiles.map(file => {
      const safeName = sanitizeFileName(file.name);
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: safeName,
        originalName: file.name,
        progress: 0,
        status: 'pending',
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      };
    });
    setUploadQueue(prev => [...prev, ...newUploads]);
  };

  // Helper to read file as base64 with retry support
  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parts = e.target.result.split(',');
          const base64 = parts[1] || '';
          resolve(base64);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Helper with exponential backoff retry for Git API calls (rate-limit aware)
  const withRetry = async (fn, maxRetries = 3, delayMs = 1500) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        const status = err.response?.status;
        
        // Handle GitHub secondary rate limit (403 or 429)
        const isRateLimit = status === 429 || (status === 403 && err.response?.data?.message?.includes('rate limit'));
        if (isRateLimit) {
          const retryAfterSec = parseInt(err.response?.headers?.['retry-after'] || '5', 10);
          const waitTime = Math.max(retryAfterSec * 1000, 3000 * attempt);
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }

        // Don't retry non-recoverable client errors (400, 401, 404)
        if (status && [400, 401, 404].includes(status)) {
          throw err;
        }

        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, delayMs * Math.pow(2, attempt - 1)));
        }
      }
    }
    throw lastError;
  };

  // Memory-Safe, Fault-Tolerant Transactional Multi-File Upload
  const startUploads = async () => {
    const pending = uploadQueue.filter(u => u.status === 'pending' || u.status === 'error');
    if (pending.length === 0) return;

    const targetRepo = repoName || 'github-drive';
    const batchSize = STORAGE_CONFIG.MAX_BATCH_TRANSACTION_FILES || 25;
    const batchToProcess = pending.slice(0, batchSize);

    const toastId = toast.loading(`Preparing atomic upload for ${batchToProcess.length} file(s)...`);

    try {
      // Step 1: Mark current batch as uploading
      setUploadQueue(prev => prev.map(u => 
        batchToProcess.some(p => p.id === u.id) 
          ? { ...u, status: 'uploading', progress: 15, errorMsg: null } 
          : u
      ));

      // Step 2: Read & Upload Blobs in small throttled batches to conserve browser RAM
      const treeEntries = [];
      const uploadedMetas = [];
      const concurrency = STORAGE_CONFIG.MAX_CONCURRENT_BLOB_UPLOADS || 3;

      for (let i = 0; i < batchToProcess.length; i += concurrency) {
        const slice = batchToProcess.slice(i, i + concurrency);

        await Promise.all(
          slice.map(async (item) => {
            const uploadPath = currentPath ? `${currentPath}/${item.name}` : item.name;

            setUploadQueue(prev => prev.map(u => 
              u.id === item.id ? { ...u, progress: 25 } : u
            ));

            // Smart Slicer & Compressor Pipeline
            const smartResult = await prepareSmartFile(item.file, (stage, prog) => {
              setUploadQueue(prev => prev.map(u => 
                u.id === item.id ? { ...u, progress: prog } : u
              ));
            });

            if (smartResult.isChunked) {
              // Upload each chunk blob
              // Upload chunks with 3-way parallel concurrency for fast throughput
              const chunkTreeEntries = [];
              const chunkConcurrency = 3;
              for (let ci = 0; ci < smartResult.chunks.length; ci += chunkConcurrency) {
                const chunkSlice = smartResult.chunks.slice(ci, ci + chunkConcurrency);
                const sliceResults = await Promise.all(
                  chunkSlice.map(async (chunk) => {
                    const chunkBase64 = await blobToBase64(chunk.blob);
                    const chunkBlobRes = await withRetry(async () => {
                      return await axios.post(
                        `https://api.github.com/repos/${githubUsername}/${targetRepo}/git/blobs`,
                        { content: chunkBase64, encoding: 'base64' },
                        { headers: { Authorization: `Bearer ${githubToken}` } }
                      );
                    });
                    return {
                      path: chunk.path,
                      mode: '100644',
                      type: 'blob',
                      sha: chunkBlobRes.data.sha
                    };
                  })
                );

                chunkTreeEntries.push(...sliceResults);

                const currentDone = Math.min(ci + chunkConcurrency, smartResult.chunks.length);
                const chunkPct = 30 + Math.round((currentDone / smartResult.chunks.length) * 45);
                setUploadQueue(prev => prev.map(u => 
                  u.id === item.id ? { ...u, progress: chunkPct } : u
                ));
              }

              // Create manifest blob at destination path
              const manifestStr = JSON.stringify(smartResult.manifest, null, 2);
              const manifestBase64 = window.btoa(unescape(encodeURIComponent(manifestStr)));
              const manifestRes = await withRetry(async () => {
                return await axios.post(
                  `https://api.github.com/repos/${githubUsername}/${targetRepo}/git/blobs`,
                  { content: manifestBase64, encoding: 'base64' },
                  { headers: { Authorization: `Bearer ${githubToken}` } }
                );
              });

              treeEntries.push(...chunkTreeEntries);
              treeEntries.push({
                path: uploadPath,
                mode: '100644',
                type: 'blob',
                sha: manifestRes.data.sha
              });

              uploadedMetas.push({
                name: item.name,
                path: uploadPath,
                type: 'file',
                lastModified: new Date().toISOString(),
                size: smartResult.originalSize,
                storedSize: smartResult.storedSize,
                sha: manifestRes.data.sha,
                repoName: targetRepo,
                isChunked: true,
                isCompressed: smartResult.isCompressed,
                totalChunks: smartResult.totalChunks,
                chunkPaths: smartResult.manifest.chunkPaths
              });
            } else {
              // Normal single blob upload (losslessly compressed or raw)
              const base64 = await blobToBase64(smartResult.blob);

              setUploadQueue(prev => prev.map(u => 
                u.id === item.id ? { ...u, progress: 65 } : u
              ));

              const blobRes = await withRetry(async () => {
                return await axios.post(
                  `https://api.github.com/repos/${githubUsername}/${targetRepo}/git/blobs`,
                  { content: base64, encoding: 'base64' },
                  { headers: { Authorization: `Bearer ${githubToken}` } }
                );
              });

              const blobSha = blobRes.data.sha;
              treeEntries.push({
                path: uploadPath,
                mode: '100644',
                type: 'blob',
                sha: blobSha
              });

              uploadedMetas.push({
                name: item.name,
                path: uploadPath,
                type: 'file',
                lastModified: new Date().toISOString(),
                size: smartResult.originalSize,
                storedSize: smartResult.storedSize,
                sha: blobSha,
                repoName: targetRepo,
                isCompressed: smartResult.isCompressed,
                isChunked: false
              });
            }

            setUploadQueue(prev => prev.map(u => 
              u.id === item.id ? { ...u, progress: 85 } : u
            ));
          })
        );
      }

      // Step 3: Transactional Git Commit: Get branch head SHA, create Tree with all items, create single Commit
      toast.loading('Committing transaction to Git branch...', { id: toastId });

      // Fetch head ref
      const refRes = await withRetry(async () => {
        return await axios.get(
          `https://api.github.com/repos/${githubUsername}/${targetRepo}/git/refs/heads/main`,
          { headers: { Authorization: `Bearer ${githubToken}` } }
        );
      });
      const lastCommitSha = refRes.data.object.sha;

      // Create Tree containing ALL uploaded files in one atomic transaction
      const treeRes = await withRetry(async () => {
        return await axios.post(
          `https://api.github.com/repos/${githubUsername}/${targetRepo}/git/trees`,
          { base_tree: lastCommitSha, tree: treeEntries },
          { headers: { Authorization: `Bearer ${githubToken}` } }
        );
      });
      const treeSha = treeRes.data.sha;

      // Create Commit
      const fileNamesSummary = batchToProcess.map(p => p.name).join(', ');
      const commitRes = await withRetry(async () => {
        return await axios.post(
          `https://api.github.com/repos/${githubUsername}/${targetRepo}/git/commits`,
          {
            message: `Upload ${batchToProcess.length} file(s) via GitHub Drive [${fileNamesSummary.substring(0, 70)}]`,
            tree: treeSha,
            parents: [lastCommitSha]
          },
          { headers: { Authorization: `Bearer ${githubToken}` } }
        );
      });
      const commitSha = commitRes.data.sha;

      // Update Git ref atomically
      await withRetry(async () => {
        return await axios.patch(
          `https://api.github.com/repos/${githubUsername}/${targetRepo}/git/refs/heads/main`,
          { sha: commitSha },
          { headers: { Authorization: `Bearer ${githubToken}` } }
        );
      });

      // Step 4: Atomic Firestore metadata transaction
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const repos = userData.repositories || [];
          const target = repos.find(r => r.name === targetRepo);
          const currentFiles = target?.files || [];

          const uploadPathSet = new Set(uploadedMetas.map(m => m.path));
          const updatedFiles = [
            ...currentFiles.filter(f => !uploadPathSet.has(f.path)),
            ...uploadedMetas
          ];

          const updatedRepos = repos.map(r => 
            r.name === targetRepo ? { ...r, files: updatedFiles } : r
          );

          await updateDoc(userRef, { 
            repositories: updatedRepos,
            lastSync: new Date().toISOString()
          });
        }
      }

      // Mark batch items as completed
      setUploadQueue(prev => prev.map(u => 
        batchToProcess.some(p => p.id === u.id) 
          ? { ...u, status: 'completed', progress: 100 } 
          : u
      ));

      toast.success(`Successfully uploaded ${batchToProcess.length} file(s) atomically!`, { id: toastId });
      setTimeout(triggerRefresh, 800);
    } catch (err) {
      console.error('Transactional upload failed:', err);
      const is401 = err.response?.status === 401 || err.status === 401;
      const errMsg = is401 
        ? 'GitHub session expired (401 Unauthorized). Please reconnect your GitHub account.' 
        : (err.response?.data?.message || err.message || 'Network / Git error');

      // Atomic failure: set batch items to error state with clear error detail and retry availability
      setUploadQueue(prev => prev.map(u => 
        batchToProcess.some(p => p.id === u.id) 
          ? { ...u, status: 'error', progress: 0, errorMsg: errMsg } 
          : u
      ));

      if (is401) {
        toast.error('GitHub session expired. Please reconnect GitHub in the top bar.', { 
          id: toastId, 
          duration: 6000 
        });
      } else {
        toast.error(`Transactional upload failed: ${errMsg}`, { id: toastId });
      }
    }
  };

  // Drag-and-drop Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
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

  // Safe delete (Move to TrashBin)
  const handleDelete = async (explicitFiles = null) => {
    const targets = Array.isArray(explicitFiles) && explicitFiles.length > 0 
      ? explicitFiles 
      : selectedFiles;

    if (!targets || targets.length === 0) return;
    if (!window.confirm(`Move ${targets.length} item(s) to the Trash Bin?`)) return;
    
    const toastId = toast.loading('Moving to trash bin...');
    try {
      const itemsToTrash = [];
      const updatedFiles = firestoreFiles.filter(f => {
        if (targets.includes(f.path)) {
          itemsToTrash.push({
            ...f,
            deletedAt: new Date().toISOString(),
            originalPath: f.path,
            displaySize: f.type === 'dir' ? '--' : formatBytes(f.size)
          });
          return false;
        }
        return true;
      });

      // Also remove the file/manifest from the Git repository main branch so it disappears from drive
      await Promise.allSettled(
        itemsToTrash.map(async (item) => {
          const targetRepoName = item.repoName || repository;
          if (item.sha) {
            try {
              await axios.delete(
                `https://api.github.com/repos/${githubUsername}/${targetRepoName}/contents/${encodeURIComponent(item.path)}`,
                {
                  headers: { Authorization: `Bearer ${githubToken}` },
                  data: { message: `Move ${item.path} to trash`, sha: item.sha }
                }
              );
            } catch (err) {
              console.warn('Git delete on soft delete:', err);
            }
          }
        })
      );

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const repos = userData.repositories || [];
          
          const updatedRepos = repos.map(r => {
            const repoFilesToTrash = itemsToTrash.filter(t => (t.repoName || repository) === r.name);
            if (repoFilesToTrash.length === 0) return r;

            const trashPaths = new Set(repoFilesToTrash.map(t => t.path));
            const newFiles = (r.files || []).filter(f => !trashPaths.has(f.path));
            const newTrash = [...(r.trash || []), ...repoFilesToTrash];
            return { ...r, files: newFiles, trash: newTrash };
          });

          await updateDoc(userRef, { repositories: updatedRepos });
        }
      }

      toast.success('Moved to Trash Bin', { id: toastId });
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      setTimeout(triggerRefresh, 800);
    } catch (err) {
      console.error(err);
      toast.error('Failed to move items to trash', { id: toastId });
    }
  };

  // Restore item from trash
  const handleRestoreFromTrash = async (item) => {
    const toastId = toast.loading(`Restoring ${item.name}...`);
    try {
      const targetRepoName = item.repoName || repository;
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const targetRepo = (userData.repositories || []).find(r => r.name === targetRepoName);
          const newTrash = (targetRepo?.trash || []).filter(t => t.path !== item.path);
          const currentFiles = targetRepo?.files || [];
          
          const restoredItem = { ...item };
          delete restoredItem.deletedAt;
          delete restoredItem.originalPath;
          delete restoredItem.repoName;

          const newFiles = [...currentFiles.filter(f => f.path !== item.path), restoredItem];

          const updatedRepos = (userData.repositories || []).map(r => 
            r.name === targetRepoName ? { ...r, files: newFiles, trash: newTrash } : r
          );
          await updateDoc(userRef, { repositories: updatedRepos });
        }
      }
      toast.success(`${item.name} restored to drive!`, { id: toastId });
      fetchTrashItems();
    } catch (e) {
      toast.error('Failed to restore file', { id: toastId });
    }
  };

  // TanStack useMutation for permanent deletion
  const permanentDeleteMutation = useMutation({
    mutationFn: async (item) => {
      const targetRepoName = item.repoName || repository;
      // If it's a chunked file, also wipe its underlying binary chunk blobs from GitHub
      let chunkPathsToDelete = Array.isArray(item.chunkPaths) ? item.chunkPaths : [];
      if (chunkPathsToDelete.length === 0) {
        // Try reading manifest to find chunks if not in memory
        try {
          const res = await axios.get(
            `https://api.github.com/repos/${githubUsername}/${targetRepoName}/contents/${encodeURIComponent(item.path)}`,
            { headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.raw' }, responseType: 'text' }
          );
          if (typeof res.data === 'string' && res.data.includes('smart_slicer_manifest')) {
            const parsed = JSON.parse(res.data);
            if (Array.isArray(parsed.chunkPaths)) {
              chunkPathsToDelete = parsed.chunkPaths;
            }
          }
        } catch (e) {}
      }

      // Delete all chunks concurrently
      if (chunkPathsToDelete.length > 0) {
        await Promise.allSettled(
          chunkPathsToDelete.map(async (cPath) => {
            try {
              const cRes = await axios.get(
                `https://api.github.com/repos/${githubUsername}/${targetRepoName}/contents/${encodeURIComponent(cPath)}`,
                { headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' } }
              );
              if (cRes.data?.sha) {
                await axios.delete(
                  `https://api.github.com/repos/${githubUsername}/${targetRepoName}/contents/${encodeURIComponent(cPath)}`,
                  {
                    headers: { Authorization: `Bearer ${githubToken}` },
                    data: { message: `Wipe chunk ${cPath}`, sha: cRes.data.sha }
                  }
                );
              }
            } catch (err) {}
          })
        );
      }

      // Delete the main file/manifest
      if (item.sha) {
        await axios.delete(`https://api.github.com/repos/${githubUsername}/${targetRepoName}/contents/${encodeURIComponent(item.path)}`, {
          headers: { Authorization: `Bearer ${githubToken}` },
          data: { message: `Wipe ${item.path}`, sha: item.sha }
        });
      }

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const targetRepo = (userData.repositories || []).find(r => r.name === targetRepoName);
          const newTrash = (targetRepo?.trash || []).filter(t => t.path !== item.path);
          const updatedRepos = (userData.repositories || []).map(r => 
            r.name === targetRepoName ? { ...r, trash: newTrash } : r
          );
          await updateDoc(userRef, { repositories: updatedRepos });
        }
      }
      return item;
    },
    onSuccess: (item) => {
      toast.success(`"${item.name}" permanently removed`);
      fetchTrashItems();
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
    },
    onError: () => {
      toast.error('Failed to wipe file');
    }
  });

  // Permanent Delete
  const handlePermanentDelete = async (item) => {
    if (!window.confirm(`Permanently wipe "${item.name}" from Git repository? This cannot be undone.`)) return;
    const toastId = toast.loading(`Permanently deleting ${item.name}...`);
    try {
      await permanentDeleteMutation.mutateAsync(item);
      toast.dismiss(toastId);
    } catch (e) {
      toast.dismiss(toastId);
    }
  };

  // Empty entire trash
  const handleEmptyTrash = async () => {
    if (!window.confirm('Empty entire Trash Bin? All recovery items will be permanently erased.')) return;
    const toastId = toast.loading('Emptying trash...');
    try {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const updatedRepos = (userData.repositories || []).map(r => ({ ...r, trash: [] }));
          await updateDoc(userRef, { repositories: updatedRepos });
        }
      }
      setTrashItems([]);
      toast.success('Trash emptied', { id: toastId });
    } catch (e) {
      toast.error('Failed to empty trash', { id: toastId });
    }
  };

  const handleDoubleClick = (file) => {
    if (file.type === 'dir') {
      setCurrentPath(file.path);
      return;
    }
    setPreviewFile(file);
  };

  const handleOpenEdit = async (file, preloadedContent = null) => {
    if (!file) return;

    // Guard: Prevent huge / binary / chunked files from loading into text editor
    if (file.isChunked || file.size > 1024 * 500) {
      return toast.error('This file is too large or binary to edit in the web code editor (Max 500KB text).');
    }

    if (preloadedContent !== null && preloadedContent !== undefined && preloadedContent !== '') {
      setEditorContent(preloadedContent);
      setEditingFile(file);
      return;
    }

    const targetRepo = file.repoName || repository;
    const toastId = toast.loading(`Opening ${file.name}...`);
    try {
      const res = await axios.get(
        `https://api.github.com/repos/${githubUsername}/${targetRepo}/contents/${encodeURIComponent(file.path)}`,
        { headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' } }
      );
      
      let text = '';
      if (res.data?.content) {
        const cleanBase64 = res.data.content.replace(/\s/g, '');
        try {
          text = decodeURIComponent(escape(window.atob(cleanBase64)));
        } catch (decErr) {
          text = window.atob(cleanBase64);
        }
      }

      setEditorContent(text);
      setEditingFile({ ...file, sha: res.data.sha || file.sha, repoName: targetRepo });
      toast.dismiss(toastId);
    } catch (err) {
      // Fallback to raw text fetch
      try {
        const rawRes = await axios.get(
          `https://api.github.com/repos/${githubUsername}/${targetRepo}/contents/${encodeURIComponent(file.path)}`,
          { headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.raw' }, responseType: 'text' }
        );
        const text = typeof rawRes.data === 'string' ? rawRes.data : JSON.stringify(rawRes.data, null, 2);
        setEditorContent(text);
        setEditingFile({ ...file, repoName: targetRepo });
        toast.dismiss(toastId);
      } catch (err2) {
        toast.error('Failed to load file content for editing', { id: toastId });
      }
    }
  };

  // TanStack useMutation for saving/committing files
  const saveFileMutation = useMutation({
    mutationFn: async ({ targetRepo, path, sha, contentToSave, fileName }) => {
      const content = window.btoa(unescape(encodeURIComponent(contentToSave)));
      return await axios.put(`https://api.github.com/repos/${githubUsername}/${targetRepo}/contents/${path}`, {
        message: `Update ${fileName} via GitHub Drive Editor`,
        content,
        sha
      }, {
        headers: { Authorization: `Bearer ${githubToken}` }
      });
    },
    onSuccess: () => {
      toast.success('Changes committed & saved to GitHub');
      setEditingFile(null);
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      setTimeout(triggerRefresh, 1000);
    },
    onError: (err) => {
      console.error(err);
      toast.error('Save failed: ' + (err.response?.data?.message || err.message));
    }
  });

  const handleSaveFile = async (newContent) => {
    if (!editingFile) return;
    const contentToSave = newContent !== undefined ? newContent : editorContent;

    if (!contentToSave.trim() && !window.confirm('Save empty file?')) return;
    if (contentToSave.length > 500000) {
      return toast.error('File content too large for web editor (Max 500KB)');
    }

    setSaving(true);
    const targetRepo = editingFile.repoName || repository;
    const toastId = toast.loading('Committing changes to Git...');
    try {
      await saveFileMutation.mutateAsync({
        targetRepo,
        path: editingFile.path,
        sha: editingFile.sha,
        contentToSave,
        fileName: editingFile.name
      });
      toast.dismiss(toastId);
    } catch (err) {
      toast.dismiss(toastId);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (file) => {
    const targetRepo = file.repoName || repository;
    const toastId = toast.loading(`Preparing ${file.name}...`);
    try {
      let finalBlob;

      let chunkPaths = file.isChunked && Array.isArray(file.chunkPaths) ? file.chunkPaths : null;
      let isCompressed = file.isCompressed;
      let effectiveMime = file.mimeType;

      if (!chunkPaths) {
        try {
          const checkRes = await axios.get(
            `https://api.github.com/repos/${githubUsername}/${targetRepo}/contents/${encodeURIComponent(file.path)}`,
            { headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.raw' }, responseType: 'text' }
          );
          if (typeof checkRes.data === 'string' && checkRes.data.includes('smart_slicer_manifest')) {
            const parsedManifest = JSON.parse(checkRes.data);
            if (Array.isArray(parsedManifest.chunkPaths) && parsedManifest.chunkPaths.length > 0) {
              chunkPaths = parsedManifest.chunkPaths;
              isCompressed = Boolean(parsedManifest.isCompressed);
              effectiveMime = parsedManifest.mimeType || effectiveMime;
            }
          }
        } catch (e) {}
      }

      // Check if file is chunked via metadata or manifest
      if (chunkPaths && chunkPaths.length > 0) {
        toast.loading(`Reassembling ${chunkPaths.length} chunks...`, { id: toastId });
        const chunkBlobs = await Promise.all(
          chunkPaths.map(async (cPath) => {
            const res = await axios.get(
              `https://api.github.com/repos/${githubUsername}/${targetRepo}/contents/${encodeURIComponent(cPath)}`,
              { headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.raw' }, responseType: 'blob' }
            );
            return res.data;
          })
        );
        finalBlob = new Blob(chunkBlobs, { type: effectiveMime || 'application/octet-stream' });
      } else {
        const response = await axios.get(`https://api.github.com/repos/${githubUsername}/${targetRepo}/contents/${encodeURIComponent(file.path)}`, {
          headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.raw' },
          responseType: 'blob'
        });
        finalBlob = response.data;
      }

      // If compressed, decompress losslessly on the fly
      if (isCompressed) {
        toast.loading(`Decompressing ${file.name}...`, { id: toastId });
        finalBlob = await decompressBlobLossless(finalBlob);
      }

      const url = window.URL.createObjectURL(finalBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Download completed', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Download failed', { id: toastId });
    }
  };

  // TanStack useMutation for renaming
  const renameMutation = useMutation({
    mutationFn: async ({ file, newName, targetRepo }) => {
      const res = await axios.get(`https://api.github.com/repos/${githubUsername}/${targetRepo}/contents/${encodeURIComponent(file.path)}`, {
        headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' }
      });

      const newPath = file.path.replace(file.name, newName);

      await axios.put(`https://api.github.com/repos/${githubUsername}/${targetRepo}/contents/${encodeURIComponent(newPath)}`, {
        message: `Rename ${file.name} to ${newName}`,
        content: res.data.content
      }, {
        headers: { Authorization: `Bearer ${githubToken}` }
      });

      await axios.delete(`https://api.github.com/repos/${githubUsername}/${targetRepo}/contents/${encodeURIComponent(file.path)}`, {
        headers: { Authorization: `Bearer ${githubToken}` },
        data: { message: `Delete old file after rename`, sha: file.sha }
      });

      return { file, newName };
    },
    onSuccess: ({ newName }) => {
      toast.success(`Renamed successfully to "${newName}"`);
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      triggerRefresh();
    },
    onError: () => {
      toast.error('Rename failed');
    }
  });

  const handleRename = async (file) => {
    const newName = prompt('Enter new name:', file.name);
    if (!newName || newName === file.name) return;

    const targetRepo = file.repoName || repository;
    const toastId = toast.loading(`Renaming to ${newName}...`);
    try {
      await renameMutation.mutateAsync({ file, newName, targetRepo });
      toast.dismiss(toastId);
    } catch (err) {
      toast.dismiss(toastId);
    }
  };

  const totalPoolCapacityGB = Math.max(repositories.length, 1) * (STORAGE_CONFIG.PER_REPO_CAPACITY_GB || 2);
  const totalLimitBytes = totalPoolCapacityGB * 1024 * 1024 * 1024;
  const totalSizeBytes = firestoreFiles.reduce((acc, item) => acc + (item.size || 0), 0);
  const percentage = (totalSizeBytes / totalLimitBytes) * 100;

  const filteredItems = useMemo(() => {
    let result = [...displayItems];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q));
    }

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
      className={`flex flex-col md:flex-row bg-[#f6f8fa] dark:bg-[#0d1117] min-h-screen font-sans text-[#24292e] dark:text-[#c9d1d9] relative transition-colors duration-200 ${dragActive ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      {/* Full-screen Drag Overlay */}
      {dragActive && (
        <div className="fixed inset-0 z-[200] bg-[#0366d6]/10 dark:bg-[#58a6ff]/10 backdrop-blur-xs border-4 border-dashed border-[#0366d6] dark:border-[#58a6ff] flex items-center justify-center pointer-events-none transition-all duration-300">
          <div className="bg-white dark:bg-[#161b22] p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 scale-105 animate-pulse border border-[#e1e4e8] dark:border-[#30363d]">
            <FaUpload size={48} className="text-[#0366d6] dark:text-[#58a6ff]" />
            <p className="text-xl font-bold text-[#0366d6] dark:text-[#58a6ff]">Drop files here to upload to GitHub</p>
            <p className="text-xs text-[#586069] dark:text-[#8b949e]">Files will be automatically converted and committed to your repository</p>
          </div>
        </div>
      )}

      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        usedStorage={formatBytes(totalSizeBytes)}
        totalStorage={`${totalPoolCapacityGB} GB`}
        percentage={percentage}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        trashCount={trashItems.length}
        starredCount={starredPaths.length}
      />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Header 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          activeView={activeView} 
          onOpenShortcuts={() => setShortcutsModalOpen(true)}
        />
        
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8">
          {(!isGithubConnected || repoStatus !== 'ready') ? (
            <div className="w-full max-w-2xl mx-auto mt-8 p-6 sm:p-10 bg-white dark:bg-[#161b22] border border-[#e1e4e8] dark:border-[#30363d] rounded-2xl shadow-sm text-center">
              <div className="w-16 h-16 bg-[#f6f8fa] dark:bg-[#21262d] border border-[#e1e4e8] dark:border-[#30363d] rounded-2xl flex items-center justify-center text-[#586069] dark:text-[#8b949e] mx-auto mb-6">
                {loading ? <FaSpinner className="animate-spin text-[#0366d6]" /> : <FaDatabase size={24} />}
              </div>
              <h3 className="text-xl font-bold mb-2 text-[#24292e] dark:text-white">Configure GitHub Backend</h3>
              <p className="text-[#586069] dark:text-[#8b949e] text-sm mb-8">Link your GitHub account to enable unlimited personal cloud storage backed by Git versioning.</p>
              <button 
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2ea44f] text-white text-sm font-semibold rounded-lg hover:bg-[#2c974b] transition-colors shadow-xs"
                onClick={connectGithubAccount}
              >
                <FaShieldAlt /> {loading ? 'Connecting...' : 'Connect GitHub Account'}
              </button>
            </div>
          ) : (
            <div className="w-full max-w-6xl mx-auto">
              {activeView === 'dashboard' && (
                <div className="space-y-6">
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
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    onOpenHistory={(file) => setHistoryModalFile(file)}
                    onOpenShare={(file) => setShareModalFile(file)}
                    onEditFile={(file) => handleOpenEdit(file)}
                    starredPaths={starredPaths}
                    toggleStar={toggleStar}
                  />
                </div>
              )}

              {(activeView === 'mystorage' || activeView === 'starred') && (
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
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  onOpenHistory={(file) => setHistoryModalFile(file)}
                  onOpenShare={(file) => setShareModalFile(file)}
                  onEditFile={(file) => handleOpenEdit(file)}
                  starredPaths={starredPaths}
                  toggleStar={toggleStar}
                />
              )}

              {activeView === 'trash' && (
                <TrashBin 
                  trashItems={trashItems}
                  loading={trashLoading}
                  onRestore={handleRestoreFromTrash}
                  onPermanentDelete={handlePermanentDelete}
                  onEmptyTrash={handleEmptyTrash}
                  getFileIcon={getFileIcon}
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
      
      {/* Upload Preview & Progress Queue */}
      {uploadQueue.length > 0 && (
        <div className="fixed bottom-3 right-3 w-[95vw] max-w-sm sm:max-w-md bg-white dark:bg-[#161b22] border border-[#e1e4e8] dark:border-[#30363d] rounded-xl shadow-2xl z-[150] overflow-hidden flex flex-col text-[#24292e] dark:text-[#c9d1d9] animate-in slide-in-from-bottom duration-200">
          <div className="px-4 py-3 bg-[#fafbfc] dark:bg-[#0d1117] border-b border-[#e1e4e8] dark:border-[#30363d] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#586069] dark:text-[#8b949e]">Upload Queue ({uploadQueue.length})</span>
            <button onClick={() => setUploadQueue([])} className="text-[#586069] dark:text-[#8b949e] hover:text-[#d73a49] p-1">
              <FaTimes size={12} />
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto p-2.5 space-y-2">
            {uploadQueue.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-2.5 bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#e1e4e8] dark:border-[#30363d] rounded-lg">
                {item.preview ? (
                  <img src={item.preview} className="w-9 h-9 object-cover rounded shadow-xs border border-[#e1e4e8] dark:border-[#30363d]" alt={item.name} />
                ) : (
                  <div className="w-9 h-9 bg-white dark:bg-[#21262d] border border-[#e1e4e8] dark:border-[#30363d] rounded flex items-center justify-center text-[#959da5]">
                    <FaFileAlt size={16} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate text-[#24292e] dark:text-white">{item.name}</p>
                  <div className="w-full bg-[#e1e4e8] dark:bg-[#30363d] h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${item.status === 'error' ? 'bg-[#d73a49]' : item.status === 'completed' ? 'bg-[#2ea44f]' : 'bg-[#0366d6]'}`}
                      style={{ width: `${item.status === 'completed' ? 100 : item.status === 'uploading' ? (item.progress || 60) : 10}%` }}
                    />
                  </div>
                </div>
                <div className="text-[11px] font-bold">
                  {item.status === 'pending' && <span className="text-[#0366d6] dark:text-[#58a6ff]">WAIT</span>}
                  {item.status === 'uploading' && <FaSpinner className="animate-spin text-[#0366d6]" />}
                  {item.status === 'completed' && <FaCheck className="text-[#2ea44f]" />}
                  {item.status === 'error' && <FaTimes className="text-[#d73a49]" />}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-[#e1e4e8] dark:border-[#30363d] bg-[#fafbfc] dark:bg-[#0d1117] flex items-center gap-2">
            <button 
              onClick={startUploads}
              disabled={uploadQueue.every(u => u.status !== 'pending' && u.status !== 'error')}
              className="flex-1 py-2 bg-[#2ea44f] hover:bg-[#2c974b] text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FaUpload /> {uploadQueue.some(u => u.status === 'error') ? 'Retry Failed Uploads' : 'Commit & Upload to Drive'}
            </button>
            {uploadQueue.some(u => u.status === 'completed' || u.status === 'error') && (
              <button
                onClick={() => setUploadQueue(prev => prev.filter(u => u.status === 'pending' || u.status === 'uploading'))}
                className="px-3 py-2 bg-[#f6f8fa] dark:bg-[#21262d] text-[#586069] dark:text-[#8b949e] hover:text-[#d73a49] text-xs font-medium rounded-lg border border-[#e1e4e8] dark:border-[#30363d] transition-colors"
                title="Clear finished/failed"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <FileHistoryModal 
        isOpen={Boolean(historyModalFile)}
        onClose={() => setHistoryModalFile(null)}
        file={historyModalFile}
        githubUsername={githubUsername}
        repository={historyModalFile?.repoName || repository}
        githubToken={githubToken}
      />

      <ShareModal 
        isOpen={Boolean(shareModalFile)}
        onClose={() => setShareModalFile(null)}
        file={shareModalFile}
        githubUsername={githubUsername}
        repository={shareModalFile?.repoName || repository}
        githubToken={githubToken}
      />

      <ShortcutsModal 
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Code Editor Modal (Monaco) */}
      <CodeEditorModal 
        file={editingFile}
        isOpen={Boolean(editingFile)}
        onClose={() => setEditingFile(null)}
        onSave={handleSaveFile}
        saving={saving}
        initialContent={editorContent}
      />

      {/* Media & Document Preview */}
      {previewFile && (
        <FilePreview 
          file={previewFile}
          githubToken={githubToken}
          githubUsername={githubUsername}
          repository={previewFile.repoName || repository}
          onClose={() => setPreviewFile(null)}
          onDownload={handleDownload}
          onEdit={(file, content) => handleOpenEdit(file, content)}
        />
      )}

      {/* File Details Side Drawer */}
      {detailsFile && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-2xs z-[110] flex justify-end items-end sm:items-stretch" onClick={() => setDetailsFile(null)}>
          <div className="bg-white dark:bg-[#161b22] w-full sm:max-w-md h-[90vh] sm:h-full shadow-2xl flex flex-col border-l border-[#e1e4e8] dark:border-[#30363d] text-[#24292e] dark:text-[#c9d1d9] animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-[#e1e4e8] dark:border-[#30363d] flex items-center justify-between bg-[#fafbfc] dark:bg-[#0d1117]">
              <h3 className="font-bold text-sm text-[#24292e] dark:text-white">File Details</h3>
              <button onClick={() => setDetailsFile(null)} className="p-2 hover:bg-[#f3f4f6] dark:hover:bg-[#21262d] rounded-lg transition-colors">
                <FaTimes className="text-[#586069] dark:text-[#8b949e]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#e1e4e8] dark:border-[#30363d] rounded-2xl flex items-center justify-center text-[#0366d6] dark:text-[#58a6ff] mb-4 shadow-xs mx-auto">
                  {detailsFile.type === 'dir' ? <FaFolder size={40} /> : <FaFileAlt size={40} className="text-[#959da5]" />}
                </div>
                <h4 className="text-base font-bold text-[#24292e] dark:text-white break-all truncate max-w-full" title={detailsFile.name}>{detailsFile.name}</h4>
                <p className="text-xs text-[#586069] dark:text-[#8b949e] mt-1">{detailsFile.type === 'dir' ? 'Folder' : 'File Asset'}</p>
              </div>

              {/* Meta details */}
              <div>
                <h5 className="text-[10px] uppercase font-bold text-[#586069] dark:text-[#8b949e] tracking-widest mb-2 px-1">Attributes</h5>
                <div className="bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#e1e4e8] dark:border-[#30363d] rounded-xl overflow-hidden divide-y divide-[#e1e4e8] dark:divide-[#30363d]">
                  <div className="flex justify-between px-4 py-2.5 text-xs">
                    <span className="text-[#586069] dark:text-[#8b949e]">Size</span>
                    <span className="font-semibold">{detailsFile.displaySize}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-xs">
                    <span className="text-[#586069] dark:text-[#8b949e]">Extension</span>
                    <span className="font-semibold uppercase text-[10px] bg-[#e1e4e8] dark:bg-[#30363d] px-2 py-0.5 rounded">{detailsFile.name.split('.').pop() || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-xs">
                    <span className="text-[#586069] dark:text-[#8b949e]">Git SHA</span>
                    <span className="font-mono text-[10px] text-[#0366d6] dark:text-[#58a6ff] truncate ml-4 max-w-[140px]" title={detailsFile.sha}>
                      {detailsFile.sha}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-xs">
                    <span className="text-[#586069] dark:text-[#8b949e]">Modified</span>
                    <span className="font-semibold">{detailsFile.lastModified ? new Date(detailsFile.lastModified).toLocaleString() : 'Just now'}</span>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h5 className="text-[10px] uppercase font-bold text-[#586069] dark:text-[#8b949e] tracking-widest mb-2 px-1">Storage Path</h5>
                <div className="bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#e1e4e8] dark:border-[#30363d] rounded-xl p-3">
                  <p className="text-xs font-mono text-[#586069] dark:text-[#8b949e] break-all leading-relaxed" title={detailsFile.path}>
                    {detailsFile.path}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                {detailsFile.type !== 'dir' && (
                  <button 
                    onClick={() => {
                      const toEdit = detailsFile;
                      setDetailsFile(null);
                      handleOpenEdit(toEdit);
                    }}
                    className="w-full py-2 bg-[#2ea44f] hover:bg-[#2c974b] text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-xs"
                  >
                    <FaEdit size={13} /> Edit in Code Editor
                  </button>
                )}
                <button 
                  onClick={() => { setShareModalFile(detailsFile); setDetailsFile(null); }}
                  className="w-full py-2 bg-[#0366d6] text-white text-xs font-semibold rounded-lg hover:bg-[#0256b4] transition-all flex items-center justify-center gap-2"
                >
                  <FaShareAlt size={13} /> Share Link & CDN
                </button>
                <button 
                  onClick={() => { setHistoryModalFile(detailsFile); setDetailsFile(null); }}
                  className="w-full py-2 bg-white dark:bg-[#21262d] border border-[#e1e4e8] dark:border-[#30363d] text-[#24292e] dark:text-white text-xs font-semibold rounded-lg hover:border-[#0366d6] transition-all flex items-center justify-center gap-2"
                >
                  <FaHistory size={13} /> Version & Commit History
                </button>
                <button 
                  onClick={() => { handleDownload(detailsFile); }}
                  disabled={detailsFile.type === 'dir'}
                  className="w-full py-2 bg-white dark:bg-[#21262d] border border-[#e1e4e8] dark:border-[#30363d] text-[#24292e] dark:text-white text-xs font-semibold rounded-lg hover:bg-[#f6f8fa] dark:hover:bg-[#30363d] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <FaDownload size={13} /> Download File
                </button>
                <button 
                  onClick={() => { handleRename(detailsFile); setDetailsFile(null); }}
                  className="w-full py-2 bg-white dark:bg-[#21262d] border border-[#e1e4e8] dark:border-[#30363d] text-[#24292e] dark:text-white text-xs font-semibold rounded-lg hover:bg-[#f6f8fa] dark:hover:bg-[#30363d] transition-all flex items-center justify-center gap-2"
                >
                  <FaEdit size={13} /> Rename Item
                </button>
                <button 
                  onClick={() => {
                    const toDelete = detailsFile;
                    setDetailsFile(null);
                    handleDelete([toDelete.path]);
                  }}
                  className="w-full py-2 bg-white dark:bg-[#21262d] border border-[#d73a49] text-[#d73a49] text-xs font-semibold rounded-lg hover:bg-[#feeef0] dark:hover:bg-red-950/30 transition-all flex items-center justify-center gap-2"
                >
                  <FaTrash size={13} /> Move to Trash
                </button>
              </div>
            </div>
            <div className="p-4 bg-[#fafbfc] dark:bg-[#0d1117] border-t border-[#e1e4e8] dark:border-[#30363d]">
              <p className="text-[10px] text-[#586069] dark:text-[#8b949e] text-center italic">
                Synchronized with Git repository
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
