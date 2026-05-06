import mammoth from 'mammoth';
import JSZip from 'jszip';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

const VISION_PROMPT = `Tu es un assistant qui analyse des interfaces utilisateur.
Décris cette interface de façon structurée en Markdown :
1. **Vue d'ensemble** : de quelle interface s'agit-il, quel est son objectif ?
2. **Éléments cliquables** : pour chaque bouton, lien ou menu, indique son libellé et sa position précise (ex : "en haut à droite", "dans la barre latérale gauche", "sous le titre X", "au centre de la page").
3. **Champs de saisie** : liste les champs de formulaire avec leur position et leur rôle.
4. **Informations affichées** : résume les données ou textes importants visibles.
5. **Actions disponibles** : que peut faire l'utilisateur sur cet écran ?
Sois précis sur les positions pour permettre à l'utilisateur de trouver exactement où cliquer.`;

async function handleOcr(base64, mimeType, res) {
  const isPdf = mimeType === 'application/pdf';
  const document = isPdf
    ? { type: 'document_url', document_url: `data:${mimeType};base64,${base64}` }
    : { type: 'image_url', image_url: `data:${mimeType};base64,${base64}` };

  const response = await fetch('https://api.mistral.ai/v1/ocr', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'mistral-ocr-latest', document }),
  });

  const data = await response.json();
  if (!response.ok) return res.status(500).json({ error: data.message || 'Erreur OCR Mistral' });

  const markdown = data.pages?.map((p) => p.markdown).join('\n\n') ?? '';
  return res.status(200).json({ markdown });
}

async function handleVision(base64, mimeType, res) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'pixtral-12b-2409',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
            {
              type: 'text',
              text: VISION_PROMPT,
            },
          ],
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) return res.status(500).json({ error: data.message || 'Erreur Vision Mistral' });

  const markdown = data.choices?.[0]?.message?.content ?? '';
  return res.status(200).json({ markdown });
}

async function handleDocx(base64, res) {
  const buffer = Buffer.from(base64, 'base64');
  const result = await mammoth.extractRawText({ buffer });

  if (!result.value) {
    return res.status(500).json({ error: 'Impossible d\'extraire le texte du fichier DOCX.' });
  }

  // Convertit en Markdown minimal : paragraphes séparés par ligne vide
  const markdown = result.value
    .split('\n')
    .map((line) => line.trim())
    .filter((line, i, arr) => line !== '' || arr[i - 1] !== '')
    .join('\n');

  return res.status(200).json({ markdown });
}

// Extrait le texte des paragraphes d'un slide XML PPTX
function extractSlideText(xml) {
  // Regroupe les <a:t> par paragraphe <a:p> pour conserver la structure
  const paragraphs = [];
  const pRegex = /<a:p[ >][\s\S]*?<\/a:p>/g;
  let pMatch;
  while ((pMatch = pRegex.exec(xml)) !== null) {
    const tRegex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
    let tMatch;
    let line = '';
    while ((tMatch = tRegex.exec(pMatch[0])) !== null) {
      line += tMatch[1];
    }
    const trimmed = line.trim();
    if (trimmed) paragraphs.push(trimmed);
  }
  if (paragraphs.length > 0) return paragraphs.join('\n');

  // Fallback : extraire tous les <a:t> directement (PPTX non-standard)
  const fallback = [];
  const tRegex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
  let tMatch;
  while ((tMatch = tRegex.exec(xml)) !== null) {
    const text = tMatch[1].trim();
    if (text) fallback.push(text);
  }
  return fallback.join(' ');
}

async function handlePptx(base64, res) {
  const buffer = Buffer.from(base64, 'base64');
  const zip = await JSZip.loadAsync(buffer);

  // Récupère les slides dans l'ordre numérique
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0], 10);
      const numB = parseInt(b.match(/\d+/)[0], 10);
      return numA - numB;
    });

  if (slideNames.length === 0) {
    return res.status(500).json({ error: 'Aucun slide trouvé dans le fichier PPTX.' });
  }

  const sections = [];
  for (let i = 0; i < slideNames.length; i++) {
    const xml = await zip.files[slideNames[i]].async('text');
    const text = extractSlideText(xml);
    if (text) {
      sections.push(`## Slide ${i + 1}\n\n${text}`);
    }
  }

  const markdown = sections.join('\n\n---\n\n');
  return res.status(200).json({ markdown });
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { base64, mimeType, mode } = req.body;

  if (!base64 || !mimeType) {
    return res.status(400).json({ error: 'Données manquantes' });
  }

  try {
    if (mimeType === DOCX_MIME) {
      return await handleDocx(base64, res);
    }
    if (mimeType === PPTX_MIME) {
      return await handlePptx(base64, res);
    }
    if (mode === 'vision') {
      return await handleVision(base64, mimeType, res);
    }
    return await handleOcr(base64, mimeType, res);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
