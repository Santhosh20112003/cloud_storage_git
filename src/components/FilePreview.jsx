import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FaTimes, FaFilePdf, FaFileVideo, FaFileWord, FaDownload,
  FaExternalLinkAlt, FaFolder, FaFileAlt, FaExpand, FaCompress,
  FaCopy, FaCheck, FaSearchPlus, FaSearchMinus, FaSync,
  FaVolumeUp, FaVolumeMute, FaPlay, FaPause, FaStepBackward,
  FaStepForward, FaMusic, FaCode, FaImage, FaFileCsv,
  FaFileArchive, FaLock, FaDatabase, FaFont, FaBook, FaEdit,
  FaRedo, FaUndo, FaFilePowerpoint, FaFileExcel,
  FaChevronRight, FaChevronDown, FaFolderOpen
} from 'react-icons/fa';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import axios from 'axios';
import { decompressBlobLossless } from '../config/smartSlicer';

// ─── Helpers ────────────────────────────────────────────────────────────────

const EXT_TO_TYPE = (() => {
  const map = {};
  const groups = {
    binary: ['exe', 'bin', 'app', 'dmg', 'apk', 'ipa', 'msi', 'iso', 'dll', 'so', 'dylib'],
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif', 'avif', 'heic', 'heif'],
    'raw-image': ['psd', 'ai', 'eps', 'raw', 'cr2', 'nef', 'arw', 'dng'],
    code: ['html', 'htm', 'css', 'scss', 'sass', 'less', 'js', 'jsx', 'ts', 'tsx', 'vue', 'svelte',
      'java', 'kt', 'kts', 'groovy', 'py', 'pyw', 'rb', 'php', 'go', 'rs', 'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'cs', 'swift',
      'json', 'jsonc', 'json5', 'yaml', 'yml', 'xml', 'toml', 'ini', 'env', 'properties', 'conf', 'cfg', 'cnf', 'config', 'sql',
      'sh', 'bash', 'zsh', 'fish', 'ps1', 'psm1', 'bat', 'cmd', 'gradle', 'pom', 'dockerfile', 'makefile',
      'lock', 'gitignore', 'gitattributes', 'gitmodules', 'editorconfig', 'nvmrc', 'npmrc', 'prettierrc', 'eslintrc', 'babelrc',
      'sample', 'example', 'template', 'default', 'local', 'test', 'spec', 'diff', 'patch', 'dart', 'scala', 'lua', 'r', 'pl', 'pm'],
    text: ['txt', 'md', 'markdown', 'mdown', 'mkdn', 'rtf', 'log', 'csv', 'tsv', 'rst', 'asciidoc', 'adoc'],
    pdf: ['pdf'],
    office: ['doc', 'docx', 'odt', 'pages', 'xls', 'xlsx', 'ods', 'numbers', 'ppt', 'pptx', 'odp', 'key'],
    ebook: ['epub', 'mobi', 'azw', 'azw3', 'fb2'],
    video: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'mpeg', 'mpg', '3gp', 'm4v'],
    audio: ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'aiff', 'wma', 'amr', 'opus', 'mid', 'midi'],
    archive: ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz', 'cab', 'jar', 'war', 'ear'],
    design: ['fig', 'sketch', 'xd', 'blend', 'stl', 'obj', 'fbx', 'dwg', 'dxf', 'step', 'iges'],
    font: ['ttf', 'otf', 'woff', 'woff2', 'eot'],
    security: ['pem', 'crt', 'cer', 'key', 'p12', 'pfx', 'jks', 'keystore', 'asc', 'gpg'],
    database: ['db', 'sqlite', 'sqlite3', 'mdb', 'accdb'],
  };
  for (const [type, exts] of Object.entries(groups)) exts.forEach(e => (map[e] = type));
  return map;
})();

const EXT_TO_LANG = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  py: 'python', pyw: 'python', java: 'java', cs: 'csharp', cpp: 'cpp', cc: 'cpp', c: 'c', h: 'c', hpp: 'cpp',
  rs: 'rust', go: 'go', rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin', kts: 'kotlin',
  html: 'html', htm: 'html', css: 'css', scss: 'scss', sass: 'scss', less: 'less',
  json: 'json', jsonc: 'json', json5: 'json', yaml: 'yaml', yml: 'yaml', xml: 'xml', sql: 'sql',
  sh: 'shell', bash: 'shell', zsh: 'shell', ps1: 'powershell', bat: 'bat', cmd: 'bat',
  dockerfile: 'dockerfile', toml: 'toml', ini: 'ini', env: 'shell',
  md: 'markdown', markdown: 'markdown', txt: 'plaintext', log: 'plaintext',
  vue: 'html', svelte: 'html', lua: 'lua', r: 'r', dart: 'dart', scala: 'scala',
  gitignore: 'shell', gitattributes: 'shell', editorconfig: 'ini',
};

const fmt = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const ext = (name = '') => name.split('.').pop()?.toLowerCase() ?? '';

// Smarter file type detection: inspects filenames, compound extensions, and dotfiles
const detectFileType = (fileName = '') => {
  const lower = fileName.toLowerCase().trim();
  const rawExt = ext(lower);

  // Exact type match from primary extension
  if (EXT_TO_TYPE[rawExt]) {
    return EXT_TO_TYPE[rawExt];
  }

  // Dotfiles and common configs without standard extensions
  if (
    lower.startsWith('.env') ||
    lower.includes('.env.') ||
    lower.startsWith('.git') ||
    lower.startsWith('.prettier') ||
    lower.startsWith('.eslint') ||
    lower.startsWith('.babel') ||
    lower === 'dockerfile' ||
    lower.startsWith('dockerfile.') ||
    lower === 'makefile' ||
    lower === 'license' ||
    lower === 'procfile' ||
    lower === 'gemfile' ||
    lower === 'vagrantfile'
  ) {
    return 'code';
  }

  // Check compound extensions (e.g. "config.json.example", "database.yml.sample")
  const parts = lower.split('.');
  if (parts.length > 2) {
    for (let i = parts.length - 2; i >= 1; i--) {
      const part = parts[i];
      if (EXT_TO_TYPE[part]) return EXT_TO_TYPE[part];
    }
  }

  // Any other dotfile with alpha characters (e.g. .bashrc, .zshrc)
  if (lower.startsWith('.') && /^\.[a-z0-9_-]+$/i.test(lower)) {
    return 'code';
  }

  return 'unknown';
};

// Heuristic to detect Monaco syntax language from filename or content
export const detectLanguage = (fileName = '', content = '') => {
  const lower = fileName.toLowerCase().trim();
  const rawExt = ext(lower);

  if (EXT_TO_LANG[rawExt]) return EXT_TO_LANG[rawExt];

  if (lower.includes('dockerfile')) return 'dockerfile';
  if (lower.includes('.env') || lower.startsWith('.env')) return 'shell';
  if (lower.endsWith('.rc') || lower.startsWith('.git') || lower.includes('profile')) return 'shell';
  if (lower.includes('makefile')) return 'makefile';

  // Check compound extensions
  const parts = lower.split('.');
  if (parts.length > 2) {
    for (let i = parts.length - 2; i >= 1; i--) {
      const part = parts[i];
      if (EXT_TO_LANG[part]) return EXT_TO_LANG[part];
    }
  }

  // Fallback to inspecting content
  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { JSON.parse(trimmed); return 'json'; } catch (_) { }
    }
    if (trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html')) return 'html';
    if (trimmed.startsWith('<?xml')) return 'xml';
    if (trimmed.startsWith('#!') && trimmed.includes('sh')) return 'shell';
    if (trimmed.startsWith('#!') && trimmed.includes('python')) return 'python';
  }

  return 'plaintext';
};

// Helper: Inspects raw bytes to determine if content is plain readable text rather than binary
const isBufferText = (uint8Array) => {
  if (!uint8Array || uint8Array.length === 0) return true;
  // Inspect the first 4096 bytes: if null byte (0x00) is present, it's virtually always binary
  const len = Math.min(uint8Array.length, 4096);
  for (let i = 0; i < len; i++) {
    if (uint8Array[i] === 0) return false;
  }
  return true;
};

// ─── Sub-viewers ─────────────────────────────────────────────────────────────

/** IMAGE – pan/zoom/rotate */
function ImageViewer({ src, name }) {
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const onWheel = (e) => {
    e.preventDefault();
    setScale(s => Math.min(10, Math.max(0.1, s - e.deltaY * 0.001)));
  };
  const onMouseDown = (e) => { dragging.current = true; last.current = { x: e.clientX, y: e.clientY }; };
  const onMouseMove = (e) => {
    if (!dragging.current) return;
    setPos(p => ({ x: p.x + e.clientX - last.current.x, y: p.y + e.clientY - last.current.y }));
    last.current = { x: e.clientX, y: e.clientY };
  };
  const reset = () => { setScale(1); setRotate(0); setPos({ x: 0, y: 0 }); };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0a0a] select-none"
      onWheel={onWheel} onMouseDown={onMouseDown}
      onMouseMove={onMouseMove} onMouseUp={() => (dragging.current = false)}
      onMouseLeave={() => (dragging.current = false)} style={{ cursor: dragging.current ? 'grabbing' : 'grab' }}>

      {/* toolbar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1
                      bg-black/60 backdrop-blur border border-white/10 rounded-full px-3 py-1.5 text-white text-xs">
        <button onClick={() => setScale(s => Math.min(10, s + 0.25))} className="p-1.5 hover:bg-white/10 rounded-full"><FaSearchPlus /></button>
        <span className="w-12 text-center font-mono">{(scale * 100).toFixed(0)}%</span>
        <button onClick={() => setScale(s => Math.max(0.1, s - 0.25))} className="p-1.5 hover:bg-white/10 rounded-full"><FaSearchMinus /></button>
        <div className="w-px h-4 bg-white/20 mx-1" />
        <button onClick={() => setRotate(r => (r + 90) % 360)} className="p-1.5 hover:bg-white/10 rounded-full"><FaSync /></button>
        <div className="w-px h-4 bg-white/20 mx-1" />
        <button onClick={reset} className="px-2 py-0.5 hover:bg-white/10 rounded-full">Reset</button>
      </div>

      {/* checkerboard bg hint */}
      <div className="absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(45deg,#1a1a1a 25%,transparent 25%),linear-gradient(-45deg,#1a1a1a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1a1a1a 75%),linear-gradient(-45deg,transparent 75%,#1a1a1a 75%)',
          backgroundSize: '20px 20px', backgroundPosition: '0 0,0 10px,10px -10px,-10px 0'
        }} />

      <img src={src} alt={name} draggable={false}
        className="absolute top-1/2 left-1/2 max-w-none transition-transform"
        style={{
          transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale}) rotate(${rotate}deg)`,
          imageRendering: scale > 2 ? 'pixelated' : 'auto'
        }} />
    </div>
  );
}

/** VIDEO – custom controls */
function VideoViewer({ src, name }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vol, setVol] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const timer = useRef(null);

  const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const toggle = () => { ref.current[playing ? 'pause' : 'play'](); setPlaying(p => !p); };
  const onTime = () => setProgress(ref.current.currentTime);
  const seek = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - r.left) / r.width) * duration;
    ref.current.currentTime = t; setProgress(t);
  };
  const skip = (s) => { ref.current.currentTime = Math.max(0, Math.min(duration, ref.current.currentTime + s)); };

  const resetTimer = () => {
    setShowControls(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShowControls(false), 3000);
  };

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center group"
      onMouseMove={resetTimer} onClick={toggle}>
      <video ref={ref} src={src} className="max-w-full max-h-full object-contain"
        onTimeUpdate={onTime} onLoadedMetadata={e => setDuration(e.target.duration)}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} muted={muted} />

      {/* overlay controls */}
      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        onClick={e => e.stopPropagation()}>
        {/* progress */}
        <div className="relative h-1 bg-white/20 rounded-full cursor-pointer mb-3 group/bar" onClick={seek}>
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow -ml-1.5 opacity-0 group-hover/bar:opacity-100 transition-opacity"
            style={{ left: `${duration ? (progress / duration) * 100 : 0}%` }} />
        </div>
        <div className="flex items-center gap-3 text-white">
          <button onClick={() => skip(-10)} className="hover:text-blue-400 transition-colors"><FaStepBackward size={12} /></button>
          <button onClick={toggle} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
            {playing ? <FaPause size={12} /> : <FaPlay size={12} />}
          </button>
          <button onClick={() => skip(10)} className="hover:text-blue-400 transition-colors"><FaStepForward size={12} /></button>
          <span className="text-xs font-mono text-white/60">{fmtTime(progress)} / {fmtTime(duration)}</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => { setMuted(m => !m); ref.current.muted = !muted; }} className="hover:text-blue-400">
              {muted ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : vol}
              onChange={e => { const v = +e.target.value; setVol(v); ref.current.volume = v; setMuted(v === 0); }}
              className="w-16 accent-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** AUDIO – Google Drive Flat 2.0 Clean Player */
function AudioViewer({ src, name }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vol, setVol] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loop, setLoop] = useState(false);

  const fmtTime = s => {
    if (isNaN(s) || s === Infinity) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const toggle = () => {
    if (!ref.current) return;
    if (playing) {
      ref.current.pause();
    } else {
      ref.current.play().catch(console.error);
    }
  };

  const skip = (secs) => {
    if (!ref.current) return;
    ref.current.currentTime = Math.max(0, Math.min(duration || 0, ref.current.currentTime + secs));
  };

  const handleRateChange = () => {
    const rates = [0.75, 1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (ref.current) ref.current.playbackRate = nextRate;
  };

  const progressPercent = duration ? (progress / duration) * 100 : 0;

  return (
    <div
      className="flex flex-col items-center justify-center w-full h-full p-6 select-none"
      style={{ backgroundColor: 'var(--surface-variant)' }}
    >
      {/* Player Main Card */}
      <div
        className="w-full max-w-md p-8 rounded-3xl flex flex-col items-center shadow-sm"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--outline-variant)'
        }}
      >
        {/* Animated Album Art / Music Wave Icon */}
        <div
          className="relative w-28 h-28 rounded-full flex items-center justify-center mb-6 transition-all duration-300"
          style={{
            backgroundColor: 'var(--primary-container)',
            border: '2px solid #D2E3FC'
          }}
        >
          {/* Subtle pulse ring when playing */}
          {playing && (
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-25"
              style={{ backgroundColor: 'var(--primary)' }}
            />
          )}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-sm"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <FaMusic size={26} className="text-white" />
          </div>
        </div>

        {/* Audio Title & Meta Badge */}
        <h3
          className="text-base font-semibold text-center w-full px-2 truncate mb-1"
          style={{ color: 'var(--on-surface)' }}
          title={name}
        >
          {name}
        </h3>
        <div className="flex items-center gap-2 mb-6">
          <span
            className="text-[11px] font-mono px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: 'var(--surface-variant)', color: 'var(--on-surface-variant)' }}
          >
            {ext(name).toUpperCase()} AUDIO
          </span>
          {playbackRate !== 1 && (
            <span
              className="text-[11px] font-mono px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'var(--primary-container)', color: 'var(--primary)' }}
            >
              {playbackRate}x
            </span>
          )}
        </div>

        {/* Dynamic Waveform / Visualizer Bars */}
        <div className="flex items-center justify-center gap-1 w-full max-w-[280px] h-8 mb-4">
          {[40, 65, 85, 30, 95, 70, 50, 100, 75, 45, 90, 60, 35, 80, 55, 90, 70, 40, 85, 60, 100, 45, 75, 30].map((h, i) => {
            const barProgress = (i / 24) * 100;
            const isPlayed = progressPercent >= barProgress;
            return (
              <div
                key={i}
                className="w-1.5 rounded-full transition-all duration-200"
                style={{
                  height: playing ? `${Math.max(15, (h * (0.6 + Math.random() * 0.4)))}%` : `${h * 0.4}%`,
                  backgroundColor: isPlayed ? 'var(--primary)' : 'var(--outline-variant)'
                }}
              />
            );
          })}
        </div>

        {/* Progress Bar & Timestamps */}
        <div className="w-full mb-6">
          <div
            className="relative h-2 rounded-full cursor-pointer group"
            style={{ backgroundColor: 'var(--outline-variant)' }}
            onClick={e => {
              if (!ref.current || !duration) return;
              const r = e.currentTarget.getBoundingClientRect();
              const clickPos = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
              ref.current.currentTime = clickPos * duration;
            }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: 'var(--primary)'
              }}
            />
            {/* Scrubber head */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 rounded-full bg-white shadow border-2 transition-transform group-hover:scale-125"
              style={{
                left: `${progressPercent}%`,
                borderColor: 'var(--primary)'
              }}
            />
          </div>

          <div className="flex justify-between items-center text-xs font-mono mt-2" style={{ color: 'var(--on-surface-variant)' }}>
            <span>{fmtTime(progress)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls: Rewind, Play/Pause, Fast Forward */}
        <div className="flex items-center justify-center gap-5 mb-6">
          <button
            onClick={() => skip(-10)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
            style={{ color: 'var(--on-surface-variant)' }}
            title="Rewind 10s"
          >
            <FaStepBackward size={15} />
          </button>

          <button
            onClick={toggle}
            className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--primary)' }}
            title={playing ? "Pause" : "Play"}
          >
            {playing ? <FaPause size={18} /> : <FaPlay size={18} className="ml-1" />}
          </button>

          <button
            onClick={() => skip(10)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
            style={{ color: 'var(--on-surface-variant)' }}
            title="Forward 10s"
          >
            <FaStepForward size={15} />
          </button>
        </div>

        {/* Bottom Options: Volume, Playback Speed, Loop */}
        <div
          className="w-full pt-4 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--outline-variant)' }}
        >
          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!ref.current) return;
                const nextMuted = !muted;
                setMuted(nextMuted);
                ref.current.muted = nextMuted;
              }}
              className="p-1.5 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
              style={{ color: 'var(--on-surface-variant)' }}
              title={muted ? "Unmute" : "Mute"}
            >
              {muted || vol === 0 ? <FaVolumeMute size={14} /> : <FaVolumeUp size={14} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : vol}
              onChange={e => {
                const val = +e.target.value;
                setVol(val);
                if (ref.current) {
                  ref.current.volume = val;
                  ref.current.muted = val === 0;
                }
                setMuted(val === 0);
              }}
              className="w-20 sm:w-24 h-1.5 accent-[#1A73E8] rounded-full cursor-pointer bg-gray-200"
            />
          </div>

          {/* Speed & Loop Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRateChange}
              className="px-2 py-1 rounded-md text-xs font-mono font-medium hover:bg-black/5 transition-colors cursor-pointer"
              style={{ color: 'var(--on-surface-variant)' }}
              title="Playback speed"
            >
              {playbackRate}x
            </button>
            <button
              onClick={() => {
                const nextLoop = !loop;
                setLoop(nextLoop);
                if (ref.current) ref.current.loop = nextLoop;
              }}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${loop ? 'bg-[#D2E3FC]' : 'hover:bg-black/5'}`}
              style={{ color: loop ? 'var(--primary)' : 'var(--on-surface-variant)' }}
              title={loop ? "Looping enabled" : "Repeat off"}
            >
              <FaRedo size={12} />
            </button>
          </div>
        </div>

        {/* Native Audio Element */}
        <audio
          ref={ref}
          src={src}
          loop={loop}
          onTimeUpdate={() => {
            if (ref.current) setProgress(ref.current.currentTime);
          }}
          onLoadedMetadata={e => {
            setDuration(e.target.duration);
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      </div>
    </div>
  );
}

/** PDF – Google Drive style embedded PDF viewer with native fallback */
function PDFViewer({ src, file, onDownload }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center" style={{ backgroundColor: 'var(--surface-variant)' }}>
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
          style={{ backgroundColor: '#FCE8E6', border: '1px solid #FAD2CF' }}
        >
          <FaFilePdf size={32} style={{ color: 'var(--error)' }} />
        </div>
        <p className="text-base font-medium" style={{ color: 'var(--on-surface)' }}>
          PDF preview cannot be embedded in this browser
        </p>
        <p className="text-xs max-w-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Your browser security settings prevent direct iframe embedding for this file. You can open it in a clean full tab or download it directly.
        </p>
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => window.open(src, '_blank')}
            className="h-9 px-5 rounded-full text-xs font-medium text-white flex items-center gap-2 transition-colors cursor-pointer"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <FaExternalLinkAlt size={11} /> Open in full tab
          </button>
          <button
            onClick={() => onDownload(file)}
            className="h-9 px-5 rounded-full text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer hover:bg-white"
            style={{ border: '1px solid var(--outline)', color: 'var(--on-surface)' }}
          >
            <FaDownload size={11} /> Download
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" style={{ backgroundColor: 'var(--surface)' }}>
      <object
        data={`${src}#toolbar=1&navpanes=0&scrollbar=1`}
        type="application/pdf"
        className="w-full h-full border-0 block"
        onError={() => setFailed(true)}
      >
        <iframe
          src={`${src}#toolbar=1`}
          className="w-full h-full border-0"
          title={file.name || 'PDF Preview'}
          onError={() => setFailed(true)}
        />
      </object>
    </div>
  );
}

/** CODE – Monaco with copy, light theme, and smart syntax highlighting */
function CodeViewer({ content, filename }) {
  const [copied, setCopied] = useState(false);
  const language = detectLanguage(filename, content);

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: '#ffffff' }}>
      <button
        onClick={copy}
        className="absolute top-3 right-5 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm cursor-pointer hover:bg-gray-100"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid var(--outline-variant)',
          color: 'var(--on-surface)'
        }}
      >
        {copied ? <><FaCheck className="text-green-600" /> Copied!</> : <><FaCopy /> Copy</>}
      </button>
      <Editor
        value={content}
        language={language}
        theme="vs-light"
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          padding: { top: 14 },
          renderLineHighlight: 'all',
          smoothScrolling: true,
          contextmenu: false
        }}
      />
    </div>
  );
}

/** MARKDOWN – rendered with clean light styling */
function MarkdownViewer({ content }) {
  const rendered = content
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-5 mb-2 text-gray-900">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-6 mb-3 text-gray-900">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-4 text-gray-900">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic text-gray-800">$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-xs font-mono text-blue-700">$1</code>')
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc text-gray-700">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-gray-700">$1</li>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" class="text-blue-600 hover:underline">$1</a>')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/^(.+)$/gm, (l) => l.startsWith('<') ? l : l);

  return (
    <div className="w-full h-full overflow-auto" style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-3xl mx-auto px-8 py-10 text-gray-800 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: `<p class="mb-3">${rendered}</p>` }} />
    </div>
  );
}

/** CSV – table with column sorting & stats */
function CSVViewer({ rows }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const PAGE = 50;
  const headers = rows[0] ?? [];
  let data = rows.slice(1);

  if (sortCol !== null) {
    data = [...data].sort((a, b) => {
      const av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
      const n = !isNaN(av) && !isNaN(bv);
      const cmp = n ? Number(av) - Number(bv) : av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  const pages = Math.ceil(data.length / PAGE);
  const visible = data.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div className="w-full h-full flex flex-col bg-white text-gray-800 overflow-hidden">
      {/* stats bar */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-4 text-xs text-gray-500 shrink-0">
        <span className="font-semibold text-gray-700"><FaFileCsv className="inline mr-1 text-green-600" />{data.length} rows × {headers.length} cols</span>
        {pages > 1 && <span>Page {page + 1}/{pages}</span>}
      </div>
      <div className="flex-1 overflow-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-gray-800 text-white z-10">
            <tr>
              <th className="px-3 py-2 text-xs font-mono text-gray-400 border-r border-gray-700 w-10">#</th>
              {headers.map((h, i) => (
                <th key={i} onClick={() => { setSortCol(i); setSortDir(sortCol === i && sortDir === 'asc' ? 'desc' : 'asc'); }}
                  className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider border-r border-gray-700 cursor-pointer hover:bg-gray-700 whitespace-nowrap select-none">
                  {h} {sortCol === i ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'}>
                <td className="px-3 py-1.5 text-xs text-gray-400 font-mono border-r border-gray-100 text-right">{page * PAGE + ri + 1}</td>
                {headers.map((_, ci) => (
                  <td key={ci} className="px-4 py-1.5 border-r border-gray-100 max-w-[240px] truncate" title={row[ci]}>{row[ci] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-center gap-2 shrink-0">
          <button disabled={page === 0} onClick={() => setPage(0)} className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-40 hover:bg-gray-300">«</button>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-40 hover:bg-gray-300">‹</button>
          <span className="text-xs text-gray-600">{page + 1} / {pages}</span>
          <button disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-40 hover:bg-gray-300">›</button>
          <button disabled={page >= pages - 1} onClick={() => setPage(pages - 1)} className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-40 hover:bg-gray-300">»</button>
        </div>
      )}
    </div>
  );
}

/** ZIP – Google Drive Flat 2.0 Archive Explorer */
function buildZipTree(entries) {
  const root = {};
  for (const entry of entries) {
    const parts = entry.name.split('/').filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!node[part]) {
        node[part] = {
          __children: {},
          __isDir: i < parts.length - 1 || entry.dir,
          __size: i === parts.length - 1 ? entry.size : 0,
          __fullPath: parts.slice(0, i + 1).join('/'),
        };
      }
      node = node[part].__children;
    }
  }
  return root;
}

function ZipTreeNode({ node, name, level = 0 }) {
  const [open, setOpen] = React.useState(level === 0);
  const isDir = node.__isDir;
  const children = node.__children;
  const childKeys = Object.keys(children);

  return (
    <>
      <tr
        className="group cursor-pointer select-none transition-colors border-b border-[var(--outline-variant)]"
        style={{ height: '42px' }}
        onClick={isDir ? () => setOpen(v => !v) : undefined}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-variant)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <td className="px-4 py-2" style={{ paddingLeft: `${16 + level * 20}px` }}>
          <div className="flex items-center gap-2.5 min-w-0">
            {isDir ? (
              <span className="flex items-center gap-1.5 text-xs">
                <span className="w-3.5 flex items-center justify-center text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>
                  {open ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />}
                </span>
                {open ? (
                  <FaFolderOpen size={16} style={{ color: '#1A73E8' }} />
                ) : (
                  <FaFolder size={16} style={{ color: '#1A73E8' }} />
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 ml-3.5">
                <FaFileAlt size={15} style={{ color: 'var(--on-surface-variant)' }} />
              </span>
            )}

            <span 
              className={`text-xs truncate max-w-sm sm:max-w-md ${isDir ? 'font-medium' : ''}`}
              style={{ color: isDir ? 'var(--on-surface)' : 'var(--on-surface)' }}
              title={name}
            >
              {name}
            </span>
          </div>
        </td>

        <td className="px-4 py-2 text-xs font-mono text-right shrink-0" style={{ color: 'var(--on-surface-variant)' }}>
          {!isDir && node.__size > 0 ? fmt(node.__size) : isDir ? `${childKeys.length} items` : '—'}
        </td>
      </tr>

      {isDir && open &&
        Object.entries(children)
          .sort(([aName, aNode], [bName, bNode]) => {
            // Folders first, then alphabetically
            if (aNode.__isDir && !bNode.__isDir) return -1;
            if (!aNode.__isDir && bNode.__isDir) return 1;
            return aName.localeCompare(bName);
          })
          .map(([childName, childNode]) => (
            <ZipTreeNode key={childName} node={childNode} name={childName} level={level + 1} />
          ))}
    </>
  );
}

function ZIPViewer({ contents, file, onDownload }) {
  const tree = React.useMemo(() => buildZipTree(contents), [contents]);
  const totalEntries = contents.length;
  const totalSize = contents.reduce((acc, curr) => acc + (curr.size || 0), 0);

  return (
    <div 
      className="w-full h-full flex flex-col select-none"
      style={{ backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
    >
      {/* Archive Header / Stats Bar */}
      <div 
        className="px-6 py-3 flex items-center justify-between shrink-0"
        style={{ 
          backgroundColor: 'var(--surface-variant)', 
          borderBottom: '1px solid var(--outline-variant)' 
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--secondary-container)' }}
          >
            <FaFileArchive size={15} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--on-surface)' }}>
              Archive Contents
            </p>
            <p className="text-[11px] font-mono" style={{ color: 'var(--on-surface-variant)' }}>
              {totalEntries} files & folders · Uncompressed {fmt(totalSize)}
            </p>
          </div>
        </div>

        {onDownload && (
          <button
            onClick={() => onDownload(file)}
            className="h-8 px-4 text-xs font-medium rounded-full text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:opacity-95 active:scale-95"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <FaDownload size={11} />
            <span>Download ZIP</span>
          </button>
        )}
      </div>

      {/* Archive Table Explorer */}
      <div className="flex-1 overflow-auto">
        {Object.entries(tree).length === 0 ? (
          <div className="py-24 text-center text-xs" style={{ color: 'var(--on-surface-variant)' }}>
            Empty archive
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr 
                className="h-9 text-xs font-medium"
                style={{
                  borderBottom: '1px solid var(--outline-variant)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--on-surface-variant)'
                }}
              >
                <th className="px-6 font-normal">Name</th>
                <th className="px-6 text-right font-normal">Size</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(tree)
                .sort(([aName, aNode], [bName, bNode]) => {
                  if (aNode.__isDir && !bNode.__isDir) return -1;
                  if (!aNode.__isDir && bNode.__isDir) return 1;
                  return aName.localeCompare(bName);
                })
                .map(([name, node]) => (
                  <ZipTreeNode key={name} node={node} name={name} level={0} />
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/** FONT preview */
function FontViewer({ src, name }) {
  const id = 'pf-' + Math.random().toString(36).slice(2);
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0d1117] to-[#1a1a2e] p-10 overflow-auto">
      <style>{`@font-face { font-family:'${id}'; src:url('${src}'); }`}</style>
      <p className="text-white/40 text-xs uppercase tracking-widest mb-8 font-mono">{ext(name).toUpperCase()} font · {name}</p>
      {['Aa Bb Cc Dd Ee Ff Gg Hh', 'The quick brown fox jumps', '0123456789 !@#$%^&*()', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'].map((sample, i) => (
        <div key={i} style={{ fontFamily: `'${id}'`, fontSize: [52, 32, 26, 20, 20][i] }}
          className="text-white mb-4 text-center leading-tight tracking-wide">{sample}</div>
      ))}
    </div>
  );
}

/** OFFICE – Support for Office Files (Word, Excel, PowerPoint) */
function OfficeViewer({ src, file, onDownload }) {
  const extension = (file?.name || '').split('.').pop()?.toLowerCase();

  // Dynamic icon and branding based on office doc type
  const getOfficeDetails = () => {
    if (['ppt', 'pptx', 'odp', 'key'].includes(extension)) {
      return {
        name: 'PowerPoint Presentation',
        icon: <FaFilePowerpoint size={38} style={{ color: '#D24726' }} />,
        bg: '#FDF3F0',
        border: '#F8D7DA'
      };
    }
    if (['xls', 'xlsx', 'ods', 'numbers', 'csv'].includes(extension)) {
      return {
        name: 'Excel Spreadsheet',
        icon: <FaFileExcel size={38} style={{ color: '#107C41' }} />,
        bg: '#F0F9F4',
        border: '#D1E7DD'
      };
    }
    return {
      name: 'Word Document',
      icon: <FaFileWord size={38} style={{ color: '#185ABD' }} />,
      bg: '#F0F4FC',
      border: '#D2E3FC'
    };
  };

  const details = getOfficeDetails();

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center p-6 sm:p-12 select-none"
      style={{ backgroundColor: 'var(--surface-variant)' }}
    >
      <div
        className="max-w-lg w-full rounded-3xl p-8 sm:p-10 flex flex-col items-center text-center shadow-sm"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--outline-variant)'
        }}
      >
        {/* Document Type Emblem */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
          style={{
            backgroundColor: details.bg,
            border: `1px solid ${details.border}`
          }}
        >
          {details.icon}
        </div>

        {/* Title & File Name */}
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>
          {details.name}
        </h3>
        <p className="text-xs max-w-sm truncate mb-4 font-mono font-medium" style={{ color: 'var(--on-surface-variant)' }}>
          {file?.name}
        </p>

        {/* Informative pill */}
        <div
          className="px-4 py-3 rounded-2xl text-xs mb-6 text-left leading-relaxed w-full"
          style={{
            backgroundColor: 'var(--surface-variant)',
            border: '1px solid var(--outline-variant)',
            color: 'var(--on-surface-variant)'
          }}
        >
          <p className="font-medium mb-0.5" style={{ color: 'var(--on-surface)' }}>Protected Git Document</p>
          <span>Because this file is secured in your private Git repository, external cloud services (like Microsoft Office Online) cannot access it without authorization. Download the file to edit or open it with your local desktop application.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <button
            onClick={() => onDownload(file)}
            className="h-10 px-6 rounded-full text-xs font-medium text-white flex items-center justify-center gap-2 transition-all cursor-pointer w-full sm:w-auto shadow-sm hover:opacity-95 active:scale-95"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <FaDownload size={12} /> Download & Open Locally
          </button>

          {src && (
            <button
              onClick={() => window.open(src, '_blank')}
              className="h-10 px-5 rounded-full text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer w-full sm:w-auto hover:bg-black/5"
              style={{
                border: '1px solid var(--outline-variant)',
                color: 'var(--on-surface)',
                backgroundColor: 'var(--surface)'
              }}
            >
              <FaExternalLinkAlt size={11} /> Open Direct Blob
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Generic unsupported file card - Google Drive Flat 2.0 minimalist design */
function UnsupportedCard({ icon, title, subtitle, actions, file }) {
  return (
    <div
      className="w-full h-full flex items-center justify-center p-6 sm:p-12 select-none"
      style={{ backgroundColor: 'var(--surface)' }}
    >
      <div
        className="max-w-md w-full rounded-2xl p-8 sm:p-10 flex flex-col items-center text-center transition-all"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--outline-variant)',
          boxShadow: '0 1px 3px rgba(60,64,67,0.08), 0 4px 12px rgba(60,64,67,0.05)'
        }}
      >
        {/* Soft rounded icon container with Google Drive styling */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl mb-5 transition-transform"
          style={{
            backgroundColor: 'var(--secondary-container)',
            color: 'var(--primary)',
            border: '1px solid var(--outline-variant)'
          }}
        >
          {icon || <FaFileAlt />}
        </div>

        {/* Title */}
        <h3 className="text-lg font-medium mb-1.5" style={{ color: 'var(--on-surface)' }}>
          {title || 'No preview available'}
        </h3>

        {/* Subtitle / Filename */}
        {subtitle && (
          <p className="text-xs max-w-sm mb-6 leading-relaxed font-mono" style={{ color: 'var(--on-surface-variant)' }}>
            {subtitle}
          </p>
        )}

        {/* Informational tip pill */}
        <div
          className="px-3.5 py-2 rounded-xl text-[11px] mb-7 max-w-xs"
          style={{
            backgroundColor: 'var(--surface-variant)',
            color: 'var(--on-surface-variant)',
            border: '1px solid var(--outline-variant)'
          }}
        >
          This format cannot be displayed directly in the previewer. Download the file or open it in your browser.
        </div>

        {/* Actions row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          {actions}
        </div>
      </div>
    </div>
  );
}

// ─── TYPE → ICON map for header badge ────────────────────────────────────────
const TYPE_ICONS = {
  image: <FaImage />, video: <FaFileVideo />, audio: <FaMusic />, pdf: <FaFilePdf />,
  code: <FaCode />, text: <FaFileAlt />, office: <FaFileWord />, font: <FaFont />,
  archive: <FaFileArchive />, ebook: <FaBook />, security: <FaLock />, database: <FaDatabase />,
  design: <FaImage />, 'raw-image': <FaImage />, binary: <FaFileAlt />,
};

// ─── Main component ──────────────────────────────────────────────────────────

const FilePreview = ({ file, githubToken, githubUsername, repository, onClose, onDownload, onEdit }) => {
  const [state, setState] = useState({ loading: true, error: null, mediaType: null });
  const [dataUrl, setDataUrl] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [csvData, setCsvData] = useState(null);
  const [zipContents, setZipContents] = useState([]);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef(null);

  const initialMediaType = detectFileType(file.name);
  const [detectedType, setDetectedType] = useState(initialMediaType);
  const mediaType = detectedType !== 'unknown' ? detectedType : initialMediaType;

  const fileExt = ext(file.name);
  const isCSV = fileExt === 'csv' || fileExt === 'tsv';
  const isMarkdown = fileExt === 'md' || fileExt === 'markdown';
  const isEditable = mediaType === 'code' || mediaType === 'text' || ['json', 'env', 'xml', 'yml', 'yaml', 'ini', 'conf', 'properties', 'log', 'md', 'txt', 'csv', 'tsv', 'svg'].includes(fileExt);

  const apiHeaders = { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.raw' };
  const apiBase = `https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(file.path)}`;

  // TanStack useQuery for preview data fetching with caching and automatic retry
  const { data: previewData, isLoading, error: queryError } = useQuery({
    queryKey: ['file-preview', repository, file.path, file.sha],
    queryFn: async () => {
      let rawBlob;

      // Handle chunked files (either via metadata or auto-detected manifest JSON)
      let chunkPaths = file.isChunked && Array.isArray(file.chunkPaths) ? file.chunkPaths : null;
      let isCompressed = file.isCompressed;
      let effectiveMime = file.mimeType;

      if (!chunkPaths) {
        // Check if GitHub content is a smart_slicer_manifest descriptor
        try {
          const checkRes = await axios.get(apiBase, {
            headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.raw' },
            responseType: 'text'
          });
          if (typeof checkRes.data === 'string' && checkRes.data.includes('smart_slicer_manifest')) {
            const parsedManifest = JSON.parse(checkRes.data);
            if (Array.isArray(parsedManifest.chunkPaths) && parsedManifest.chunkPaths.length > 0) {
              chunkPaths = parsedManifest.chunkPaths;
              isCompressed = Boolean(parsedManifest.isCompressed);
              effectiveMime = parsedManifest.mimeType || effectiveMime;
            }
          }
        } catch (e) {
          // Not a JSON manifest or fetch failed, proceed with raw fetch
        }
      }

      if (chunkPaths && chunkPaths.length > 0) {
        const chunkBlobs = await Promise.all(
          chunkPaths.map(async (cPath) => {
            const res = await axios.get(
              `https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(cPath)}`,
              { headers: apiHeaders, responseType: 'blob' }
            );
            return res.data;
          })
        );
        rawBlob = new Blob(chunkBlobs, { type: effectiveMime || (initialMediaType === 'pdf' ? 'application/pdf' : 'application/octet-stream') });
      }

      // If compressed, decompress losslessly
      if (isCompressed) {
        if (!rawBlob) {
          const res = await axios.get(apiBase, { headers: apiHeaders, responseType: 'blob' });
          rawBlob = res.data;
        }
        rawBlob = await decompressBlobLossless(rawBlob);
      }

      if (initialMediaType === 'image' || initialMediaType === 'pdf') {
        if (!rawBlob) {
          const res = await axios.get(apiBase, { headers: apiHeaders, responseType: 'blob' });
          rawBlob = new Blob([res.data], { type: initialMediaType === 'pdf' ? 'application/pdf' : res.data.type });
        }
        return { type: 'blob', blob: rawBlob, mediaType: initialMediaType };
      } else if (initialMediaType === 'code' || initialMediaType === 'text') {
        if (rawBlob) {
          const text = await rawBlob.text();
          if (isCSV) {
            const delimiter = fileExt === 'tsv' ? '\t' : ',';
            const parsed = text.trim().split('\n').map(l => l.split(delimiter));
            return { type: 'csv', parsed, mediaType: 'text' };
          }
          return { type: 'text', content: text, mediaType: initialMediaType };
        }

        if (isCSV) {
          const res = await axios.get(apiBase, { headers: apiHeaders, responseType: 'text' });
          const delimiter = fileExt === 'tsv' ? '\t' : ',';
          const parsed = res.data.trim().split('\n').map(l => l.split(delimiter));
          return { type: 'csv', parsed, mediaType: 'text' };
        } else {
          try {
            const res = await axios.get(apiBase, { headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' } });
            const content = decodeURIComponent(escape(window.atob(res.data.content)));
            return { type: 'text', content, mediaType: initialMediaType };
          } catch (e) {
            const res = await axios.get(apiBase, { headers: apiHeaders, responseType: 'text' });
            return { type: 'text', content: res.data, mediaType: initialMediaType };
          }
        }
      } else if (fileExt === 'zip') {
        const buffer = rawBlob ? await rawBlob.arrayBuffer() : (await axios.get(apiBase, { headers: apiHeaders, responseType: 'arraybuffer' })).data;
        const zip = await JSZip.loadAsync(buffer);
        const entries = [];
        zip.forEach((path, entry) => entries.push({ name: path, dir: entry.dir, size: entry._data?.uncompressedSize || 0 }));
        return { type: 'zip', entries: entries.sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name)), mediaType: 'archive' };
      } else {
        // "Think out of the box": File has an unknown or non-standard extension (e.g. .example, .config, dotfile, or extensionless)
        // If file is under 6MB and not an explicit large media/binary, fetch array buffer & inspect bytes
        if (file.size < 6 * 1024 * 1024) {
          try {
            const buffer = rawBlob ? await rawBlob.arrayBuffer() : (await axios.get(apiBase, { headers: apiHeaders, responseType: 'arraybuffer' })).data;
            const uint8 = new Uint8Array(buffer);
            if (isBufferText(uint8)) {
              // It is readable plain text/code! Decode and display in Monaco
              const decoder = new TextDecoder('utf-8', { fatal: false });
              const textContent = decoder.decode(uint8);
              return { type: 'text', content: textContent, mediaType: 'code' };
            }
            // For binary files, return the authenticated blob so dataUrl is a valid blob: URL
            const authenticatedBlob = rawBlob || new Blob([buffer], { type: 'application/octet-stream' });
            return { type: 'blob', blob: authenticatedBlob, mediaType: initialMediaType };
          } catch (err) {
            console.warn('Text sniffing fallback failed, falling back to direct URL', err);
          }
        }

        if (rawBlob) {
          return { type: 'blob', blob: rawBlob, mediaType: initialMediaType };
        }
        return { type: 'direct', url: file.download_url, mediaType: initialMediaType };
      }
    },
    enabled: Boolean(file && githubToken && repository),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    retry: 2
  });

  useEffect(() => {
    if (!previewData) return;

    if (previewData.mediaType && previewData.mediaType !== 'unknown') {
      setDetectedType(previewData.mediaType);
    }

    if (previewData.type === 'blob') {
      const url = URL.createObjectURL(previewData.blob);
      setDataUrl(url);
      setState({ loading: false, error: null, mediaType: previewData.mediaType || mediaType });
      return () => { if (url) URL.revokeObjectURL(url); };
    } else if (previewData.type === 'csv') {
      setCsvData(previewData.parsed);
      setState({ loading: false, error: null, mediaType: 'text' });
    } else if (previewData.type === 'text') {
      setFileContent(previewData.content);
      setState({ loading: false, error: null, mediaType: previewData.mediaType || 'code' });
    } else if (previewData.type === 'zip') {
      setZipContents(previewData.entries);
      setState({ loading: false, error: null, mediaType: 'archive' });
    } else if (previewData.type === 'direct') {
      setDataUrl(previewData.url);
      setState({ loading: false, error: null, mediaType });
    }
  }, [previewData, mediaType]);

  useEffect(() => {
    if (isLoading) {
      setState({ loading: true, error: null, mediaType });
    } else if (queryError) {
      setState({ loading: false, error: 'Failed to load preview', mediaType });
    }
  }, [isLoading, queryError, mediaType]);

  const toggleFullscreen = () => {
    if (!fullscreen) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
    setFullscreen(f => !f);
  };

  // ── Render body ─────────────────────────────────────────────────────────────
  const renderContent = () => {
    if (state.loading) return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8" style={{ backgroundColor: 'var(--surface)' }}>
        <div
          className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--outline)', borderTopColor: 'var(--primary)' }}
        />
        <p className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
          Preparing preview...
        </p>
      </div>
    );

    if (state.error) {
      // PDF fallback
      if (mediaType === 'pdf') {
        return <PDFViewer src={file.download_url} file={file} onDownload={onDownload} />;
      }
      // Office fallback
      if (mediaType === 'office') {
        return <UnsupportedCard icon="⚠️" title="Couldn't preview file" subtitle={file.name} actions={[
          <button key="dl" onClick={() => onDownload(file)} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"><FaDownload size={12} /> Download</button>,
          <button key="op" onClick={() => window.open(file.download_url, '_blank')} className="px-5 py-2 border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5 flex items-center justify-center gap-2 transition-colors"><FaExternalLinkAlt size={12} /> Open in Browser</button>,
        ]} />;
      }
      // Default fallback
      return (
        <UnsupportedCard icon="⚠️" title={state.error} subtitle={file.name} actions={[
          <button key="dl" onClick={() => onDownload(file)} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"><FaDownload size={12} /> Download</button>,
          <button key="op" onClick={() => window.open(file.download_url, '_blank')} className="px-5 py-2 border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5 flex items-center justify-center gap-2 transition-colors"><FaExternalLinkAlt size={12} /> Open in Browser</button>,
        ]} />
      );
    }

    if (mediaType === 'image' && dataUrl) return <ImageViewer src={dataUrl} name={file.name} />;
    if (mediaType === 'video' && dataUrl) return <VideoViewer src={dataUrl} name={file.name} />;
    if (mediaType === 'audio' && dataUrl) return <AudioViewer src={dataUrl} name={file.name} />;
    if (mediaType === 'pdf' && dataUrl) return <PDFViewer src={dataUrl} file={file} onDownload={onDownload} />;

    if (isCSV && csvData) return <CSVViewer rows={csvData} />;
    if (isMarkdown && fileContent) return <MarkdownViewer content={fileContent} />;
    // Always use Monaco Editor for code, json, text, dotfiles, or any successfully sniffed text content
    if ((mediaType === 'code' || mediaType === 'text' || fileContent) && fileContent !== undefined && typeof fileContent === 'string')
      return <CodeViewer content={fileContent} filename={file.name} />;

    if (fileExt === 'zip' && zipContents.length > 0) return <ZIPViewer contents={zipContents} file={file} onDownload={onDownload} />;
    if (mediaType === 'archive') return <UnsupportedCard icon="📦" title="Archive File" subtitle={`${ext(file.name).toUpperCase()} · ${fmt(file.size)}`} actions={[
      <button key="dl" onClick={() => onDownload(file)} className="h-9 px-5 rounded-full text-xs font-medium text-white flex items-center justify-center gap-2 transition-colors cursor-pointer" style={{ backgroundColor: 'var(--primary)' }}><FaDownload size={11} /> Download & Extract</button>
    ]} />;

    if (mediaType === 'office' && dataUrl) return <OfficeViewer src={dataUrl} file={file} onDownload={onDownload} />;
    if (mediaType === 'font' && dataUrl) return <FontViewer src={dataUrl} name={file.name} />;

    if (mediaType === 'ebook') return <UnsupportedCard icon="📕" title="E-Book File" subtitle={`${ext(file.name).toUpperCase()} format`} actions={[
      <button key="op" onClick={() => window.open(dataUrl, '_blank')} className="h-9 px-5 rounded-full text-xs font-medium text-white flex items-center justify-center gap-2 transition-colors cursor-pointer" style={{ backgroundColor: 'var(--primary)' }}><FaExternalLinkAlt size={11} /> Open E-Book</button>,
      <button key="dl" onClick={() => onDownload(file)} className="h-9 px-5 rounded-full text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer" style={{ border: '1px solid var(--outline-variant)', color: 'var(--on-surface)', backgroundColor: 'var(--surface)' }}><FaDownload size={11} /> Download</button>,
    ]} />;

    if (mediaType === 'binary') return <UnsupportedCard icon="⚠️" title="Executable File" subtitle={`${ext(file.name).toUpperCase()} files cannot be previewed for security reasons.`} actions={[
      <button key="dl" onClick={() => onDownload(file)} className="h-9 px-5 rounded-full text-xs font-medium text-white flex items-center justify-center gap-2 transition-colors cursor-pointer" style={{ backgroundColor: 'var(--primary)' }}><FaDownload size={11} /> Download File</button>
    ]} />;

    if (mediaType === 'raw-image' || mediaType === 'design') return <UnsupportedCard icon="🎨" title={mediaType === 'raw-image' ? 'RAW Image' : 'Design File'} subtitle={`${ext(file.name).toUpperCase()} requires specialized software.`} actions={[
      <button key="dl" onClick={() => onDownload(file)} className="h-9 px-5 rounded-full text-xs font-medium text-white flex items-center justify-center gap-2 transition-colors cursor-pointer" style={{ backgroundColor: 'var(--primary)' }}><FaDownload size={11} /> Download File</button>
    ]} />;

    if (mediaType === 'security') return <UnsupportedCard icon="🔐" title="Security Certificate" subtitle={`${ext(file.name).toUpperCase()} files contain sensitive credentials.`} actions={[
      <button key="dl" onClick={() => onDownload(file)} className="h-9 px-5 rounded-full text-xs font-medium text-white flex items-center justify-center gap-2 transition-colors cursor-pointer" style={{ backgroundColor: 'var(--primary)' }}><FaDownload size={11} /> Download Certificate</button>
    ]} />;

    if (mediaType === 'database') return <UnsupportedCard icon="🗄️" title="Database File" subtitle={`${ext(file.name).toUpperCase()} cannot be previewed in the browser.`} actions={[
      <button key="dl" onClick={() => onDownload(file)} className="h-9 px-5 rounded-full text-xs font-medium text-white flex items-center justify-center gap-2 transition-colors cursor-pointer" style={{ backgroundColor: 'var(--primary)' }}><FaDownload size={11} /> Download Database</button>
    ]} />;

    return <UnsupportedCard icon="❓" title="Unsupported Format" subtitle="This file type cannot be previewed directly." actions={[
      <button key="dl" onClick={() => onDownload(file)} className="h-9 px-5 rounded-full text-xs font-medium text-white flex items-center justify-center gap-2 transition-colors cursor-pointer" style={{ backgroundColor: 'var(--primary)' }}><FaDownload size={11} /> Download File</button>,
      <button key="op" onClick={() => { if (dataUrl) window.open(dataUrl, '_blank'); else onDownload(file); }} className="h-9 px-5 rounded-full text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer" style={{ border: '1px solid var(--outline-variant)', color: 'var(--on-surface)', backgroundColor: 'var(--surface)' }}><FaExternalLinkAlt size={11} /> Open in Browser</button>,
    ]} />;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4 select-none animate-overlay-in"
      style={{ backgroundColor: 'var(--scrim)' }}
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="w-full h-full sm:max-w-[95vw] sm:max-h-[95vh] flex flex-col sm:rounded-xl overflow-hidden elevation-dialog animate-modal-in"
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '12px',
          border: '1px solid var(--outline-variant)',
          color: 'var(--on-surface)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="h-14 px-6 flex items-center justify-between shrink-0"
          style={{
            borderBottom: '1px solid var(--outline-variant)',
            backgroundColor: 'var(--surface-variant)'
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* type icon */}
            <span style={{ color: 'var(--primary)' }} className="shrink-0 text-sm">
              {TYPE_ICONS[mediaType] ?? <FaFileAlt />}
            </span>
            <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-lg" style={{ color: 'var(--on-surface)' }}>
              {file.name}
            </span>
            <span
              className="hidden sm:inline text-[11px] px-2 py-0.5 rounded font-mono uppercase tracking-wider shrink-0"
              style={{
                backgroundColor: 'var(--outline-variant)',
                color: 'var(--on-surface-variant)'
              }}
            >
              {mediaType}
            </span>
            {file.size > 0 && (
              <span className="hidden sm:inline text-xs font-mono shrink-0" style={{ color: 'var(--on-surface-variant)' }}>
                {fmt(file.size)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEditable && onEdit && (
              <button
                onClick={() => {
                  onEdit(file, fileContent);
                  onClose();
                }}
                title="Edit this file"
                className="h-8 px-3.5 text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--on-primary)'
                }}
              >
                <FaEdit size={11} /> Edit
              </button>
            )}

            <button
              onClick={() => onDownload(file)}
              title="Download"
              className="p-2 rounded-full hover:bg-[#E8EAED] transition-colors"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              <FaDownload size={13} />
            </button>

            <button
              onClick={() => {
                if (dataUrl) {
                  window.open(dataUrl, '_blank');
                } else {
                  // Never open raw GitHub unauthenticated links which 404 on private repos
                  onDownload(file);
                }
              }}
              title="Open in new tab"
              className="p-2 rounded-full hover:bg-[#E8EAED] transition-colors cursor-pointer"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              <FaExternalLinkAlt size={13} />
            </button>

            <button
              onClick={toggleFullscreen}
              title="Fullscreen"
              className="p-2 rounded-full hover:bg-[#E8EAED] transition-colors"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              {fullscreen ? <MdFullscreenExit size={16} /> : <MdFullscreen size={16} />}
            </button>

            <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--outline-variant)' }} />

            <button
              onClick={onClose}
              title="Close"
              className="p-2 rounded-full hover:bg-[#E8EAED] transition-colors"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              <FaTimes size={14} />
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-hidden relative" style={{ backgroundColor: 'var(--surface)' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default FilePreview;