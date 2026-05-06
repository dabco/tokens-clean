# DocDrop Web — Contexte Claude Code

## Objectif
Outil web pour convertir images/PDFs/DOCX/PPTX en Markdown afin de réduire la consommation de tokens lors des échanges avec Claude. L'output est automatiquement copié dans le presse-papier.

## Emplacements

### Local (Mac)
```
~/docdrop-web/          ← dossier projet sur le Mac de David (si cloné séparément)
```
Si le projet n'est pas cloné localement, le cloner avec :
```bash
git clone https://github.com/dabco/docdrop-web.git ~/docdrop-web
cd ~/docdrop-web
npm install
```

### Remote
- **GitHub** : https://github.com/dabco/docdrop-web
- **Vercel** : https://docdrop-web.vercel.app
- **Vercel project ID** : `prj_yKOZYIcec4E0mHfhWSS4NVcVpriO`
- **Vercel team** : `team_m86eDfO4rfxekDVexL0TwMuz`

### Fichiers clés
```
pages/
  index.js          ← Frontend complet (UI, drag-drop, Cmd+V, toggle OCR/Vision)
  api/
    convert.js      ← Backend : routing OCR / Vision / DOCX / PPTX
.env.local          ← MISTRAL_API_KEY (ne pas committer, dans .gitignore)
package.json        ← Dépendances : next, react, mammoth, jszip
```

## Stack technique
- **Next.js 14** (Pages Router, serverless API routes)
- **Mistral OCR** (`mistral-ocr-latest`) : images et PDFs → Markdown
- **Pixtral** (`pixtral-12b-2409`) : analyse d'interfaces UI avec positions spatiales
- **mammoth** : extraction texte DOCX
- **jszip** : parsing XML des slides PPTX
- **Vercel Hobby** : limite body 4.5 MB (compensée par compression canvas côté client)

## Variable d'environnement requise
```
MISTRAL_API_KEY=<clé Mistral>
```
À définir dans `.env.local` pour le dev local, et dans Vercel Dashboard > Settings > Environment Variables pour la prod.

## Commandes courantes
```bash
npm run dev       # dev local sur http://localhost:3000
git add -A && git commit -m "..." && git push origin main   # déploie via Vercel (auto)
```

## Architecture backend (pages/api/convert.js)
Le handler reçoit `{ base64, mimeType, mode }` et route vers :
- `mimeType === application/vnd...wordprocessingml` → `handleDocx()` (mammoth)
- `mimeType === application/vnd...presentationml` → `handlePptx()` (jszip + XML)
- `mode === 'vision'` → `handleVision()` (Pixtral chat completions)
- sinon → `handleOcr()` (Mistral OCR, supporte PDF et images)

## Architecture frontend (pages/index.js)
- Split-panel : gauche noire (#0c0c0c) + séparateur orange (#e87c1a) + droite bleu-ardoise (#1a2035)
- Toggle OCR / Vision avec pill animée (useRef pour éviter stale closure)
- Compression canvas avant envoi (max 1568px, JPEG 85%) pour rester sous la limite Vercel
- Estimation tokens : `(w × h) / 750` pour les images (formule Claude)
- Affichage économies : pourcentage + barre verte + détail "Image Xtk → Texte Ytk"

## Bugs connus / historique
- Vercel Hobby limite à 4.5 MB le body des API routes (pas 20 MB comme configuré)
  → Résolu par compression client-side
- Stale closure sur le mode OCR/Vision dans useCallback
  → Résolu par pattern useRef + modeRef.current dans processFile
- DOCX/PPTX affichés dans le file picker mais non gérés côté backend
  → Résolu avec mammoth (DOCX) et jszip (PPTX)
