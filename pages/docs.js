import Head from 'next/head';
import Link from 'next/link';

export default function Docs() {
  return (
    <>
      <Head>
        <title>TokensClean — Documentation</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Montserrat:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="page">
        <header>
          <Link href="/" className="logo-link">
            <div className="logo">TC</div>
            <div>
              <h1>TokensClean</h1>
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
                <tr><td>PPTX</td><td>jszip</td><td>Slides texte uniquement — les slides image-based nécessitent un export PDF</td></tr>
              </tbody>
            </table>

            <h3>Modes</h3>
            <ul>
              <li><strong>OCR</strong> — extrait le texte d'un document ou d'une image. Mode par défaut.</li>
              <li><strong>Vision</strong> — analyse une interface utilisateur et décrit les éléments cliquables avec leurs positions. Utile pour les screenshots d'apps.</li>
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
              <pre>{`git clone https://github.com/dabco/tokens-clean.git
cd tokens-clean/mcp
npm install`}</pre>
            </div>

            <h3>Configuration dans Claude Code</h3>
            <p>Ajoutez le serveur dans <code>~/.claude/settings.json</code> :</p>
            <div className="code-block">
              <pre>{`{
  "mcpServers": {
    "tokensclean": {
      "command": "node",
      "args": ["/chemin/absolu/vers/tokens-clean/mcp/index.js"]
    }
  }
}`}</pre>
            </div>
            <p>Remplacez <code>/chemin/absolu/vers/tokens-clean</code> par le chemin réel sur votre machine, ex. <code>/Users/user/tokens-clean</code>.</p>

            <h3>Exemples d'utilisation</h3>
            <div className="code-block">
              <pre>{`# Convertir un PDF
"Convertis ~/Desktop/rapport.pdf en Markdown"

# Extraire le texte d'une image
"Extrais le texte de ~/Downloads/screenshot.png"

# Analyser une interface UI (mode vision)
"Analyse cette interface : ~/Desktop/app-ui.png"`}</pre>
            </div>

            <h3>Paramètres</h3>
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
            background: #000;
            color: #fff;
            font-family: 'Montserrat', sans-serif;
          }

          header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 24px;
            height: 52px;
            background: #000;
            border-bottom: 1px solid #111;
          }

          .logo-link {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            color: inherit;
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
          }

          a, a:visited, a:link { color: inherit; text-decoration: none; }

          header h1 { font-size: 15px; font-weight: 700; letter-spacing: -0.02em; }
          .tagline { font-size: 11px; color: #444; font-family: 'IBM Plex Mono', monospace; }

          .back-btn {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 11px;
            color: #444;
            text-decoration: none;
            transition: color 0.2s;
          }
          .back-btn:hover { color: #D2F909; }

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
            font-size: 18px;
            font-weight: 700;
            color: #D2F909;
            display: flex;
            align-items: center;
            gap: 10px;
            padding-bottom: 12px;
            border-bottom: 1px solid #111;
          }

          h3 {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #444;
            font-family: 'IBM Plex Mono', monospace;
            margin-top: 4px;
          }

          p { font-size: 14px; line-height: 1.7; color: #888; }

          ul {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          li {
            font-size: 14px;
            color: #888;
            line-height: 1.6;
            padding-left: 16px;
            position: relative;
          }
          li::before {
            content: '—';
            position: absolute;
            left: 0;
            color: #D2F909;
          }

          strong { color: #fff; }

          code {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 12px;
            background: #1a1a00;
            border: 1px solid #3a3a00;
            padding: 2px 6px;
            color: #D2F909;
          }

          .code-block {
            background: #060606;
            border: 1px solid #111;
            border-left: 3px solid #D2F909;
            overflow-x: auto;
          }

          .code-block pre {
            padding: 16px 20px;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 12px;
            line-height: 1.7;
            color: #666;
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
            font-size: 10px;
            font-weight: 700;
            color: #333;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            border-bottom: 1px solid #111;
          }

          td {
            padding: 10px 12px;
            color: #777;
            border-bottom: 1px solid #0a0a0a;
            vertical-align: top;
          }

          td:first-child {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 12px;
            color: #ccc;
          }

          .badge {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 9px;
            font-weight: 700;
            background: rgba(210,249,9,0.1);
            color: #D2F909;
            padding: 3px 8px;
            border-radius: 4px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
        `}</style>
      </div>
    </>
  );
}
