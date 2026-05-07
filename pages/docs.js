import Head from 'next/head';
import Link from 'next/link';

export default function Docs() {
  return (
    <>
      <Head>
        <title>DocDrop — Documentation</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="page">
        <header>
          <Link href="/" className="logo-link">
            <div className="logo">D</div>
            <div>
              <h1>DocDrop</h1>
              <p className="tagline">image · pdf → markdown → presse-papier</p>
            </div>
          </Link>
          <Link href="/" className="back-btn">← Retour à l'app</Link>
        </header>

        <main>
          <section>
            <h2>Version web</h2>
            <p>Convertit images, PDFs, DOCX et PPTX en Markdown pour réduire la consommation de tokens lors des échanges avec Claude.</p>

            <h3>Utilisation</h3>
            <ul>
              <li><strong>Glisser-déposer</strong> — faites glisser votre fichier dans la zone gauche</li>
              <li><strong>Cmd+V</strong> — collez directement un screenshot depuis le presse-papier</li>
              <li><strong>Choisir un fichier</strong> — cliquez sur le bouton pour parcourir vos fichiers</li>
            </ul>
            <p>Le Markdown est automatiquement copié dans le presse-papier après la conversion.</p>

            <h3>Formats supportés</h3>
            <table>
              <thead>
                <tr><th>Format</th><th>Moteur</th><th>Notes</th></tr>
              </thead>
              <tbody>
                <tr><td>PNG, JPG, GIF, WEBP</td><td>Mistral OCR</td><td>Compression automatique si &gt; 1568px</td></tr>
                <tr><td>PDF</td><td>Mistral OCR</td><td>Toutes les pages, avec images</td></tr>
                <tr><td>DOCX</td><td>mammoth</td><td>Extraction texte brut</td></tr>
                <tr><td>PPTX</td><td>jszip</td><td>Slides texte uniquement — les slides image-based nécessitent une export PDF</td></tr>
              </tbody>
            </table>

            <h3>Modes</h3>
            <ul>
              <li><strong>OCR</strong> — extrait le texte d'un document ou d'une image. Mode par défaut.</li>
              <li><strong>Vision</strong> — analyse une interface utilisateur et décrit les éléments cliquables avec leurs positions. Utile pour les screenshots d'apps.</li>
              <li><strong>Extraction texte</strong> — traitement local pour DOCX et PPTX, sans appel API.</li>
            </ul>

            <h3>Limite de taille</h3>
            <p>4,5 MB par fichier (limite Vercel Hobby). Les images sont automatiquement compressées côté client avant l'envoi.</p>
          </section>

          <section>
            <h2>Version MCP <span className="badge">Claude Code</span></h2>
            <p>Un serveur MCP qui expose l'outil <code>convert_to_markdown</code> directement dans Claude Code. Idéal pour convertir des fichiers locaux sans quitter le terminal.</p>

            <h3>Prérequis</h3>
            <ul>
              <li>Node.js 18+</li>
              <li>Claude Code CLI installé</li>
            </ul>

            <h3>Installation</h3>
            <div className="code-block">
              <pre>{`# 1. Cloner ou télécharger le dossier mcp/
git clone https://github.com/dabco/docdrop-web.git
cd docdrop-web/mcp
npm install`}</pre>
            </div>

            <h3>Configuration dans Claude Code</h3>
            <p>Ajoutez le serveur dans <code>~/.claude/settings.json</code> :</p>
            <div className="code-block">
              <pre>{`{
  "mcpServers": {
    "docdrop": {
      "command": "node",
      "args": ["/chemin/absolu/vers/docdrop-web/mcp/index.js"]
    }
  }
}`}</pre>
            </div>
            <p>Remplacez <code>/chemin/absolu/vers/docdrop-web</code> par le vrai chemin sur votre machine, par exemple <code>/Users/david/docdrop-web</code>.</p>

            <h3>Utilisation</h3>
            <p>Dans Claude Code, l'outil est disponible automatiquement. Exemples :</p>
            <div className="code-block">
              <pre>{`# Convertir un PDF
"Convertis ~/Desktop/rapport.pdf en Markdown"

# Convertir une image
"Extrais le texte de ~/Downloads/screenshot.png"

# Analyser une interface (mode vision)
"Analyse cette interface : ~/Desktop/app-ui.png" (mode vision)`}</pre>
            </div>

            <h3>Paramètres de l'outil</h3>
            <table>
              <thead>
                <tr><th>Paramètre</th><th>Type</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td><code>file_path</code></td><td>string (requis)</td><td>Chemin absolu ou relatif vers le fichier</td></tr>
                <tr><td><code>mode</code></td><td>ocr | vision</td><td>Mode de conversion (défaut : ocr)</td></tr>
              </tbody>
            </table>

            <h3>Formats supportés</h3>
            <p>PNG, JPG, GIF, WEBP, PDF, DOCX, PPTX — identiques à la version web.</p>
          </section>
        </main>

        <style jsx>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }

          .page {
            min-height: 100vh;
            background: #0c0c0c;
            color: #e0d9d0;
            font-family: 'Space Grotesk', sans-serif;
          }

          header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 24px;
            background: #111;
            border-bottom: 3px solid #e87c1a;
          }

          .logo-link {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            color: inherit;
          }

          .logo {
            width: 32px; height: 32px;
            background: #e87c1a;
            display: flex; align-items: center; justify-content: center;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 14px; font-weight: 500; color: #000;
          }

          header h1 { font-size: 15px; font-weight: 600; }
          .tagline { font-size: 11px; color: #555; font-family: 'IBM Plex Mono', monospace; }

          .back-btn {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 12px;
            color: #666;
            text-decoration: none;
            transition: color 0.2s;
          }
          .back-btn:hover { color: #e87c1a; }

          main {
            max-width: 760px;
            margin: 0 auto;
            padding: 48px 24px;
            display: flex;
            flex-direction: column;
            gap: 56px;
          }

          section { display: flex; flex-direction: column; gap: 20px; }

          h2 {
            font-size: 20px;
            font-weight: 600;
            color: #e87c1a;
            display: flex;
            align-items: center;
            gap: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #222;
          }

          h3 {
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #888;
            font-family: 'IBM Plex Mono', monospace;
            margin-top: 8px;
          }

          p { font-size: 14px; line-height: 1.7; color: #bbb; }

          ul {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          li {
            font-size: 14px;
            color: #bbb;
            line-height: 1.6;
            padding-left: 16px;
            position: relative;
          }
          li::before {
            content: '—';
            position: absolute;
            left: 0;
            color: #e87c1a;
          }

          strong { color: #e0d9d0; }

          code {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 12px;
            background: #1a1a1a;
            border: 1px solid #2a2a2a;
            padding: 2px 6px;
            color: #e87c1a;
          }

          .code-block {
            background: #0a0a0a;
            border: 1px solid #222;
            border-left: 3px solid #e87c1a;
            overflow-x: auto;
          }

          .code-block pre {
            padding: 16px 20px;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 12px;
            line-height: 1.7;
            color: #aaa;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }

          th {
            text-align: left;
            padding: 8px 12px;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 11px;
            font-weight: 500;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            border-bottom: 1px solid #222;
          }

          td {
            padding: 10px 12px;
            color: #bbb;
            border-bottom: 1px solid #1a1a1a;
            vertical-align: top;
          }

          td:first-child { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #e0d9d0; }

          .badge {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 10px;
            font-weight: 500;
            background: #1a2035;
            color: #5a8a9f;
            padding: 2px 8px;
            letter-spacing: 0.06em;
          }
        `}</style>
      </div>
    </>
  );
}
