import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  FaTimes, FaFilePdf, FaFileVideo, FaFileWord, FaDownload,
  FaExternalLinkAlt, FaFolder, FaFileAlt, FaExpand, FaCompress,
  FaCopy, FaCheck, FaSearchPlus, FaSearchMinus, FaSync,
  FaVolumeUp, FaVolumeMute, FaPlay, FaPause, FaStepBackward,
  FaStepForward, FaMusic, FaCode, FaImage, FaFileCsv,
  FaFileArchive, FaLock, FaDatabase, FaFont, FaBook
} from 'react-icons/fa';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import axios from 'axios';

// ─── Helpers ────────────────────────────────────────────────────────────────

const EXT_TO_TYPE = (() => {
  const map = {};
  const groups = {
    binary:   ['exe','bin','app','dmg','apk','ipa','msi'],
    image:    ['jpg','jpeg','png','gif','webp','svg','bmp','ico','tiff','tif','avif','heic','heif'],
    'raw-image': ['psd','ai','eps','raw','cr2','nef','arw','dng'],
    code:     ['html','css','scss','sass','less','js','jsx','ts','tsx','vue','svelte',
                'java','kt','groovy','py','rb','php','go','rs','c','cpp','h','cs','swift',
                'json','yaml','yml','xml','toml','ini','env','properties','conf','sql',
                'sh','bash','zsh','ps1','bat','cmd','gradle','pom','dockerfile','makefile',
                'lock','gitignore','editorconfig','nvmrc'],
    text:     ['txt','md','rtf','log','csv','tsv'],
    pdf:      ['pdf'],
    office:   ['doc','docx','odt','pages','xls','xlsx','ods','numbers','ppt','pptx','odp','key'],
    ebook:    ['epub','mobi','azw','azw3','fb2'],
    video:    ['mp4','mov','avi','mkv','webm','flv','wmv','mpeg','mpg','3gp','m4v'],
    audio:    ['mp3','wav','ogg','aac','m4a','flac','aiff','wma','amr','opus','mid','midi'],
    archive:  ['zip','rar','7z','tar','gz','tgz','bz2','xz','iso','cab','jar','war','ear'],
    design:   ['fig','sketch','xd','blend','stl','obj','fbx','dwg','dxf','step','iges'],
    font:     ['ttf','otf','woff','woff2','eot'],
    security: ['pem','crt','cer','key','p12','pfx','jks','keystore','asc','gpg'],
    database: ['db','sqlite','sqlite3','mdb','accdb'],
  };
  for (const [type, exts] of Object.entries(groups)) exts.forEach(e => (map[e] = type));
  return map;
})();

const EXT_TO_LANG = {
  js:'javascript',jsx:'javascript',ts:'typescript',tsx:'typescript',
  py:'python',java:'java',cs:'csharp',cpp:'cpp',c:'c',h:'c',
  rs:'rust',go:'go',rb:'ruby',php:'php',swift:'swift',kt:'kotlin',
  html:'html',css:'css',scss:'scss',sass:'scss',less:'less',
  json:'json',yaml:'yaml',yml:'yaml',xml:'xml',sql:'sql',
  sh:'shell',bash:'shell',zsh:'shell',ps1:'powershell',bat:'bat',cmd:'bat',
  dockerfile:'dockerfile',toml:'toml',ini:'ini',env:'shell',
  md:'markdown',txt:'plaintext',log:'plaintext',
  vue:'html',svelte:'html',
};

const fmt = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1048576).toFixed(1)} MB`;
};

const ext = (name='') => name.split('.').pop()?.toLowerCase() ?? '';

// ─── Sub-viewers ─────────────────────────────────────────────────────────────

/** IMAGE – pan/zoom/rotate */
function ImageViewer({ src, name }) {
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [pos, setPos] = useState({ x:0, y:0 });
  const dragging = useRef(false);
  const last = useRef({ x:0, y:0 });

  const onWheel = (e) => {
    e.preventDefault();
    setScale(s => Math.min(10, Math.max(0.1, s - e.deltaY * 0.001)));
  };
  const onMouseDown = (e) => { dragging.current = true; last.current = { x:e.clientX, y:e.clientY }; };
  const onMouseMove = (e) => {
    if (!dragging.current) return;
    setPos(p => ({ x: p.x + e.clientX - last.current.x, y: p.y + e.clientY - last.current.y }));
    last.current = { x:e.clientX, y:e.clientY };
  };
  const reset = () => { setScale(1); setRotate(0); setPos({ x:0, y:0 }); };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0a0a] select-none"
         onWheel={onWheel} onMouseDown={onMouseDown}
         onMouseMove={onMouseMove} onMouseUp={() => (dragging.current=false)}
         onMouseLeave={() => (dragging.current=false)} style={{ cursor: dragging.current ? 'grabbing':'grab' }}>

      {/* toolbar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1
                      bg-black/60 backdrop-blur border border-white/10 rounded-full px-3 py-1.5 text-white text-xs">
        <button onClick={() => setScale(s=>Math.min(10,s+0.25))} className="p-1.5 hover:bg-white/10 rounded-full"><FaSearchPlus/></button>
        <span className="w-12 text-center font-mono">{(scale*100).toFixed(0)}%</span>
        <button onClick={() => setScale(s=>Math.max(0.1,s-0.25))} className="p-1.5 hover:bg-white/10 rounded-full"><FaSearchMinus/></button>
        <div className="w-px h-4 bg-white/20 mx-1"/>
        <button onClick={() => setRotate(r=>(r+90)%360)} className="p-1.5 hover:bg-white/10 rounded-full"><FaSync/></button>
        <div className="w-px h-4 bg-white/20 mx-1"/>
        <button onClick={reset} className="px-2 py-0.5 hover:bg-white/10 rounded-full">Reset</button>
      </div>

      {/* checkerboard bg hint */}
      <div className="absolute inset-0"
           style={{ backgroundImage:'linear-gradient(45deg,#1a1a1a 25%,transparent 25%),linear-gradient(-45deg,#1a1a1a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1a1a1a 75%),linear-gradient(-45deg,transparent 75%,#1a1a1a 75%)',
                    backgroundSize:'20px 20px', backgroundPosition:'0 0,0 10px,10px -10px,-10px 0' }}/>

      <img src={src} alt={name} draggable={false}
           className="absolute top-1/2 left-1/2 max-w-none transition-transform"
           style={{ transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale}) rotate(${rotate}deg)`,
                    imageRendering: scale > 2 ? 'pixelated' : 'auto' }}/>
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

  const fmtTime = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

  const toggle = () => { ref.current[playing ? 'pause' : 'play'](); setPlaying(p=>!p); };
  const onTime = () => setProgress(ref.current.currentTime);
  const seek = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - r.left) / r.width) * duration;
    ref.current.currentTime = t; setProgress(t);
  };
  const skip = (s) => { ref.current.currentTime = Math.max(0,Math.min(duration, ref.current.currentTime+s)); };

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
      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100':'opacity-0'}`}
           onClick={e=>e.stopPropagation()}>
        {/* progress */}
        <div className="relative h-1 bg-white/20 rounded-full cursor-pointer mb-3 group/bar" onClick={seek}>
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width:`${duration ? (progress/duration)*100:0}%` }}/>
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow -ml-1.5 opacity-0 group-hover/bar:opacity-100 transition-opacity"
               style={{ left:`${duration ? (progress/duration)*100:0}%` }}/>
        </div>
        <div className="flex items-center gap-3 text-white">
          <button onClick={() => skip(-10)} className="hover:text-blue-400 transition-colors"><FaStepBackward size={12}/></button>
          <button onClick={toggle} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
            {playing ? <FaPause size={12}/> : <FaPlay size={12}/>}
          </button>
          <button onClick={() => skip(10)} className="hover:text-blue-400 transition-colors"><FaStepForward size={12}/></button>
          <span className="text-xs font-mono text-white/60">{fmtTime(progress)} / {fmtTime(duration)}</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => { setMuted(m=>!m); ref.current.muted = !muted; }} className="hover:text-blue-400">
              {muted ? <FaVolumeMute/> : <FaVolumeUp/>}
            </button>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : vol}
                   onChange={e => { const v=+e.target.value; setVol(v); ref.current.volume=v; setMuted(v===0); }}
                   className="w-16 accent-blue-500"/>
          </div>
        </div>
      </div>
    </div>
  );
}

/** AUDIO – waveform-style player */
function AudioViewer({ src, name }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vol, setVol] = useState(1);

  const fmtTime = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const toggle = () => { ref.current[playing ? 'pause' : 'play'](); };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-[#0d0d1a] to-[#0a1628] p-8">
      {/* disc art */}
      <div className={`w-40 h-40 rounded-full border-4 border-blue-500/30 bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center shadow-[0_0_60px_rgba(59,130,246,0.3)] mb-8 ${playing ? 'animate-spin' : ''}`}
           style={{ animationDuration:'4s' }}>
        <div className="w-12 h-12 rounded-full bg-[#0d0d1a] flex items-center justify-center">
          <FaMusic size={18} className="text-blue-400"/>
        </div>
      </div>

      <p className="text-white font-semibold mb-1 text-center max-w-xs truncate">{name}</p>
      <p className="text-white/40 text-sm mb-8 font-mono">{ext(name).toUpperCase()}</p>

      {/* progress bar */}
      <div className="w-full max-w-sm mb-4">
        <div className="relative h-1.5 bg-white/10 rounded-full cursor-pointer"
             onClick={e => { const r=e.currentTarget.getBoundingClientRect(); ref.current.currentTime=((e.clientX-r.left)/r.width)*duration; }}>
          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all"
               style={{ width:`${duration ? (progress/duration)*100:0}%` }}/>
        </div>
        <div className="flex justify-between text-xs text-white/40 mt-1 font-mono">
          <span>{fmtTime(progress)}</span><span>{fmtTime(duration)}</span>
        </div>
      </div>

      {/* controls */}
      <div className="flex items-center gap-6 mb-6">
        <button onClick={() => { ref.current.currentTime=Math.max(0,ref.current.currentTime-10); }} className="text-white/50 hover:text-white transition-colors"><FaStepBackward/></button>
        <button onClick={toggle} className="w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-105 active:scale-95">
          {playing ? <FaPause size={18}/> : <FaPlay size={18} className="ml-1"/>}
        </button>
        <button onClick={() => { ref.current.currentTime=Math.min(duration,ref.current.currentTime+10); }} className="text-white/50 hover:text-white transition-colors"><FaStepForward/></button>
      </div>

      {/* volume */}
      <div className="flex items-center gap-2 text-white/50">
        <FaVolumeMute size={12}/>
        <input type="range" min={0} max={1} step={0.05} value={vol}
               onChange={e => { setVol(+e.target.value); ref.current.volume=+e.target.value; }}
               className="w-28 accent-blue-500"/>
        <FaVolumeUp size={12}/>
      </div>

      <audio ref={ref} src={src} onTimeUpdate={() => setProgress(ref.current.currentTime)}
             onLoadedMetadata={e => setDuration(e.target.duration)}
             onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}/>
    </div>
  );
}

/** PDF – embedded with fallback */
function PDFViewer({ src, file, onDownload }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="flex flex-col items-center justify-center h-full gap-5 bg-[#0d1117] text-white p-8">
      <FaFilePdf size={56} className="text-red-400"/>
      <p className="text-lg font-semibold">PDF preview blocked by browser</p>
      <div className="flex gap-3">
        <button onClick={() => window.open(src,'_blank')} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold flex items-center gap-2 transition-colors">
          <FaExternalLinkAlt size={12}/> Open in Tab
        </button>
        <button onClick={() => onDownload(file)} className="px-6 py-2.5 border border-white/20 hover:bg-white/5 rounded-lg font-semibold flex items-center gap-2 transition-colors">
          <FaDownload size={12}/> Download
        </button>
      </div>
    </div>
  ) : (
    <iframe src={src} className="w-full h-full border-0" title="PDF Preview"
            onError={() => setFailed(true)}/>
  );
}

/** CODE – Monaco with copy */
function CodeViewer({ content, filename }) {
  const [copied, setCopied] = useState(false);
  const language = EXT_TO_LANG[ext(filename)] ?? 'plaintext';

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full h-full">
      <button onClick={copy}
              className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 hover:text-white text-xs transition-all">
        {copied ? <><FaCheck className="text-green-400"/> Copied!</> : <><FaCopy/> Copy</>}
      </button>
      <Editor value={content} language={language} theme="vs-dark"
              options={{ readOnly:true, minimap:{ enabled:false }, fontSize:13, lineNumbers:'on',
                         scrollBeyondLastLine:false, wordWrap:'on', padding:{ top:12 },
                         renderLineHighlight:'all', smoothScrolling:true, contextmenu:false }}/>
    </div>
  );
}

/** MARKDOWN – rendered with basic HTML */
function MarkdownViewer({ content }) {
  const rendered = content
    .replace(/^### (.+)$/gm,'<h3 class="text-lg font-semibold mt-5 mb-2 text-white">$1</h3>')
    .replace(/^## (.+)$/gm,'<h2 class="text-xl font-bold mt-6 mb-3 text-white">$1</h2>')
    .replace(/^# (.+)$/gm,'<h1 class="text-2xl font-bold mt-6 mb-4 text-white">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g,'<strong class="font-semibold text-white">$1</strong>')
    .replace(/\*(.+?)\*/g,'<em class="italic">$1</em>')
    .replace(/`(.+?)`/g,'<code class="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-blue-300">$1</code>')
    .replace(/^[-*] (.+)$/gm,'<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm,'<li class="ml-4 list-decimal">$1</li>')
    .replace(/\[(.+?)\]\((.+?)\)/g,'<a href="$2" target="_blank" class="text-blue-400 hover:underline">$1</a>')
    .replace(/\n\n/g,'</p><p class="mb-3">')
    .replace(/^(.+)$/gm, (l) => l.startsWith('<') ? l : l);

  return (
    <div className="w-full h-full overflow-auto bg-[#0d1117]">
      <div className="max-w-3xl mx-auto px-8 py-10 text-white/80 leading-relaxed prose-invert"
           dangerouslySetInnerHTML={{ __html: `<p class="mb-3">${rendered}</p>` }}/>
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
    data = [...data].sort((a,b) => {
      const av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
      const n = !isNaN(av) && !isNaN(bv);
      const cmp = n ? Number(av)-Number(bv) : av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  const pages = Math.ceil(data.length / PAGE);
  const visible = data.slice(page*PAGE, page*PAGE+PAGE);

  return (
    <div className="w-full h-full flex flex-col bg-white text-gray-800 overflow-hidden">
      {/* stats bar */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-4 text-xs text-gray-500 shrink-0">
        <span className="font-semibold text-gray-700"><FaFileCsv className="inline mr-1 text-green-600"/>{data.length} rows × {headers.length} cols</span>
        {pages > 1 && <span>Page {page+1}/{pages}</span>}
      </div>
      <div className="flex-1 overflow-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-gray-800 text-white z-10">
            <tr>
              <th className="px-3 py-2 text-xs font-mono text-gray-400 border-r border-gray-700 w-10">#</th>
              {headers.map((h,i) => (
                <th key={i} onClick={() => { setSortCol(i); setSortDir(sortCol===i && sortDir==='asc' ? 'desc':'asc'); }}
                    className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider border-r border-gray-700 cursor-pointer hover:bg-gray-700 whitespace-nowrap select-none">
                  {h} {sortCol===i ? (sortDir==='asc'?'↑':'↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, ri) => (
              <tr key={ri} className={ri%2===0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'}>
                <td className="px-3 py-1.5 text-xs text-gray-400 font-mono border-r border-gray-100 text-right">{page*PAGE+ri+1}</td>
                {headers.map((_,ci) => (
                  <td key={ci} className="px-4 py-1.5 border-r border-gray-100 max-w-[240px] truncate" title={row[ci]}>{row[ci] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-center gap-2 shrink-0">
          <button disabled={page===0} onClick={() => setPage(0)} className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-40 hover:bg-gray-300">«</button>
          <button disabled={page===0} onClick={() => setPage(p=>p-1)} className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-40 hover:bg-gray-300">‹</button>
          <span className="text-xs text-gray-600">{page+1} / {pages}</span>
          <button disabled={page>=pages-1} onClick={() => setPage(p=>p+1)} className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-40 hover:bg-gray-300">›</button>
          <button disabled={page>=pages-1} onClick={() => setPage(pages-1)} className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-40 hover:bg-gray-300">»</button>
        </div>
      )}
    </div>
  );
}

/** ZIP – expandable/collapsible file tree */
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
  const [open, setOpen] = React.useState(level === 0); // root open by default
  const isDir = node.__isDir;
  const children = node.__children;
  return (
    <>
      <div
        className="flex items-center gap-2 px-4 py-1.5 hover:bg-white/5 border-b border-white/5 transition-colors select-none"
        style={{ paddingLeft: `${16 + level * 20}px` }}
        onClick={isDir ? () => setOpen((v) => !v) : undefined}
      >
        {isDir ? (
          <span className="mr-1 cursor-pointer">
            {open ? <FaFolder className="text-blue-400" size={13}/> : <FaFolder className="text-white/30" size={13}/>} 
          </span>
        ) : (
          <FaFileAlt className="text-white/30" size={12}/>
        )}
        <span className={isDir ? 'text-blue-300 font-medium' : 'text-white/70'}>{name}</span>
        {!isDir && node.__size > 0 && (
          <span className="ml-auto text-white/30 text-xs">{fmt(node.__size)}</span>
        )}
      </div>
      {isDir && open &&
        Object.entries(children)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([childName, childNode]) => (
            <ZipTreeNode key={childName} node={childNode} name={childName} level={level + 1} />
          ))}
    </>
  );
}

function ZIPViewer({ contents, file, onDownload }) {
  const tree = React.useMemo(() => buildZipTree(contents), [contents]);
  return (
    <div className="w-full h-full flex flex-col bg-[#0d1117] text-white overflow-hidden">
      <div className="flex-1 overflow-auto font-mono text-sm">
        {Object.entries(tree).length === 0 ? (
          <div className="px-4 py-6 text-white/40">Empty archive</div>
        ) : (
          Object.entries(tree)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, node]) => (
              <ZipTreeNode key={name} node={node} name={name} />
            ))
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
      {['Aa Bb Cc Dd Ee Ff Gg Hh','The quick brown fox jumps','0123456789 !@#$%^&*()','ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'].map((sample, i) => (
        <div key={i} style={{ fontFamily:`'${id}'`, fontSize: [52,32,26,20,20][i] }}
             className="text-white mb-4 text-center leading-tight tracking-wide">{sample}</div>
      ))}
    </div>
  );
}

/** OFFICE – Google Docs viewer embed */
function OfficeViewer({ src, file, onDownload }) {
  const gdocsUrl = `https://docs.google.com/gview?url=${encodeURIComponent(src)}&embedded=true`;
  return (
    <div className="w-full h-full flex flex-col bg-[#f6f8fa]">
      <iframe src={gdocsUrl} className="flex-1 border-0" title="Document Preview"
              sandbox="allow-scripts allow-same-origin allow-popups"/>
      <div className="px-4 py-2 bg-white border-t border-gray-200 flex items-center justify-between text-sm shrink-0">
        <span className="text-gray-500 text-xs">Powered by Google Docs Viewer</span>
        <div className="flex gap-2">
          <button onClick={() => window.open(gdocsUrl,'_blank')} className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium hover:bg-gray-50 flex items-center gap-1.5 transition-colors">
            <FaExternalLinkAlt size={10}/> Full screen
          </button>
          <button onClick={() => onDownload(file)} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-500 flex items-center gap-1.5 transition-colors">
            <FaDownload size={10}/> Download
          </button>
        </div>
      </div>
    </div>
  );
}

/** Generic unsupported file card */
function UnsupportedCard({ icon, title, subtitle, actions }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#090c10] p-8">
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-10 max-w-sm text-center shadow-2xl">
        <div className="text-5xl mb-5">{icon}</div>
        <h3 className="text-white text-lg font-bold mb-2">{title}</h3>
        {subtitle && <p className="text-white/50 text-sm mb-7">{subtitle}</p>}
        <div className="flex flex-col gap-3">{actions}</div>
      </div>
    </div>
  );
}

// ─── TYPE → ICON map for header badge ────────────────────────────────────────
const TYPE_ICONS = {
  image:<FaImage/>, video:<FaFileVideo/>, audio:<FaMusic/>, pdf:<FaFilePdf/>,
  code:<FaCode/>, text:<FaFileAlt/>, office:<FaFileWord/>, font:<FaFont/>,
  archive:<FaFileArchive/>, ebook:<FaBook/>, security:<FaLock/>, database:<FaDatabase/>,
  design:<FaImage/>, 'raw-image':<FaImage/>, binary:<FaFileAlt/>,
};

// ─── Main component ──────────────────────────────────────────────────────────

const FilePreview = ({ file, githubToken, githubUsername, repository, onClose, onDownload }) => {
  const [state, setState] = useState({ loading:true, error:null, mediaType:null });
  const [dataUrl, setDataUrl] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [csvData, setCsvData] = useState(null);
  const [zipContents, setZipContents] = useState([]);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef(null);

  const fileExt = ext(file.name);
  const mediaType = EXT_TO_TYPE[fileExt] ?? 'unknown';
  const isCSV = fileExt === 'csv' || fileExt === 'tsv';
  const isMarkdown = fileExt === 'md';

  const apiHeaders = { Authorization:`Bearer ${githubToken}`, Accept:'application/vnd.github.raw' };
  const apiBase = `https://api.github.com/repos/${githubUsername}/${repository}/contents/${encodeURIComponent(file.path)}`;

  useEffect(() => {
    (async () => {
      try {
        if (mediaType === 'image') {
          const res = await axios.get(apiBase, { headers:apiHeaders, responseType:'blob' });
          setDataUrl(URL.createObjectURL(new Blob([res.data])));
        } else if (mediaType === 'code' || mediaType === 'text') {
          if (isCSV) {
            const res = await axios.get(apiBase, { headers:apiHeaders, responseType:'text' });
            const delimiter = fileExt === 'tsv' ? '\t' : ',';
            setCsvData(res.data.trim().split('\n').map(l => l.split(delimiter)));
          } else {
            // Try GitHub API for content, fallback to raw if needed
            try {
              const res = await axios.get(apiBase, { headers:{ Authorization:`Bearer ${githubToken}`, Accept:'application/vnd.github+json' }});
              setFileContent(decodeURIComponent(escape(window.atob(res.data.content))));
            } catch (e) {
              // fallback to raw
              try {
                const res = await axios.get(apiBase, { headers:apiHeaders, responseType:'text' });
                setFileContent(res.data);
              } catch (e2) {
                setState({ loading:false, error:'Failed to load preview', mediaType });
                return;
              }
            }
          }
        } else if (fileExt === 'zip') {
          const res = await axios.get(apiBase, { headers:apiHeaders, responseType:'arraybuffer' });
          const zip = await JSZip.loadAsync(res.data);
          const entries = [];
          zip.forEach((path, entry) => entries.push({ name:path, dir:entry.dir, size:entry._data?.uncompressedSize||0 }));
          setZipContents(entries.sort((a,b) => (b.dir - a.dir) || a.name.localeCompare(b.name)));
        } else {
          setDataUrl(file.download_url);
        }
        setState({ loading:false, error:null, mediaType });
      } catch (err) {
        setState({ loading:false, error:'Failed to load preview', mediaType });
      }
    })();

    return () => { if (dataUrl?.startsWith('blob:')) URL.revokeObjectURL(dataUrl); };
  }, [file]);

  const toggleFullscreen = () => {
    if (!fullscreen) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
    setFullscreen(f => !f);
  };

  // ── Render body ─────────────────────────────────────────────────────────────
  const renderContent = () => {
    if (state.loading) return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-white">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/20"/>
          <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin"/>
        </div>
        <p className="text-white/50 text-sm">Loading preview…</p>
      </div>
    );

    if (state.error) {
      // PDF fallback
      if (mediaType === 'pdf') {
        return <PDFViewer src={file.download_url} file={file} onDownload={onDownload}/>;
      }
      // Office fallback
      if (mediaType === 'office') {
        return <UnsupportedCard icon="⚠️" title="Couldn't preview file" subtitle={file.name} actions={[
          <button key="dl" onClick={() => onDownload(file)} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"><FaDownload size={12}/> Download</button>,
          <button key="op" onClick={() => window.open(file.download_url,'_blank')} className="px-5 py-2 border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5 flex items-center justify-center gap-2 transition-colors"><FaExternalLinkAlt size={12}/> Open in Browser</button>,
        ]}/>;
      }
      // Default fallback
      return (
        <UnsupportedCard icon="⚠️" title={state.error} subtitle={file.name} actions={[
          <button key="dl" onClick={() => onDownload(file)} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"><FaDownload size={12}/> Download</button>,
          <button key="op" onClick={() => window.open(file.download_url,'_blank')} className="px-5 py-2 border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5 flex items-center justify-center gap-2 transition-colors"><FaExternalLinkAlt size={12}/> Open in Browser</button>,
        ]}/>
      );
    }

    if (mediaType === 'image' && dataUrl) return <ImageViewer src={dataUrl} name={file.name}/>;
    if (mediaType === 'video' && dataUrl) return <VideoViewer src={dataUrl} name={file.name}/>;
    if (mediaType === 'audio' && dataUrl) return <AudioViewer src={dataUrl} name={file.name}/>;
    if (mediaType === 'pdf' && dataUrl) return <PDFViewer src={dataUrl} file={file} onDownload={onDownload}/>;

    if (isCSV && csvData) return <CSVViewer rows={csvData}/>;
    if (isMarkdown && fileContent) return <MarkdownViewer content={fileContent}/>;
    // Always use Monaco Editor for code, json, text, and config files
    if ((mediaType === 'code' || mediaType === 'text' || ['json','env','xml','yml','yaml','ini','conf','properties','log','md','txt'].includes(fileExt)) && fileContent !== undefined)
      return <CodeViewer content={fileContent} filename={file.name}/>;

    if (fileExt === 'zip' && zipContents.length > 0) return <ZIPViewer contents={zipContents} file={file} onDownload={onDownload}/>;
    if (mediaType === 'archive') return <UnsupportedCard icon="📦" title="Archive File" subtitle={`${ext(file.name).toUpperCase()} · ${fmt(file.size)}`} actions={[
      <button key="dl" onClick={() => onDownload(file)} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"><FaDownload size={12}/> Download & Extract</button>
    ]}/>;

    if (mediaType === 'office' && dataUrl) return <OfficeViewer src={dataUrl} file={file} onDownload={onDownload}/>;
    if (mediaType === 'font' && dataUrl) return <FontViewer src={dataUrl} name={file.name}/>;

    if (mediaType === 'ebook') return <UnsupportedCard icon="📕" title="E-Book File" subtitle={`${ext(file.name).toUpperCase()} format`} actions={[
      <button key="op" onClick={() => window.open(dataUrl,'_blank')} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"><FaExternalLinkAlt size={12}/> Open E-Book</button>,
      <button key="dl" onClick={() => onDownload(file)} className="px-5 py-2 border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5 flex items-center justify-center gap-2 transition-colors"><FaDownload size={12}/> Download</button>,
    ]}/>;

    if (mediaType === 'binary') return <UnsupportedCard icon="⚠️" title="Executable File" subtitle={`${ext(file.name).toUpperCase()} files cannot be previewed for security reasons.`} actions={[
      <button key="dl" onClick={() => onDownload(file)} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"><FaDownload size={12}/> Download File</button>
    ]}/>;

    if (mediaType === 'raw-image' || mediaType === 'design') return <UnsupportedCard icon="🎨" title={mediaType==='raw-image'?'RAW Image':'Design File'} subtitle={`${ext(file.name).toUpperCase()} requires specialized software.`} actions={[
      <button key="dl" onClick={() => onDownload(file)} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"><FaDownload size={12}/> Download File</button>
    ]}/>;

    if (mediaType === 'security') return <UnsupportedCard icon="🔐" title="Security Certificate" subtitle={`${ext(file.name).toUpperCase()} files contain sensitive credentials.`} actions={[
      <button key="dl" onClick={() => onDownload(file)} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"><FaDownload size={12}/> Download Certificate</button>
    ]}/>;

    if (mediaType === 'database') return <UnsupportedCard icon="🗄️" title="Database File" subtitle={`${ext(file.name).toUpperCase()} cannot be previewed in the browser.`} actions={[
      <button key="dl" onClick={() => onDownload(file)} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"><FaDownload size={12}/> Download Database</button>
    ]}/>;

    return <UnsupportedCard icon="❓" title="Unsupported Format" subtitle="This file type cannot be previewed." actions={[
      <button key="dl" onClick={() => onDownload(file)} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"><FaDownload size={12}/> Download File</button>,
      <button key="op" onClick={() => window.open(file.download_url,'_blank')} className="px-5 py-2 border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5 flex items-center justify-center gap-2 transition-colors"><FaExternalLinkAlt size={12}/> Open in Browser</button>,
    ]}/>;
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center sm:p-4 backdrop-blur-sm"
         onClick={onClose}>
      <div ref={containerRef}
           className="bg-[#0d1117] w-full h-full sm:max-w-[95vw] sm:max-h-[95vh] flex flex-col sm:rounded-xl overflow-hidden border border-white/10 shadow-2xl"
           onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="h-12 px-4 flex items-center justify-between bg-[#161b22] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* type icon */}
            <span className="text-white/40 shrink-0 text-sm">{TYPE_ICONS[mediaType] ?? <FaFileAlt/>}</span>
            <span className="text-white text-sm font-medium truncate max-w-[200px] sm:max-w-lg">{file.name}</span>
            <span className="hidden sm:inline text-[10px] px-2 py-0.5 bg-white/10 rounded-full text-white/50 uppercase tracking-wider font-mono shrink-0">
              {mediaType}
            </span>
            {file.size > 0 && (
              <span className="hidden sm:inline text-[10px] text-white/30 font-mono shrink-0">{fmt(file.size)}</span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onDownload(file)} title="Download"
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white">
              <FaDownload size={14}/>
            </button>
            <button onClick={() => window.open(file.download_url,'_blank')} title="Open in browser"
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white">
              <FaExternalLinkAlt size={14}/>
            </button>
            <button onClick={toggleFullscreen} title="Fullscreen"
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white">
              {fullscreen ? <MdFullscreenExit size={16}/> : <MdFullscreen size={16}/>}
            </button>
            <div className="w-px h-5 bg-white/10 mx-1"/>
            <button onClick={onClose} title="Close"
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-white/50 hover:text-red-400">
              <FaTimes size={15}/>
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-hidden relative">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default FilePreview;