import fs from 'node:fs';
import path from 'node:path';

import { DEEPREAD_API_BASE, RECEIPT_EXTRACTION_SCHEMA } from '../src/services/deepreadReceiptMapper';

function loadEnvFile(): void {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
}

async function main() {
  loadEnvFile();
  const apiKey = process.env.DEEPREAD_API_KEY?.trim();
  if (!apiKey) {
    console.error('DEEPREAD_API_KEY missing');
    process.exit(1);
  }

  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const imageBytes = Buffer.from(pngBase64, 'base64');
  const form = new FormData();
  form.append('file', new Blob([Uint8Array.from(imageBytes)], { type: 'image/png' }), 'receipt.png');
  form.append('schema', JSON.stringify(RECEIPT_EXTRACTION_SCHEMA));
  form.append('pipeline', 'fast');

  const response = await fetch(`${DEEPREAD_API_BASE}/v1/process`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: form,
    signal: AbortSignal.timeout(30_000),
  });

  const body = await response.text();
  console.log('status:', response.status);
  console.log('body:', body);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
