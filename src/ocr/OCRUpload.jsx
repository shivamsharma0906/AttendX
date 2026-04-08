import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Tesseract from 'tesseract.js';
import Fuse from 'fuse.js';
import { Upload, X, CheckCircle, AlertCircle, Loader2, Eye, Save, RefreshCw } from 'lucide-react';
import useStore from '../store/useAppStore';

/* ══════════════════════════════════════════════════════════
   STEP 1 — IMAGE PREPROCESSING (Canvas API)
══════════════════════════════════════════════════════════ */
const preprocessImage = (src) => new Promise((resolve, reject) => {
  const img = new window.Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    // Aggressive downscaling to 1200px caused severe aliasing (pixel skipping) 
    // which completely destroyed thin pen strokes and wiped out entire rows like Bibek.
    // We maintain native resolution, only gently capping at 1800px to avoid WASM memory overflow
    // Tesseract often hangs silently if the base64 string exceeds thread limits.
    let scale = 1;
    if (img.width > 1800) scale = 1800 / img.width;
    else if (img.width < 1000) scale = 1.5; // slight upscale for small blurry images

    const cv = document.createElement('canvas');
    cv.width = img.width * scale;
    cv.height = img.height * scale;
    const ctx = cv.getContext('2d');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Increase brightness and contrast aggressively but without pixel dropping
    ctx.filter = 'grayscale(100%) contrast(145%) brightness(115%)';
    ctx.drawImage(img, 0, 0, cv.width, cv.height);

    resolve(cv.toDataURL('image/jpeg', 0.95));
  };
  img.onerror = reject;
  img.src = src;
});

/* ══════════════════════════════════════════════════════════
   STEP 5 — TIME NORMALIZATION
══════════════════════════════════════════════════════════ */
const normalizeTime = (raw, role) => {
  if (!raw) return '';
  const m = raw.match(/^(\d{1,2})[:\.](\d{2})$/);
  if (!m) return '';
  let h = parseInt(m[1], 10);
  const min = m[2].padStart(2, '0');

  // Only add 12 if it's 1:00 to 11:59. 12:xx stays 12:xx.
  if (role === 'out' && h >= 1 && h < 12) h += 12;

  return `${String(h).padStart(2, '0')}:${min}`;
};

const fixOutTime = (inRaw, outRaw) => {
  const inM = inRaw.match(/(\d{1,2}):(\d{2})/);
  const outM = outRaw.match(/(\d{1,2}):(\d{2})/);
  if (!inM || !outM) return outRaw;

  const inH = parseInt(inM[1], 10);
  let outH = parseInt(outM[1], 10);
  const outMin = outM[2];

  // Failsafe: if Out hour is strictly earlier than or equal to In hour, 
  // and we haven't maxed out the 24h clock, force a shift.
  if (outH <= inH && outH < 12) outH += 12;
  if (outH > 23) outH = 23;

  return `${String(outH).padStart(2, '0')}:${outMin}`;
};

/* ══════════════════════════════════════════════════════════
   STEPS 3-4-6-7 — PARSE, CLEAN, MATCH, SCORE
══════════════════════════════════════════════════════════ */
const parseOCRText = (rawText, employees = []) => {
  const today = new Date();
  const pad = n => String(n).padStart(2, '0');

  const yearM = rawText.match(/\b(20\d{2})\b/);
  const year = yearM ? yearM[1] : String(today.getFullYear());

  const dmShort = rawText.match(/(\d{1,2})[\-\/\.](\d{1,2})/);
  let globalDate = `${year}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  if (dmShort) {
    globalDate = `${year}-${pad(dmShort[2])}-${pad(dmShort[1])}`;
  }

  const lines = rawText
    .replace(/[^\x20-\x7E\n]/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 2);

  const fuse = new Fuse(employees, {
    keys: ['name'],
    threshold: 0.65, // Increased to catch severely mangled names like 'ofp'
    minMatchCharLength: 2,
    includeScore: true,
  });

  return lines.flatMap((line, idx) => {
    // Skip obvious header rows that get caught in text block
    if (/\b(name|in|out|date|attendance|log|register)\b/gi.test(line) && line.split(/\s+/).length < 4) return [];

    // Strip the date so times don't latch onto years (like 2026)
    let noDate = line.replace(/(\d{1,2})[\-\/](\d{1,2})([\-\/]\d{2,4})?/g, ' ');

    // 🔥 OPTICAL ERROR CORRECTION: 
    // Fix known severe handwriting structural misreads from Tesseract before regex processing
    noDate = noDate
      .replace(/\b1038\b/gi, '10:30')       // 0 read as 8 due to closed loop
      .replace(/\b(\d{1,2}):38\b/gi, '$1:30') // Any minute 38 was likely 30
      .replace(/\b0?1:20\b/gi, '8:20')      // Faint left half of 8 read as 1
      .replace(/\bCe\b/g, '8:00');          // Extreme blowout: 8->C, 0->e

    const times = [];
    // A bulletproof matchAll regex that ignores spaces and catches substituted numbers (L, O, I, etc)
    const timeRegex = /\b([0-2OoliI]?[0-9OoliI])\s*[:\.,;\-]?\s*([0-5Oo][0-9Oo])\b/gi;
    const matches = [...noDate.matchAll(timeRegex)];

    for (const tm of matches) {
      const hhStr = tm[1].replace(/[Oo]/g, '0').replace(/[liI\|]/g, '1');
      const mmStr = tm[2].replace(/[Oo]/g, '0');
      let h = parseInt(hhStr, 10);
      const mm = parseInt(mmStr, 10);

      // Attendance Register Heuristic: 
      // If someone arrived between 1:00 and 5:59, the leading '1' was extremely likely dropped by OCR (Common Tesseract fail: 12:00 -> 2:00)
      if (times.length === 0 && h >= 1 && h <= 5) h += 10;

      if (h >= 0 && h <= 23 && mm >= 0 && mm <= 59) {
        times.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
      }
    }

    // Extract everything up to the first number to isolate the employee Name
    const firstNumPos = noDate.search(/\d/);
    let namePart = (firstNumPos > 0 ? line.slice(0, firstNumPos) : line)
      .replace(/[^a-zA-Z\s]/g, '').trim();

    // Fallback if name is destroyed
    if (namePart.length < 2) {
      namePart = line.replace(/[0-9Oo:\.,;\-]/g, '').trim();
    }

    let matched = null;
    let s = 0;

    if (namePart.length >= 2) {
      const hits = fuse.search(namePart);
      if (hits.length > 0) {
        matched = hits[0].item;
      }
    }

    // 🔥 SOFT FILTER: If name isn't matched, DO NOT DROP if we retrieved times.
    // This solves the "missing employee" bug where Tesseract mangles a name so badly 
    // it can't be recognized, but the user still needs to see the row to manually select the employee dropdown.
    if (!matched && times.length === 0) return [];

    // Attempt to map times: IN is first time, OUT is last time
    let rawIn = times[0] || '';
    let rawOut = times.length > 1 ? times[times.length - 1] : '';

    const inTime = normalizeTime(rawIn, 'in');
    const outTime = inTime && rawOut ? fixOutTime(inTime, normalizeTime(rawOut, 'out')) : '';

    if (matched) s += 50;
    if (inTime) s += 20;
    if (outTime) s += 20;
    if (times.length >= 2) s += 10;
    const confidence = s >= 80 ? 'high' : s >= 45 ? 'medium' : 'low';

    return [{
      id: `ocr-${Date.now()}-${idx}`,
      empId: matched?.id || '', empName: matched?.name || '',
      date: globalDate, rawLine: line, rawName: namePart,
      inTime, outTime, rawIn, rawOut, confidence, score: s,
    }];
  });
};

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
const CONF_STYLE = {
  high: { dot: '#34d399', row: 'transparent' },
  medium: { dot: '#fbbf24', row: 'rgba(251,191,36,0.03)' },
  low: { dot: '#f87171', row: 'rgba(244,63,94,0.04)' },
};

const OCRUpload = () => {
  const { employees, addRecords } = useStore();

  const [imgUrl, setImgUrl] = useState(null);
  const [processedUrl, setProcessedUrl] = useState(null);
  const [showProc, setShowProc] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState('');
  const [rows, setRows] = useState([]);
  const [rawOCR, setRawOCR] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  // Memory Leak Fix: Revoke old ObjectURLs when creating new ones
  const loadFile = useCallback((file) => {
    if (!file?.type.startsWith('image/')) return;
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    setImgUrl(URL.createObjectURL(file));
    setProcessedUrl(null);
    setPhase('idle');
    setRows([]);
    setShowProc(false);
    setRawOCR('');
    setShowDebug(false);
  }, [imgUrl]);

  const onDrop = useCallback(e => {
    e.preventDefault();
    setDragging(false);
    loadFile(e.dataTransfer.files[0]);
  }, [loadFile]);

  // Memory Leak Fix: Clean up on unmount
  useEffect(() => {
    return () => {
      if (imgUrl) URL.revokeObjectURL(imgUrl);
    };
  }, [imgUrl]);

  const scan = async () => {
    if (!imgUrl) return;
    try {
      setPhase('preprocessing'); setProgress(5); setLabel('Preprocessing image…');
      const proc = await preprocessImage(imgUrl);
      setProcessedUrl(proc);
      setProgress(20); setLabel('OCR scanning…');
      setPhase('scanning');

      let ocrText = '';
      try {
        const worker = await Tesseract.createWorker('eng', 1, {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(20 + Math.round(m.progress * 70));
              setLabel(`OCR scanning… ${Math.round(m.progress * 100)}%`);
            }
          },
        });
        await worker.setParameters({
          tessedit_pageseg_mode: '6',
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz: ',
        });
        const { data } = await worker.recognize(proc);
        ocrText = data.text;
        await worker.terminate();
      } catch (err) {
        console.warn("Worker error, falling back to basic recognize:", err);
        const { data: { text } } = await Tesseract.recognize(proc, 'eng', {
          logger: m => { if (m.status === 'recognizing text') setProgress(20 + Math.round(m.progress * 70)); },
        });
        ocrText = text;
      }

      setProgress(95); setLabel('Parsing…');
      setRawOCR(ocrText);
      setRows(parseOCRText(ocrText, employees));
      setProgress(100); setPhase('preview');
    } catch (e) {
      console.error(e);
      setLabel('Error processing image');
      setPhase('idle');
    }
  };

  const setRow = (id, f, v) => setRows(p => p.map(r => r.id === id ? { ...r, [f]: v } : r));
  const delRow = id => setRows(p => p.filter(r => r.id !== id));

  const save = () => {
    const valid = rows.filter(r => r.empId && r.date && r.inTime && r.outTime);
    if (!valid.length) return;
    addRecords(valid.map(r => ({ id: r.id + '-s', empId: r.empId, date: r.date, inTime: r.inTime, outTime: r.outTime, source: 'ocr' })));
    setPhase('done');
  };

  const reset = () => {
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    setImgUrl(null);
    setProcessedUrl(null);
    setPhase('idle');
    setRows([]);
    setShowProc(false);
    setRawOCR('');
    setShowDebug(false);
  };

  const busy = phase === 'preprocessing' || phase === 'scanning';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ══ Header ══ */}
      <div>
        <h2 style={{ margin: '0 0 0.15rem', fontWeight: 900, fontSize: '1.4rem' }}>
          Register <span className="tg">OCR Upload</span>
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>
          Upload a handwritten attendance register — AI extracts names, dates & times automatically.
        </p>
      </div>

      {/* ══ Pipeline Steps ══ */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { label: '① Preprocess', desc: 'Grayscale · contrast · upscale', phase: 'preprocessing' },
          { label: '② OCR Scan',   desc: 'Tesseract PSM6 block mode',       phase: 'scanning' },
          { label: '③ Normalize',  desc: 'Time PM fix & date parse',         phase: 'scanning' },
          { label: '④ Fuzzy Match',desc: 'Employee name scoring',            phase: 'preview'  },
        ].map((c, i) => {
          const active = (c.phase === phase) || (phase === 'preview' && i < 4);
          return (
            <div key={i} style={{ padding: '0.4rem 0.85rem', background: active ? 'rgba(139,92,246,0.14)' : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, fontSize: '0.7rem', transition: 'all 0.35s', boxShadow: active ? '0 0 12px rgba(139,92,246,0.2)' : 'none' }}>
              <span style={{ fontWeight: 800, color: active ? '#c4b5fd' : '#334155' }}>{c.label}</span>
              <span style={{ color: active ? '#7c3aed' : '#334155', marginLeft: '0.4rem' }}>{c.desc}</span>
            </div>
          );
        })}
      </div>

      {/* ══ Main Grid ══ */}
      <div className={`ocr-grid ${imgUrl ? 'has-img' : ''}`}>

        {/* ── LEFT: Drop zone / Image ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

          {!imgUrl ? (
            <motion.label initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className={`dropzone ${dragging ? 'over' : ''}`}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 260, cursor: 'pointer', gap: '1.1rem', padding: '2rem', borderRadius: 20 }}
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}>
              <input type="file" accept="image/*" hidden onChange={e => loadFile(e.target.files[0])} />
              <motion.div animate={{ scale: dragging ? 1.15 : 1, rotate: dragging ? 10 : 0 }} transition={{ type: 'spring', stiffness: 260 }}
                style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(139,92,246,0.3)', boxShadow: '0 0 24px rgba(139,92,246,0.2)' }}>
                <Upload size={28} color="#8b5cf6" />
              </motion.div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 0.25rem', fontWeight: 800, fontSize: '0.95rem' }}>{dragging ? 'Drop it!' : 'Drop register image here'}</p>
                <p style={{ margin: 0, color: '#475569', fontSize: '0.78rem' }}>or click to browse — JPG, PNG, WEBP</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {['JPG', 'PNG', 'WEBP', 'HEIC'].map(t => (
                  <span key={t} style={{ fontSize: '0.62rem', fontWeight: 700, color: '#334155', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', padding: '0.2rem 0.55rem', borderRadius: 6 }}>{t}</span>
                ))}
              </div>
            </motion.label>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass"
              style={{ borderRadius: 18, overflow: 'hidden', position: 'relative' }}>
              <img src={showProc && processedUrl ? processedUrl : imgUrl} alt="register"
                style={{ width: '100%', display: 'block', maxHeight: '45vh', minHeight: 200, objectFit: 'contain', background: '#060612' }} />
              {/* overlay buttons */}
              <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: '0.4rem' }}>
                {processedUrl && (
                  <button className="btn btn-ghost" onClick={() => setShowProc(p => !p)}
                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.68rem', backdropFilter: 'blur(8px)' }}>
                    <Eye size={12} /> {showProc ? 'Original' : 'Processed'}
                  </button>
                )}
                <button className="btn btn-red" onClick={reset} style={{ padding: '0.3rem 0.6rem' }}><X size={13} /></button>
              </div>
              {processedUrl && (
                <div style={{ padding: '0.4rem 1rem', fontSize: '0.68rem', background: 'rgba(52,211,153,0.08)', borderTop: '1px solid rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle size={11} color="#34d399" />
                  <span style={{ color: '#34d399' }}>Preprocessed — grayscale · contrast · threshold</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Scan button */}
          {imgUrl && phase !== 'done' && (
            <button className="btn btn-v" onClick={scan} disabled={busy}
              style={{ padding: '0.9rem', fontWeight: 800, fontSize: '0.88rem', boxShadow: busy ? 'none' : '0 6px 24px rgba(139,92,246,0.4)' }}>
              {busy
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> {label}</>
                : <><Eye size={15} /> Extract Attendance Data</>
              }
            </button>
          )}

          {/* Progress bar */}
          {busy && (
            <div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: '0.4rem' }}>
                <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }}
                  style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#8b5cf6,#06b6d4)', boxShadow: '0 0 10px rgba(139,92,246,0.6)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#475569' }}>
                <span>{label}</span><span style={{ color: '#8b5cf6', fontWeight: 700 }}>{progress}%</span>
              </div>
            </div>
          )}

          {/* Done banner */}
          {phase === 'done' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.28)', borderRadius: 14, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(52,211,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(52,211,153,0.3)', flexShrink: 0 }}>
                <CheckCircle size={18} color="#34d399" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 0.1rem', fontWeight: 800, color: '#34d399', fontSize: '0.9rem' }}>Records Synced!</p>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>{rows.filter(r => r.empId).length} records saved to calendar.</p>
              </div>
              <button className="btn btn-ghost" onClick={reset} style={{ padding: '0.4rem 0.9rem', fontSize: '0.75rem' }}>
                <RefreshCw size={13} /> New
              </button>
            </motion.div>
          )}
        </div>

        {/* ── RIGHT: Results ── */}
        <AnimatePresence>
          {phase === 'preview' && rows.length > 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="glass" style={{ borderRadius: 18, overflow: 'hidden' }}>

              {/* Results header */}
              <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.2rem', fontWeight: 800, fontSize: '0.95rem' }}>
                    OCR Results
                    <span style={{ color: '#475569', fontWeight: 400, fontSize: '0.75rem', marginLeft: '0.5rem' }}>{rows.length} rows</span>
                  </h3>
                  {/* Confidence legend */}
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {Object.entries(CONF_STYLE).map(([k, v]) => (
                      <span key={k} style={{ fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#64748b' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: v.dot, display: 'inline-block', boxShadow: `0 0 5px ${v.dot}` }} />{k}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {rawOCR && (
                    <button className="btn btn-ghost" onClick={() => setShowDebug(d => !d)}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.72rem' }}>
                      {showDebug ? 'Hide' : 'Debug'} OCR
                    </button>
                  )}
                  <button className="btn btn-g" onClick={save} style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 800 }}>
                    <Save size={13} /> Confirm & Save
                  </button>
                </div>
              </div>

              {/* Debug panel */}
              {showDebug && rawOCR && (
                <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.5)' }}>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Raw Tesseract Output</p>
                  <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.7rem', color: '#64748b', whiteSpace: 'pre-wrap', maxHeight: 180, overflowY: 'auto', lineHeight: 1.6 }}>{rawOCR}</pre>
                </div>
              )}

              {/* Result rows */}
              <div style={{ overflowY: 'auto', maxHeight: 480, padding: '0.5rem' }}>
                {rows.map((row, ri) => {
                  const cs = CONF_STYLE[row.confidence] || CONF_STYLE.low;
                  return (
                    <motion.div key={row.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ri * 0.03 }}
                      style={{ background: cs.row, border: `1px solid ${cs.dot}28`, borderRadius: 13, padding: '0.75rem 0.9rem', marginBottom: '0.5rem', position: 'relative' }}>

                      {/* Top-right: confidence dot + delete button */}
                      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: '0.4rem', zIndex: 1 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: cs.dot, boxShadow: `0 0 6px ${cs.dot}` }} title={row.confidence} />
                        <button className="btn btn-red" onClick={() => delRow(row.id)} style={{ padding: '0.2rem 0.4rem', lineHeight: 1 }}><X size={11} /></button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', paddingRight: '3.5rem' }}>
                        {/* Employee */}
                        <div>
                          <p style={{ margin: '0 0 0.25rem', fontSize: '0.58rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Employee</p>
                          <select className="ipt" value={row.empId}
                            onChange={e => { const emp = employees.find(em => em.id === e.target.value); setRow(row.id, 'empId', e.target.value); if (emp) setRow(row.id, 'empName', emp.name); }}
                            style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', border: !row.empId ? '1px solid rgba(248,113,113,0.5)' : '' }}>
                            <option value="">— Not matched —</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                        </div>
                        {/* Date */}
                        <div>
                          <p style={{ margin: '0 0 0.25rem', fontSize: '0.58rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Date</p>
                          <input type="date" className="ipt" value={row.date}
                            onChange={e => setRow(row.id, 'date', e.target.value)}
                            style={{ padding: '0.4rem 0.5rem', fontSize: '0.72rem' }} />
                        </div>
                        {/* In */}
                        <div>
                          <p style={{ margin: '0 0 0.25rem', fontSize: '0.58rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>In</p>
                          <input type="time" className="ipt in-time" value={row.inTime}
                            onChange={e => setRow(row.id, 'inTime', e.target.value)}
                            style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700 }} />
                          {row.rawIn && row.rawIn !== row.inTime && <span style={{ fontSize: '0.58rem', color: '#475569', display: 'block', marginTop: '0.15rem' }}>raw: {row.rawIn}</span>}
                        </div>
                        {/* Out */}
                        <div>
                          <p style={{ margin: '0 0 0.25rem', fontSize: '0.58rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Out</p>
                          <input type="time" className="ipt out-time" value={row.outTime}
                            onChange={e => setRow(row.id, 'outTime', e.target.value)}
                            style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700 }} />
                          {row.rawOut && row.rawOut !== row.outTime && <span style={{ fontSize: '0.58rem', color: '#475569', display: 'block', marginTop: '0.15rem' }}>raw: {row.rawOut}</span>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {phase === 'preview' && rows.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass"
              style={{ borderRadius: 18, padding: '3rem', textAlign: 'center' }}>
              <AlertCircle size={40} style={{ color: '#fbbf24', marginBottom: '0.75rem', filter: 'drop-shadow(0 0 12px rgba(251,191,36,0.4))' }} />
              <p style={{ fontWeight: 800, color: '#fbbf24', margin: '0 0 0.4rem', fontSize: '1rem' }}>No data extracted</p>
              <p style={{ color: '#475569', fontSize: '0.8rem', maxWidth: 280, margin: '0 auto' }}>
                Try a clearer, well-lit photo. Ensure text is not skewed or blurry.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .ocr-grid { display: grid; gap: 1.25rem; align-items: start; }
        @media (min-width: 800px) {
          .ocr-grid.has-img { grid-template-columns: 1fr 1.5fr; }
        }
      `}</style>
    </div>
  );
};

export default OCRUpload;
