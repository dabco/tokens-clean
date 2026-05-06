import { useState, useCallback, useRef, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [status, setStatus]       = useState('idle');
  const [markdown, setMarkdown]   = useState('');
  const [filename, setFilename]   = useState('');
  const [dragging, setDragging]   = useState(false);
  const [toast, setToast]         = useState(false);
  const fileInputRef              = useRef(null);
  const toastTimer                = useRef(null);

  // Coller depuis le presse-papier (Cmd+V)
  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          processFile(item.getAsFile());
          break;
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  const showToast = () => {
    setToast(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(false), 2800);
  };

  const processFile = useCallback(async (file) => {
    if (!file) return;
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
          body:    JSON.stringify({ base64, mimeType }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setMarkdown(data.markdown);
        setStatus('done');

        try {
          await navigator.clipboard.writeText(data.markdown);
          showToast();
        } catch {
          // clipboard non disponible (http) — afficher quand même le résultat
        }
      } catch (err) {
        setStatus('error');
        setMarkdown('Erreur : ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onDragOver  = (e) => { e.preventDefault(); setDragging(true);  };
  const onDragLeave = ()  => setDragging(false);

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
        </header>

        <main>

          {/* Zone de dépôt */}
          <div
            className={`dropzone${dragging ? ' drag-over' : ''}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <div className="grid-bg" />

            <div className="drop-ring">
              <span className="drop-icon">{status === 'loading' ? '⟳' : '⬇'}</span>
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
              onChange={(e) => processFile(e.target.files[0])}
            />
          </div>

          {/* Panneau Markdown */}
          <div className="preview">
            <div className="preview-header">
              <h2>Markdown</h2>
              {status === 'loading' && <div className="spinner" />}
              <span className={`badge badge-${status}`}>{badgeLabel}</span>
            </div>
            <pre className={`output${markdown ? ' has-content' : ''}`}>
              {markdown || 'Déposez un fichier pour démarrer…'}
            </pre>
          </div>

        </main>

        {/* Footer */}
        <footer>
          <span className="filename">{filename}</span>
          {markdown && (
            <button
              className="copy-btn"
              onClick={async () => {
                await navigator.clipboard.writeText(markdown);
                showToast();
              }}
            >
              Copier
            </button>
          )}
        </footer>

        {/* Toast */}
        <div className={`toast${toast ? ' show' : ''}`}>
          Markdown copié dans le presse-papier !
        </div>

      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        body {
          background: #0c0c0c;
          color: #e0d9d0;
          font-family: 'Space Grotesk', sans-serif;
        }
      `}</style>

      <style jsx>{`
        :root {
          --bg:           #0c0c0c;
          --surface:      #1e1e1e;
          --border:       #2a2a2a;
          --accent:       #e87c1a;
          --accent-dim:   #7a3e06;
          --text:         #e0d9d0;
          --text-dim:     #6b6560;
          --green:        #4caf7d;
          --mono:         'IBM Plex Mono', monospace;
        }

        .root {
          height: 100vh;
          display: grid;
          grid-template-rows: auto 1fr auto;
          overflow: hidden;
        }

        /* ── Header ── */
        header {
          padding: 16px 28px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo {
          width: 28px; height: 28px;
          background: var(--accent);
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--mono);
          font-size: 14px; font-weight: 500;
          color: #000;
          flex-shrink: 0;
        }
        header h1 { font-size: 15px; font-weight: 600; letter-spacing: -0.02em; }
        .subtitle {
          font-size: 12px;
          color: var(--text-dim);
          font-family: 'IBM Plex Mono', monospace;
          margin-left: auto;
        }

        /* ── Main ── */
        main {
          display: grid;
          grid-template-columns: 1fr 1fr;
          overflow: hidden;
        }

        /* ── Drop zone ── */
        .dropzone {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 18px;
          border-right: 2px solid var(--accent);
          padding: 40px;
          background: var(--bg);
          cursor: default;
          overflow: hidden;
          transition: background 0.15s;
        }
        .grid-bg {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 32px 32px;
          opacity: 0.3;
          pointer-events: none;
        }
        .dropzone.drag-over { background: rgba(232,124,26,0.04); }
        .drop-ring {
          width: 140px; height: 140px;
          border-radius: 50%;
          border: 2px dashed var(--border);
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.2s, box-shadow 0.2s;
          position: relative; z-index: 1;
        }
        .dropzone.drag-over .drop-ring {
          border-color: var(--accent);
          box-shadow: 0 0 0 4px rgba(232,124,26,0.1);
        }
        .drop-icon {
          font-size: 48px; line-height: 1;
          color: var(--text-dim);
          transition: color 0.2s;
        }
        .dropzone.drag-over .drop-icon { color: var(--accent); }

        .drop-label { text-align: center; position: relative; z-index: 1; }
        .drop-label p { font-size: 14px; color: var(--text-dim); line-height: 1.7; }
        .drop-label strong { color: var(--text); font-weight: 600; }
        .filetypes {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--accent-dim);
          letter-spacing: 0.05em;
          margin-top: 8px;
        }

        .pick-btn {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-dim);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          padding: 6px 16px;
          border-radius: 4px;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
          position: relative; z-index: 1;
        }
        .pick-btn:hover { border-color: var(--accent); color: var(--accent); }

        /* ── Preview ── */
        .preview {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--surface);
          border-left: 0;
        }
        .preview-header {
          padding: 13px 20px;
          border-bottom: 2px solid var(--border);
          background: #252525;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .preview-header h2 {
          font-size: 11px;
          font-weight: 500;
          font-family: 'IBM Plex Mono', monospace;
          color: var(--text-dim);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          flex: 1;
        }

        /* Spinner */
        .spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(232,124,26,0.2);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Badge */
        .badge {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 20px;
          font-weight: 500;
        }
        .badge-idle    { background: rgba(255,255,255,0.05); color: var(--text-dim); }
        .badge-loading { background: rgba(232,124,26,0.15); color: var(--accent); }
        .badge-done    { background: rgba(76,175,125,0.15); color: var(--green); }
        .badge-error   { background: rgba(255,80,80,0.15); color: #ff5050; }

        /* Output */
        .output {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px;
          line-height: 1.7;
          color: var(--text-dim);
          white-space: pre-wrap;
          word-break: break-word;
        }
        .output.has-content { color: var(--text); }
        .output::-webkit-scrollbar { width: 4px; }
        .output::-webkit-scrollbar-track { background: transparent; }
        .output::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

        /* ── Footer ── */
        footer {
          padding: 10px 28px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .filename {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--text-dim);
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .copy-btn {
          background: var(--accent);
          color: #000;
          border: none;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          font-weight: 500;
          padding: 6px 16px;
          border-radius: 4px;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .copy-btn:hover { opacity: 0.85; }

        /* ── Toast ── */
        .toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(16px);
          background: var(--green);
          color: #000;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          padding: 10px 22px;
          border-radius: 6px;
          opacity: 0;
          transition: opacity 0.2s, transform 0.2s;
          pointer-events: none;
          white-space: nowrap;
        }
        .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
      `}</style>
    </>
  );
}
