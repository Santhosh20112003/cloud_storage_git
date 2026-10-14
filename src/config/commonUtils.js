// Common utility constants and configuration
export const STORAGE_CONFIG = {
  MAX_FILE_SIZE_MB: 300, // Maximum per file (smart slicer chunks files > 20MB)
  MAX_CONCURRENT_BLOB_UPLOADS: 3, // Throttled concurrency to prevent 403 secondary rate limits
  MAX_BATCH_TRANSACTION_FILES: 25, // Maximum files committed in a single atomic Git tree
  BANNED_EXTENSIONS: [],
  MAX_FILENAME_LENGTH: 100,
  // 2 GB per individual repository shard
  PER_REPO_CAPACITY_GB: 2,
  TOTAL_CAPACITY_GB: 2,
  MAX_REPOSITORIES: 5
};

export const formatBytes = (bytes, decimals = 1) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Sanitizes uploaded filenames to ensure URL, CDN, and Git compatibility.
 * Replaces illegal characters, spaces, and consecutive symbols with clean underscores/hyphens.
 */
export const sanitizeFileName = (fileName) => {
  if (!fileName) return 'unnamed_file';

  // Handle dotfiles like .env, .env.example, .gitignore
  const isDotFile = fileName.startsWith('.') && !fileName.slice(1).includes('.');
  if (isDotFile) {
    const clean = fileName.slice(1).replace(/[^\w\-\.]+/g, '_');
    return `.${clean || 'env'}`;
  }

  const lastDot = fileName.lastIndexOf('.');
  // If dot is at index 0 (e.g. .env.example), separate correctly
  let base, ext;
  if (lastDot > 0) {
    base = fileName.substring(0, lastDot);
    ext = fileName.substring(lastDot).toLowerCase();
  } else {
    base = fileName;
    ext = '';
  }

  // Replace spaces, pluses, slashes, backslashes, colons, brackets, and invalid URL symbols
  let cleanBase = base
    .trim()
    .replace(/[\s+]+/g, '_')               // Convert spaces and + to underscores
    .replace(/[^\w\-\.]+/g, '_')          // Keep only alphanumeric, hyphen, dot, underscore
    .replace(/_{2,}/g, '_')               // Deduplicate multiple underscores
    .replace(/_+$/g, '');                 // Trim trailing underscores

  if (!cleanBase) cleanBase = 'file';

  // Limit filename length to avoid exceeding filesystem/Git path limits
  if (cleanBase.length > 80) {
    cleanBase = cleanBase.substring(0, 80);
  }

  return `${cleanBase}${ext}`;
};
