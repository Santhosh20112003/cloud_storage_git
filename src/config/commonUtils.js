// Common utility constants and configuration
export const STORAGE_CONFIG = {
  MAX_FILE_SIZE_MB: 100, // Upgraded to 100 MB via Git Blob API
  MAX_BATCH_UPLOAD_COUNT: 5,
  BANNED_EXTENSIONS: [],
  MAX_FILENAME_LENGTH: 100,
  // Single capacity applied to all repositories
  TOTAL_CAPACITY_GB: 2,
  MAX_REPOSITORIES: 3
};

export const formatBytes = (bytes, decimals = 1) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
