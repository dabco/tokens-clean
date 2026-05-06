export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { base64, mimeType } = req.body;

  if (!base64 || !mimeType) {
    return res.status(400).json({ error: 'Données manquantes' });
  }

  const isPdf = mimeType === 'application/pdf';

  const document = isPdf
    ? { type: 'document_url', document_url: `data:${mimeType};base64,${base64}` }
    : { type: 'image_url', image_url: `data:${mimeType};base64,${base64}` };

  try {
    const response = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.message || 'Erreur API Mistral' });
    }

    const markdown = data.pages?.map((p) => p.markdown).join('\n\n') ?? '';
    return res.status(200).json({ markdown });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
