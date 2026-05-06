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
      model: 'pixtral-large-latest',
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { base64, mimeType, mode } = req.body;

  if (!base64 || !mimeType) {
    return res.status(400).json({ error: 'Données manquantes' });
  }

  try {
    if (mode === 'vision') {
      return await handleVision(base64, mimeType, res);
    } else {
      return await handleOcr(base64, mimeType, res);
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
