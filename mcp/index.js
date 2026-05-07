#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';

const DOCDROP_API = 'https://docdrop-web.vercel.app/api/convert';

const MIME_TYPES = {
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.pdf':  'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

const server = new Server(
  { name: 'docdrop', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'convert_to_markdown',
    description:
      'Convertit un fichier local (image, PDF, DOCX, PPTX) en Markdown via DocDrop. ' +
      'Utilise cet outil avant de lire un document pour économiser des tokens : ' +
      'au lieu de traiter le fichier brut, récupère directement le Markdown extrait.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Chemin absolu ou relatif vers le fichier à convertir',
        },
        mode: {
          type: 'string',
          enum: ['ocr', 'vision'],
          description: 'ocr (défaut) : extrait le texte. vision : analyse une interface UI avec positions spatiales.',
        },
      },
      required: ['file_path'],
    },
  }],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'convert_to_markdown') {
    throw new Error(`Outil inconnu : ${request.params.name}`);
  }

  const { file_path, mode = 'ocr' } = request.params.arguments;
  const absPath = path.resolve(file_path);

  if (!fs.existsSync(absPath)) {
    return { content: [{ type: 'text', text: `Erreur : fichier introuvable — ${absPath}` }] };
  }

  const ext = path.extname(absPath).toLowerCase();
  const mimeType = MIME_TYPES[ext];

  if (!mimeType) {
    return {
      content: [{
        type: 'text',
        text: `Format non supporté (${ext}). Formats acceptés : PNG, JPG, GIF, WEBP, PDF, DOCX, PPTX`,
      }],
    };
  }

  const base64 = fs.readFileSync(absPath).toString('base64');

  const response = await fetch(DOCDROP_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, mimeType, mode }),
  });

  const data = await response.json();

  if (data.error) {
    return { content: [{ type: 'text', text: data.message || data.error }] };
  }

  return { content: [{ type: 'text', text: data.markdown }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
