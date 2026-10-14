import React from 'react';
import { 
  FaFolder, 
  FaFilePdf, 
  FaFileAlt, 
  FaFileImage, 
  FaFileVideo, 
  FaFileCode, 
  FaFileArchive,
  FaFileAudio
} from 'react-icons/fa';

/**
 * File-Type Indicators (Exact specification)
 * Type            Color
 * Docs / Sheets   #1A73E8 (--primary)
 * Images / Video  #E8710A
 * PDF             #D93025 (--error)
 * Archive         #5F6368 (--on-surface-variant)
 * Code            #188038 (--success)
 */

export const getFileTypeCategory = (fileName, type) => {
  if (type === 'dir') return 'folder';
  const ext = fileName?.split('.').pop()?.toLowerCase();
  
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'tsv', 'rtf'].includes(ext)) return 'doc';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'heic', 'mp4', 'webm', 'mov', 'avi', 'mkv', 'flv'].includes(ext)) return 'media';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'jar'].includes(ext)) return 'archive';
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'json', 'py', 'java', 'c', 'cpp', 'cs', 'rs', 'go', 'php', 'rb', 'sh', 'bash', 'yaml', 'yml', 'xml', 'sql', 'md', 'env', 'toml'].includes(ext)) return 'code';
  if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(ext)) return 'media';

  return 'other';
};

export const getFileIndicatorColor = (fileName, type) => {
  const category = getFileTypeCategory(fileName, type);
  switch (category) {
    case 'folder': return '#1A73E8';
    case 'doc': return '#1A73E8';
    case 'media': return '#E8710A';
    case 'pdf': return '#D93025';
    case 'archive': return '#5F6368';
    case 'code': return '#188038';
    default: return '#5F6368';
  }
};

export const getFileIcon = (fileName, type, size = 16) => {
  if (type === 'dir') {
    return <FaFolder size={size} color="#1A73E8" />;
  }
  const category = getFileTypeCategory(fileName, type);
  const color = getFileIndicatorColor(fileName, type);
  const ext = fileName?.split('.').pop()?.toLowerCase();

  switch (category) {
    case 'pdf':
      return <FaFilePdf size={size} color={color} />;
    case 'doc':
      return <FaFileAlt size={size} color={color} />;
    case 'media':
      if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
        return <FaFileVideo size={size} color={color} />;
      }
      if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(ext)) {
        return <FaFileAudio size={size} color={color} />;
      }
      return <FaFileImage size={size} color={color} />;
    case 'archive':
      return <FaFileArchive size={size} color={color} />;
    case 'code':
      return <FaFileCode size={size} color={color} />;
    default:
      return <FaFileAlt size={size} color="#5F6368" />;
  }
};
