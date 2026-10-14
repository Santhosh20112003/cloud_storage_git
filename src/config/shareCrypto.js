/**
 * High-performance Web Crypto AES-GCM 256-bit encryption + Deflate Compression
 * Minifies and double-encrypts the payload into a compact, URL-safe string.
 */

// Stable drive encryption key derived for private sharing links
const PASS_PHRASE = 'github-cloud-drive-private-share-encryption-v1';

async function getKey() {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(PASS_PHRASE),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('drive_salt_fixed_2026'),
      iterations: 10000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Convert ArrayBuffer to URL-safe Base64
function bufferToUrlSafeBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Convert URL-safe Base64 back to Uint8Array
function urlSafeBase64ToBuffer(base64Str) {
  let base64 = base64Str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Minifies keys and encrypts using AES-GCM 256-bit
 */
export async function encryptAndMinifySharePayload(payload) {
  // 1. Minify object keys to minimize length
  const minified = [
    payload.owner,
    payload.repo,
    payload.path,
    payload.name,
    payload.size || 0,
    payload.token,
    payload.createdAt || Date.now()
  ];

  const jsonStr = JSON.stringify(minified);
  const enc = new TextEncoder();
  const plainBytes = enc.encode(jsonStr);

  // 2. Compress via CompressionStream (deflate-raw) if supported
  let compressedBytes = plainBytes;
  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('deflate-raw');
      const writer = cs.writable.getWriter();
      writer.write(plainBytes);
      writer.close();
      const response = new Response(cs.readable);
      compressedBytes = new Uint8Array(await response.arrayBuffer());
    } catch (e) {
      compressedBytes = plainBytes;
    }
  }

  // 3. Encrypt with AES-GCM using unique IV
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes IV
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    compressedBytes
  );

  // 4. Combine IV (12 bytes) + CipherText and encode to compact string
  const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.length);

  return bufferToUrlSafeBase64(combined.buffer);
}

/**
 * Decrypts AES-GCM 256-bit cipher and restores original payload
 */
export async function decryptShareToken(token) {
  try {
    const rawBytes = urlSafeBase64ToBuffer(token);
    if (rawBytes.length < 13) return null;

    // Extract 12-byte IV and ciphertext
    const iv = rawBytes.slice(0, 12);
    const ciphertext = rawBytes.slice(12);

    const key = await getKey();
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    // Decompress if stream is available
    let decompressedBytes = new Uint8Array(decryptedBuffer);
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(decryptedBuffer);
        writer.close();
        const response = new Response(ds.readable);
        decompressedBytes = new Uint8Array(await response.arrayBuffer());
      } catch (e) {
        decompressedBytes = new Uint8Array(decryptedBuffer);
      }
    }

    const dec = new TextDecoder();
    const jsonStr = dec.decode(decompressedBytes);
    const arr = JSON.parse(jsonStr);

    // Expand minified array back to full properties
    return {
      owner: arr[0],
      repo: arr[1],
      path: arr[2],
      name: arr[3],
      size: arr[4],
      token: arr[5],
      createdAt: arr[6]
    };
  } catch (err) {
    console.error('Decryption failed:', err);
    return null;
  }
}
