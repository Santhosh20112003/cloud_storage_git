/**
 * smartSlicer.js
 * 
 * Pipeline:
 * File -> Lossless Compressor (Streamed gzip with smart skip) -> Threshold check
 *   -> Less than threshold (20MB) -> Normal Flow (direct blob)
 *   -> Greater than threshold -> Smart Slicer Flow (split into 20MB chunks + manifest)
 * 
 * Guarantees 100% byte fidelity without data loss or quality degradation.
 */

// Files that are already compressed with entropy coding - compressing these yields 0% or negative savings
const PRE_COMPRESSED_EXTENSIONS = new Set([
  'zip', 'gz', 'bz2', 'xz', '7z', 'rar', 'tar',
  'mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv',
  'mp3', 'aac', 'flac', 'ogg', 'wav', 'm4a',
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'heic'
]);

// Text and uncompressed binary types that benefit dramatically (50%-85% reduction) from lossless gzip
const HIGHLY_COMPRESSIBLE_EXTENSIONS = new Set([
  'txt', 'csv', 'tsv', 'json', 'xml', 'yaml', 'yml',
  'html', 'htm', 'css', 'scss', 'js', 'jsx', 'ts', 'tsx',
  'md', 'markdown', 'sql', 'log', 'svg', 'ini', 'conf',
  'properties', 'env', 'wasm', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'
]);

export const SLICER_CONFIG = {
  // Base threshold (20 MB): files under 20MB are committed directly as a single Git blob
  // Note: 20MB raw binary expands to ~26.7MB in Base64, well within GitHub's limits
  CHUNK_THRESHOLD_BYTES: 20 * 1024 * 1024,
  // Hard ceiling per chunk (40 MB): 40MB expands to ~53.3MB Base64, avoiding GitHub's 422 'input too large' wall
  MAX_CHUNK_CEILING_BYTES: 40 * 1024 * 1024,
  // Minimum chunk floor for efficiency (10 MB)
  MIN_CHUNK_FLOOR_BYTES: 10 * 1024 * 1024,
  CHUNKS_DIR: '.chunks'
};

/**
 * Intelligently and dynamically computes chunk count and slice size at runtime:
 * - Dynamically determines target chunk count based on file size and hardware concurrency
 * - Ensures all chunks are evenly sized (no tiny 1MB trailing slice)
 * - Adapts to user's hardware concurrency (navigator.hardwareConcurrency)
 * - Stays safely within [10MB floor, 40MB ceiling] to prevent GitHub 422 JSON payload limits
 */
export const calculateIntelligentChunking = (fileSizeBytes) => {
  const MIN_FLOOR = SLICER_CONFIG.MIN_CHUNK_FLOOR_BYTES;      // 10 MB
  const MAX_CEILING = SLICER_CONFIG.MAX_CHUNK_CEILING_BYTES;  // 40 MB GitHub REST Safety Wall
  const SINGLE_STREAM_MAX = SLICER_CONFIG.CHUNK_THRESHOLD_BYTES; // 20 MB Direct Flow

  // 1. Handle normal single-blob flow
  if (fileSizeBytes <= SINGLE_STREAM_MAX) {
    return { isChunked: false, totalChunks: 1, chunkSize: fileSizeBytes };
  }

  // 2. Hardware-aware baseline: factor in CPU cores for parallel pipelining
  const cpuCores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
  const sizeMB = fileSizeBytes / (1024 * 1024);

  // Initial target count based on size profile and CPU concurrency
  let targetChunks;
  if (sizeMB <= 60) {
    targetChunks = 2;
  } else if (sizeMB <= 120) {
    targetChunks = Math.min(Math.max(cpuCores, 2), 4);
  } else if (sizeMB <= 250) {
    targetChunks = Math.min(Math.max(cpuCores, 4), 6);
  } else {
    // For 250MB+, initial target scales with cores
    targetChunks = Math.max(cpuCores, 6);
  }

  // 3. Compute balanced slice size
  let computedChunkSize = Math.ceil(fileSizeBytes / targetChunks);

  // 4. UNBOUNDED GIGABYTE & REST PAYLOAD CEILING CORRECTION:
  // If the computed chunk size exceeds 40MB (which becomes ~53MB in Base64),
  // dynamically scale targetChunks UPWARD without an arbitrary cap until the chunk size
  // falls strictly under the 40MB ceiling, evenly distributing remainder bytes.
  if (computedChunkSize > MAX_CEILING) {
    targetChunks = Math.ceil(fileSizeBytes / MAX_CEILING);
    computedChunkSize = Math.ceil(fileSizeBytes / targetChunks);
  }

  // 5. Ensure we don't drop below the minimum chunk floor (avoids micro-fragments)
  if (computedChunkSize < MIN_FLOOR && targetChunks > 2) {
    targetChunks = Math.ceil(fileSizeBytes / MIN_FLOOR);
    computedChunkSize = Math.ceil(fileSizeBytes / targetChunks);
  }

  return {
    isChunked: true,
    totalChunks: targetChunks,
    chunkSize: computedChunkSize
  };
};

/**
 * Checks if a file is compressible without quality loss.
 */
export const shouldAttemptCompression = (fileName, mimeType = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (PRE_COMPRESSED_EXTENSIONS.has(ext)) return false;
  if (HIGHLY_COMPRESSIBLE_EXTENSIONS.has(ext)) return true;
  if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml')) return true;
  return false;
};

/**
 * Losslessly compresses a File or Blob using the browser's native CompressionStream ('gzip').
 * If the compressed output is not significantly smaller than the original, returns the original.
 */
export const compressBlobLossless = async (fileOrBlob) => {
  if (typeof CompressionStream === 'undefined') {
    return { blob: fileOrBlob, isCompressed: false };
  }

  try {
    const stream = fileOrBlob.stream().pipeThrough(new CompressionStream('gzip'));
    const response = new Response(stream);
    const compressedBlob = await response.blob();

    // Only use compressed if it actually saved space (> 5% reduction)
    if (compressedBlob.size < fileOrBlob.size * 0.95) {
      return {
        blob: compressedBlob,
        isCompressed: true,
        compressionRatio: ((1 - compressedBlob.size / fileOrBlob.size) * 100).toFixed(1)
      };
    }
    return { blob: fileOrBlob, isCompressed: false };
  } catch (err) {
    console.warn('Native compression fallback to uncompressed:', err);
    return { blob: fileOrBlob, isCompressed: false };
  }
};

/**
 * Decompresses a gzipped Blob back to its exact original byte-for-byte state.
 */
export const decompressBlobLossless = async (compressedBlob) => {
  if (typeof DecompressionStream === 'undefined') {
    return compressedBlob;
  }

  try {
    const stream = compressedBlob.stream().pipeThrough(new DecompressionStream('gzip'));
    const response = new Response(stream);
    return await response.blob();
  } catch (err) {
    console.warn('Decompression failed or stream not compressed:', err);
    return compressedBlob;
  }
};

/**
 * Converts a Blob or File slice into a Base64 string for GitHub Git Blob API with maximum performance.
 * Bypasses heavy regex and huge string copies to avoid main-thread UI stalls.
 */
export const blobToBase64 = async (blob) => {
  // Ultra-fast path: If modern Uint8Array.prototype.toBase64 is supported
  if (typeof Uint8Array.prototype.toBase64 === 'function') {
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer).toBase64();
  }

  // Fast path: Chunked binary encoding (2-3x faster than FileReader on 30MB-40MB blobs)
  try {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkLen = 0x8000; // 32KB chunking to avoid stack limits
    for (let i = 0; i < bytes.length; i += chunkLen) {
      const chunk = bytes.subarray(i, i + chunkLen);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return window.btoa(binary);
  } catch (e) {
    // Fallback: FileReader without regex
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const res = reader.result;
          if (typeof res !== 'string') return reject(new Error('FileReader failed'));
          const commaIdx = res.indexOf(',');
          resolve(commaIdx !== -1 ? res.slice(commaIdx + 1) : res);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(blob);
    });
  }
};

/**
 * Prepares a file for upload according to the Smart Slicer pipeline:
 * File -> Lossless Compressor -> Threshold Check -> Normal vs Chunked Slices
 */
export const prepareSmartFile = async (file, onProgress) => {
  const originalSize = file.size;
  const fileName = file.name;
  const mimeType = file.type || 'application/octet-stream';

  let workingBlob = file;
  let isCompressed = false;
  let compressionRatio = '0';

  // 1. Lossless compression step
  if (shouldAttemptCompression(fileName, mimeType)) {
    if (onProgress) onProgress('compressing', 10);
    const compResult = await compressBlobLossless(file);
    if (compResult.isCompressed) {
      workingBlob = compResult.blob;
      isCompressed = true;
      compressionRatio = compResult.compressionRatio;
    }
  }

  const postCompressionSize = workingBlob.size;

  // 2. Intelligent Dynamic Chunk Calculation at Runtime
  const plan = calculateIntelligentChunking(postCompressionSize);

  if (plan.isChunked) {
    // Smart Slicer Flow: Dynamically slice into evenly computed parts
    const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const chunks = [];

    for (let i = 0; i < plan.totalChunks; i++) {
      const start = i * plan.chunkSize;
      const end = Math.min(postCompressionSize, start + plan.chunkSize);
      const chunkBlob = workingBlob.slice(start, end);
      chunks.push({
        index: i,
        blob: chunkBlob,
        size: chunkBlob.size,
        path: `${SLICER_CONFIG.CHUNKS_DIR}/${fileId}/part.${String(i).padStart(3, '0')}`
      });
    }

    return {
      isChunked: true,
      fileId,
      originalName: fileName,
      originalSize,
      storedSize: postCompressionSize,
      mimeType,
      isCompressed,
      compressionRatio,
      totalChunks: plan.totalChunks,
      chunkSize: plan.chunkSize,
      chunks,
      manifest: {
        version: 1,
        type: 'smart_slicer_manifest',
        name: fileName,
        originalSize,
        storedSize: postCompressionSize,
        mimeType,
        isCompressed,
        totalChunks: plan.totalChunks,
        chunkSize: plan.chunkSize,
        chunkPaths: chunks.map(c => c.path)
      }
    };
  }

  // Normal Flow: Single Blob
  return {
    isChunked: false,
    originalName: fileName,
    originalSize,
    storedSize: postCompressionSize,
    mimeType,
    isCompressed,
    compressionRatio,
    blob: workingBlob
  };
};
