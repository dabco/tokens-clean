import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [status, setStatus]     = useState('idle');
  const [markdown, setMarkdown] = useState('');
  const [filename, setFilename] = useState('');
  const [dragging, setDragging] = useState(false);
  const [toast, setToast]       = useState('');
  const [mode, setMode]         = useState('ocr');

  // useRef pour éviter la stale closure dans les callbacks
  const modeRef      = useRef('ocr');
  const fileInputRef = useRef(null);
  const toastTimer   = useRef(null);

  const updateMode = (m) => {
    modeRef.current = m;
    setMode(m);
  };

  // ── Traitement fichier ──────────────────────────
  const processFile = async (file) => {
    if (!file) return;

    const currentMode = modeRef.current;
    setStatus('loading');
    setFilename(file.name || 'capture');
    setMarkdown('');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl  = e.target.result;
      const base64   = dataUrl.split(',')[1];
      const mimeType = file.type || 'image/png';

      try {
        const res  = await fetch('/api/convert', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ base64, mimeType, mode: currentMode }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

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
        <title>DocDrop</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="root">

        {/* Header */}
        <header>
          <div className="logo">D</div>
          <h1>DocDrop</h1>
          <span className="subtitle">image · pdf → markdown → presse-papier</span>

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
          background: #0c0c0c;
          color: #e0d9d0;
          font-family: 'Space Grotesk', sans-serif;
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
          border-bottom: 1px solid #2a2a2a;
          display: flex;
          align-items: center;
          gap: 14px;
          background: #111;
          flex-shrink: 0;
        }
        .logo {
          width: 28px; height: 28px;
          background: #e87c1a;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 14px; font-weight: 500; color: #000;
          flex-shrink: 0;
        }
        header h1 { font-size: 15px; font-weight: 600; letter-spacing: -0.02em; }
        .subtitle {
          font-size: 11px; color: #555;
          font-family: 'IBM Plex Mono', monospace;
        }

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
          color: #666;
        }
        .toggle-track {
          position: relative;
          display: flex;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 8px;
          padding: 3px;
          gap: 0;
        }
        .toggle-opt {
          position: relative;
          z-index: 2;
          background: none;
          border: none;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          padding: 5px 18px;
          border-radius: 6px;
          cursor: pointer;
          color: #555;
          transition: color 0.2s;
          letter-spacing: 0.04em;
        }
        .toggle-opt.active { color: #000; }
        .toggle-opt:not(.active):hover { color: #aaa; }
        .toggle-pill {
          position: absolute;
          top: 3px; bottom: 3px;
          width: calc(50% - 3px);
          border-radius: 5px;
          background: #e87c1a;
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
          border-right: none;
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
          background: #0c0c0c;
          border-right: 3px solid #e87c1a;
          overflow: hidden;
          transition: background 0.2s;
        }
        .dropzone.drag-over { background: rgba(232,124,26,0.06); }

        .grid-bg {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        .drop-ring {
          width: 130px; height: 130px;
          border-radius: 50%;
          border: 2px dashed #333;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.2s, box-shadow 0.2s;
          position: relative; z-index: 1;
        }
        .drop-ring.active {
          border-color: #e87c1a;
          box-shadow: 0 0 0 6px rgba(232,124,26,0.1);
        }
        .drop-icon { font-size: 44px; color: #444; }
        .dropzone.drag-over .drop-icon { color: #e87c1a; }

        .ring-spinner {
          width: 36px; height: 36px;
          border: 3px solid rgba(232,124,26,0.2);
          border-top-color: #e87c1a;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .drop-label { text-align: center; position: relative; z-index: 1; }
        .drop-label p { font-size: 14px; color: #666; line-height: 1.8; }
        .drop-label strong { color: #ccc; font-weight: 600; }
        .filetypes {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px; color: #4a3020; letter-spacing: 0.05em; margin-top: 6px;
        }

        .pick-btn {
          background: none;
          border: 1px solid #2a2a2a;
          color: #555;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          padding: 6px 18px; border-radius: 5px;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
          position: relative; z-index: 1;
        }
        .pick-btn:hover { border-color: #e87c1a; color: #e87c1a; }

        .current-file {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px; color: #e87c1a;
          position: relative; z-index: 1;
        }

        /* ── Preview (droite - bleu ardoise) ── */
        .preview {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #1a2035;
        }
        .preview-header {
          padding: 12px 20px;
          border-bottom: 1px solid #2a3050;
          background: #151c30;
          display: flex; align-items: center; gap: 10px;
          flex-shrink: 0;
        }
        .preview-header h2 {
          font-size: 11px; font-weight: 500;
          font-family: 'IBM Plex Mono', monospace;
          color: #5a7ab0; letter-spacing: 0.08em;
          text-transform: uppercase; flex: 1;
        }

        .spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(90,122,176,0.3);
          border-top-color: #5a7ab0;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .badge {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px; padding: 3px 10px;
          border-radius: 20px; font-weight: 500;
        }
        .badge-idle    { background: rgba(255,255,255,0.04); color: #555; }
        .badge-loading { background: rgba(90,122,176,0.15); color: #5a7ab0; }
        .badge-done    { background: rgba(76,175,125,0.15); color: #4caf7d; }
        .badge-error   { background: rgba(255,80,80,0.15); color: #ff5050; }

        .copy-btn {
          background: #e87c1a; color: #000; border: none;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px; font-weight: 500;
          padding: 5px 14px; border-radius: 4px;
          cursor: pointer; transition: opacity 0.15s;
        }
        .copy-btn:hover { opacity: 0.85; }

        .output {
          flex: 1; overflow-y: auto; padding: 20px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px; line-height: 1.7;
          color: #3a5080; white-space: pre-wrap; word-break: break-word;
        }
        .output.has-content { color: #c8d8f0; }
        .output::-webkit-scrollbar { width: 4px; }
        .output::-webkit-scrollbar-track { background: transparent; }
        .output::-webkit-scrollbar-thumb { background: #2a3050; border-radius: 2px; }

        /* ── Footer ── */
        footer {
          padding: 0 24px;
          border-top: 1px solid #1a1a1a;
          background: #0e0e0e;
          display: flex; align-items: center; gap: 12px;
        }
        .filename {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px; color: #444; flex: 1;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .footer-mode {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px; color: #555;
        }
        .footer-mode strong { color: #e87c1a; }

        /* ── Toast ── */
        .toast {
          position: fixed; bottom: 24px; left: 50%;
          transform: translateX(-50%);
          background: #4caf7d; color: #000;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px; font-weight: 500;
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
