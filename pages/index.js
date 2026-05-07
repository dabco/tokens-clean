import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  const [status, setStatus]     = useState('idle');
  const [markdown, setMarkdown] = useState('');
  const [filename, setFilename] = useState('');
  const [dragging, setDragging] = useState(false);
  const [toast, setToast]       = useState('');
  const [mode, setMode]         = useState('ocr');
  const [savings, setSavings]   = useState(null); // { imgTokens, outTokens, saved, pct }

  // useRef pour éviter la stale closure dans les callbacks
  const modeRef      = useRef('ocr');
  const fileInputRef = useRef(null);
  const toastTimer   = useRef(null);

  const updateMode = (m) => {
    modeRef.current = m;
    setMode(m);
  };

  // ── Compression image (max 1568px, JPEG 85%) ───
  const compressImage = (dataUrl, mimeType) => {
    return new Promise((resolve) => {
      // Seules les images sont compressées — PDF/DOCX/PPTX passent tels quels
      if (!mimeType.startsWith('image/')) { resolve(dataUrl); return; }
      const img = new Image();
      img.onload = () => {
        const MAX = 1568;
        let { naturalWidth: w, naturalHeight: h } = img;
        if (w > MAX || h > MAX) {
          const r = Math.min(MAX / w, MAX / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = dataUrl;
    });
  };

  // ── Estimation tokens image (formule Claude) ───
  const estimateImageTokens = (file, dataUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Claude : ~(w × h) / 750, plafonné à ~1568px sur le grand côté
        const maxSide = 1568;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxSide || h > maxSide) {
          const ratio = Math.min(maxSide / w, maxSide / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        resolve(Math.round((w * h) / 750));
      };
      img.onerror = () => resolve(1500); // fallback
      img.src = dataUrl;
    });
  };

  // ── Traitement fichier ──────────────────────────
  const processFile = async (file) => {
    if (!file) return;

    const currentMode = modeRef.current;
    setStatus('loading');
    setFilename(file.name || 'capture');
    setMarkdown('');
    setSavings(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawDataUrl = e.target.result;
      const mimeType   = file.type || 'image/png';

      // Compression avant envoi (max 1568px, JPEG 85%)
      const dataUrl = await compressImage(rawDataUrl, mimeType);
      const base64  = dataUrl.split(',')[1];

      // Estimation tokens avant envoi
      let imgTokens;
      if (mimeType.startsWith('image/')) {
        imgTokens = await estimateImageTokens(file, rawDataUrl);
      } else {
        // PDF/DOCX/PPTX : taille brute du fichier ÷ 4 octets/token
        imgTokens = Math.round(file.size / 4);
      }

      try {
        const res  = await fetch('/api/convert', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ base64, mimeType, mode: currentMode }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.message || data.error);

        // Calcul économies
        const outTokens  = Math.round(data.markdown.length / 4);
        const saved      = Math.max(0, imgTokens - outTokens);
        const pct        = imgTokens > 0 ? Math.round((saved / imgTokens) * 100) : 0;
        const inputLabel = mimeType.startsWith('image/') ? 'Image' : 'Fichier';
        setSavings({ imgTokens, outTokens, saved, pct, inputLabel });

        setMarkdown(data.markdown);
        setStatus('done');

        try {
          await navigator.clipboard.writeText(data.markdown);
          showToast('Copié automatiquement !');
        } catch {
          showToast('Converti — copie manuelle disponible');
        }
      } catch (err) {
        setStatus('error');
        setMarkdown('Erreur : ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  };

  // ── Coller depuis presse-papier (Cmd+V) ────────
  useEffect(() => {
    const onPaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) await processFile(file);
          return;
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  // ── Drag & Drop ────────────────────────────────
  const onDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); };
  const onDragOver  = (e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); };
  const onDrop      = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const badgeLabel = { idle: 'En attente', loading: 'Conversion…', done: 'Converti', error: 'Erreur' }[status];

  return (
    <>
      <Head>
        <title>TokensClean</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Montserrat:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="root">

        {/* Header */}
        <header>
          <div className="logo">TC</div>
          <h1>TokensClean</h1>
          <span className="subtitle">image · pdf → markdown → presse-papier</span>

          <Link href="/docs" className="docs-link">Aide</Link>

          {/* Toggle OCR / Vision */}
          <div className="toggle-wrap">
            <div className={`toggle-track mode-${mode}`}>
              <button
                className={`toggle-opt${mode === 'ocr' ? ' active' : ''}`}
                onClick={() => updateMode('ocr')}
              >
                OCR
              </button>
              <button
                className={`toggle-opt${mode === 'vision' ? ' active' : ''}`}
                onClick={() => updateMode('vision')}
              >
                Vision
              </button>
              <div className={`toggle-pill mode-${mode}`} />
            </div>
            <span className="toggle-hint">
              {mode === 'ocr' ? 'Extraction texte' : 'Analyse interface + positions'}
            </span>
          </div>
        </header>

        <main>

          {/* ── Zone de dépôt (gauche, noire) ── */}
          <div
            className={`dropzone${dragging ? ' drag-over' : ''}`}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div className="grid-bg" />

            <div className={`drop-ring${dragging ? ' active' : ''}`}>
              {status === 'loading'
                ? <div className="ring-spinner" />
                : <span className="drop-icon">{dragging ? '↓' : '⬇'}</span>
              }
            </div>

            <div className="drop-label">
              <p><strong>Glisser une image ou un PDF</strong></p>
              <p>ou faire <strong>Cmd+V</strong> après un screenshot</p>
              <p className="filetypes">PNG · JPG · PDF · DOCX · PPTX</p>
            </div>

            <button className="pick-btn" onClick={() => fileInputRef.current?.click()}>
              choisir un fichier
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.docx,.pptx"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
            />

            {filename && (
              <p className="current-file">📄 {filename}</p>
            )}
          </div>

          {/* ── Panneau Markdown (droite, bleu-ardoise) ── */}
          <div className="preview">
            <div className="preview-header">
              <h2>Markdown</h2>
              {status === 'loading' && <div className="spinner" />}
              <span className={`badge badge-${status}`}>{badgeLabel}</span>
              {markdown && (
                <button
                  className="copy-btn"
                  onClick={async () => {
                    await navigator.clipboard.writeText(markdown);
                    showToast('Copié !');
                  }}
                >
                  Copier
                </button>
              )}
            </div>
            {savings && (
              <div className="savings-bar">
                <div className="savings-pct">{savings.pct}%</div>
                <div className="savings-details">
                  <span className="savings-label">tokens économisés</span>
                  <div className="savings-numbers">
                    <span>{savings.inputLabel} : ~{savings.imgTokens.toLocaleString()} tk</span>
                    <span className="savings-arrow">→</span>
                    <span>Texte : ~{savings.outTokens.toLocaleString()} tk</span>
                    <span className="savings-saved">−{savings.saved.toLocaleString()} tk</span>
                  </div>
                </div>
                <div className="savings-bar-track">
                  <div
                    className="savings-bar-fill"
                    style={{ width: `${Math.min(savings.pct, 100)}%` }}
                  />
                </div>
              </div>
            )}

            <pre className={`output${markdown ? ' has-content' : ''}`}>
              {markdown || 'Déposez un fichier pour démarrer…'}
            </pre>
          </div>

        </main>

        {/* Footer */}
        <footer>
          <span className="filename">{filename || 'Aucun fichier'}</span>
          <span className="footer-mode">Mode : <strong>{mode.toUpperCase()}</strong></span>
        </footer>

        {/* Toast */}
        {toast && <div className="toast show">{toast}</div>}

      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }
        body {
          background: #000;
          color: #fff;
          font-family: 'Montserrat', sans-serif;
        }
      `}</style>

      <style jsx>{`
        .root {
          height: 100vh;
          display: grid;
          grid-template-rows: 56px 1fr 40px;
          overflow: hidden;
        }

        /* ── Header ── */
        header {
          padding: 0 24px;
          border-bottom: 1px solid #111;
          display: flex;
          align-items: center;
          gap: 14px;
          background: #000;
          flex-shrink: 0;
        }
        .logo {
          height: 28px;
          padding: 0 8px;
          background: #D2F909;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Montserrat', sans-serif;
          font-size: 11px; font-weight: 900; color: #000;
          letter-spacing: 0.04em;
          flex-shrink: 0;
        }
        header h1 { font-size: 15px; font-weight: 700; letter-spacing: -0.02em; color: #fff; }
        .subtitle {
          font-size: 11px; color: #444;
          font-family: 'IBM Plex Mono', monospace;
        }
        .docs-link, .docs-link:visited, .docs-link:link {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px; color: #555;
          text-decoration: none; margin-left: auto;
          transition: color 0.2s;
        }
        .docs-link:hover { color: #D2F909; }

        /* ── Toggle ── */
        .toggle-wrap {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .toggle-hint {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: #555;
        }
        .toggle-track {
          position: relative;
          display: flex;
          background: #0a0a0a;
          border: 1px solid #222;
          border-radius: 8px;
          padding: 3px;
          gap: 0;
        }
        .toggle-opt {
          position: relative;
          z-index: 2;
          background: none;
          border: none;
          font-family: 'Montserrat', sans-serif;
          font-size: 11px;
          font-weight: 700;
          padding: 5px 18px;
          border-radius: 6px;
          cursor: pointer;
          color: #444;
          transition: color 0.2s;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .toggle-opt.active { color: #000; }
        .toggle-opt:not(.active):hover { color: #aaa; }
        .toggle-pill {
          position: absolute;
          top: 3px; bottom: 3px;
          width: calc(50% - 3px);
          border-radius: 5px;
          background: #D2F909;
          transition: transform 0.2s cubic-bezier(0.4,0,0.2,1);
          z-index: 1;
        }
        .toggle-pill.mode-ocr    { transform: translateX(0); }
        .toggle-pill.mode-vision { transform: translateX(100%); }

        /* ── Main ── */
        main {
          display: grid;
          grid-template-columns: 1fr 1fr;
          overflow: hidden;
        }

        /* ── Drop zone (gauche - noire) ── */
        .dropzone {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 18px;
          padding: 40px;
          background: #000;
          border-right: 3px solid #D2F909;
          overflow: hidden;
          transition: background 0.2s;
        }
        .dropzone.drag-over { background: rgba(210,249,9,0.04); }

        .grid-bg {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        .drop-ring {
          width: 130px; height: 130px;
          border-radius: 50%;
          border: 2px dashed #222;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.2s, box-shadow 0.2s;
          position: relative; z-index: 1;
        }
        .drop-ring.active {
          border-color: #D2F909;
          box-shadow: 0 0 0 6px rgba(210,249,9,0.08);
        }
        .drop-icon { font-size: 44px; color: #333; }
        .dropzone.drag-over .drop-icon { color: #D2F909; }

        .ring-spinner {
          width: 36px; height: 36px;
          border: 3px solid rgba(210,249,9,0.2);
          border-top-color: #D2F909;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .drop-label { text-align: center; position: relative; z-index: 1; }
        .drop-label p { font-size: 14px; color: #555; line-height: 1.8; }
        .drop-label strong { color: #ccc; font-weight: 700; }
        .filetypes {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px; color: #2a3a20; letter-spacing: 0.05em; margin-top: 6px;
        }

        .pick-btn {
          background: none;
          border: 1px solid #1a1a1a;
          color: #444;
          font-family: 'Montserrat', sans-serif;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 6px 18px; border-radius: 5px;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
          position: relative; z-index: 1;
        }
        .pick-btn:hover { border-color: #D2F909; color: #D2F909; }

        .current-file {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px; color: #D2F909;
          position: relative; z-index: 1;
        }

        /* ── Preview (droite - teal) ── */
        .preview {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #00312d;
        }
        .preview-header {
          padding: 12px 20px;
          border-bottom: 1px solid #004a43;
          background: #002824;
          display: flex; align-items: center; gap: 10px;
          flex-shrink: 0;
        }
        .preview-header h2 {
          font-size: 10px; font-weight: 700;
          font-family: 'Montserrat', sans-serif;
          color: #00a090; letter-spacing: 0.1em;
          text-transform: uppercase; flex: 1;
        }

        .spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(0,160,144,0.3);
          border-top-color: #00a090;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .badge {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px; padding: 3px 10px;
          border-radius: 20px; font-weight: 500;
        }
        .badge-idle    { background: rgba(255,255,255,0.04); color: #445; }
        .badge-loading { background: rgba(0,100,92,0.3); color: #00c8b8; }
        .badge-done    { background: rgba(210,249,9,0.12); color: #D2F909; }
        .badge-error   { background: rgba(255,80,80,0.15); color: #ff5050; }

        .copy-btn {
          background: #D2F909; color: #000; border: none;
          font-family: 'Montserrat', sans-serif;
          font-size: 10px; font-weight: 900;
          text-transform: uppercase; letter-spacing: 0.06em;
          padding: 5px 14px; border-radius: 4px;
          cursor: pointer; transition: opacity 0.15s;
        }
        .copy-btn:hover { opacity: 0.85; }

        /* ── Savings bar ── */
        .savings-bar {
          padding: 12px 20px;
          border-bottom: 1px solid #004a43;
          background: #001f1c;
          display: grid;
          grid-template-columns: 56px 1fr;
          grid-template-rows: auto auto;
          gap: 6px 14px;
          align-items: center;
        }
        .savings-pct {
          grid-row: 1 / 3;
          font-family: 'Montserrat', sans-serif;
          font-size: 28px;
          font-weight: 900;
          color: #D2F909;
          line-height: 1;
          text-align: center;
        }
        .savings-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #2a7060;
        }
        .savings-numbers {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: #3a9080;
        }
        .savings-arrow { color: #2a6050; }
        .savings-saved {
          color: #D2F909;
          font-weight: 500;
          margin-left: 4px;
        }
        .savings-bar-track {
          grid-column: 2;
          height: 3px;
          background: #001510;
          border-radius: 2px;
          overflow: hidden;
        }
        .savings-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #00645C, #D2F909);
          border-radius: 2px;
          transition: width 0.6s ease;
        }

        .output {
          flex: 1; overflow-y: auto; padding: 20px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px; line-height: 1.7;
          color: #1a6050; white-space: pre-wrap; word-break: break-word;
        }
        .output.has-content { color: #b0e8e0; }
        .output::-webkit-scrollbar { width: 4px; }
        .output::-webkit-scrollbar-track { background: transparent; }
        .output::-webkit-scrollbar-thumb { background: #004a43; border-radius: 2px; }

        /* ── Footer ── */
        footer {
          padding: 0 24px;
          border-top: 1px solid #111;
          background: #000;
          display: flex; align-items: center; gap: 12px;
        }
        .filename {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px; color: #333; flex: 1;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .footer-mode {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px; color: #444;
        }
        .footer-mode strong { color: #D2F909; }

        /* ── Toast ── */
        .toast {
          position: fixed; bottom: 24px; left: 50%;
          transform: translateX(-50%);
          background: #D2F909; color: #000;
          font-family: 'Montserrat', sans-serif;
          font-size: 12px; font-weight: 900;
          text-transform: uppercase; letter-spacing: 0.06em;
          padding: 10px 24px; border-radius: 6px;
          white-space: nowrap;
          animation: fadeInUp 0.2s ease;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </>
  );
}
