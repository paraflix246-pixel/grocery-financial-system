import fs from 'node:fs';
import path from 'node:path';

import { processReceiptImageWithDeepRead } from '../src/services/deepreadReceiptParse.server';

function loadEnvFile(): void {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvFile();
  const imagePath =
    process.argv[2] ||
    path.join(
      process.cwd(),
      'assets',
      'c__Users_shawa_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_675219315_122315980922199876_8168621789951131789_n-0ce69352-6dab-4f50-bf8d-0b4a5b6e5a29.png'
    );

  const apiKey = process.env.DEEPREAD_API_KEY?.trim();
  if (!apiKey) {
    console.error('DEEPREAD_API_KEY is not set in .env');
    process.exit(1);
  }

  if (!fs.existsSync(imagePath)) {
    console.error('Image not found:', imagePath);
    process.exit(1);
  }

  console.log('Image:', imagePath);
  console.log('DeepRead: https://api.deepread.tech');

  const imageBase64 = fs.readFileSync(imagePath).toString('base64');
  const started = Date.now();
  const result = await processReceiptImageWithDeepRead(apiKey, imageBase64, 'image/png');
  const elapsedSec = Math.round((Date.now() - started) / 1000);

  console.log(`\nCompleted in ${elapsedSec}s (job ${result.jobId})`);
  console.log('parseVerified:', result.parseVerified, 'needsReview:', result.needsReview);
  console.log('\n=== Draft ===');
  console.log(JSON.stringify(result.draft, null, 2));
  console.log('\nItems:', result.draft.items.length, 'total:', result.draft.total);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
