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
 * Formats storage percentages consistently across the application:
 * - If 0, returns '0%'
 * - If between 0 and 10, shows 1 decimal place (e.g. '0.4%', '4.2%')
 * - If >= 10, rounds to whole number (e.g. '12%', '85%')
 */
export const formatStoragePercentage = (val) => {
  const num = Number(val);
  if (isNaN(num) || num <= 0) return '0%';
  if (num < 10) {
    const fixed = num.toFixed(1);
    return fixed.endsWith('.0') ? `${Math.round(num)}%` : `${fixed}%`;
  }
  return `${Math.round(num)}%`;
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

export const EDITABLE_EXTENSIONS = new Set([
  'txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'sass', 'less',
  'py', 'java', 'c', 'cpp', 'h', 'cs', 'rs', 'go', 'php', 'rb', 'swift', 'kt',
  'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd', 'yaml', 'yml', 'xml', 'toml', 'ini',
  'env', 'conf', 'properties', 'sql', 'dockerfile', 'svg', 'log', 'csv', 'tsv',
  'lock', 'example', 'sample', 'template', 'default', 'local', 'config', 'cfg', 'rules',
  'gitignore', 'gitattributes', 'editorconfig', 'nvmrc', 'babelrc', 'eslintrc', 'prettierrc'
]);

export const KNOWN_BINARY_EXTENSIONS = new Set([
  'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'tiff', 'tif', 'avif', 'heic', 'heif',
  'mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', '3gp', 'm4v',
  'mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma',
  'zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz', 'iso', 'exe', 'bin', 'apk', 'dmg',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'
]);

export const isFileEditable = (item) => {
  if (!item || item.type === 'dir') return false;
  const name = (item.name || '').toLowerCase();
  
  // Explicitly reject known binary files
  const rawExt = name.split('.').pop() || '';
  if (KNOWN_BINARY_EXTENSIONS.has(rawExt)) return false;

  // Dotfiles and configs are editable (.env, .env.example, .gitignore, .prettierrc, etc.)
  if (name.startsWith('.') || name.includes('.env') || name === 'dockerfile' || name === 'makefile' || name === 'license') {
    return true;
  }

  // Check any part of compound extension like file.env.example or test.spec.js
  const parts = name.split('.');
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      if (EDITABLE_EXTENSIONS.has(parts[i])) return true;
    }
  }

  return EDITABLE_EXTENSIONS.has(rawExt);
};
