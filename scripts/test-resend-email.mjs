/**
 * Sends a test email via Resend to verify RESEND_API_KEY and from-address config.
 * Loads .env.local then .env (same order as Next/Expo local dev).
 *
 * Usage: npm run test:email
 * Optional: TEST_EMAIL=you@example.com npm run test:email
 */
import { readFileSync, existsSync } from 'node:fs';

import { buildTestEmailHtml } from '../src/services/auth/welcomeEmail.server.ts';

const DEFAULT_FROM = 'Penny Pantry <hello@pennypantry.xyz>';
const DEFAULT_TO = 'pennypantry02@gmail.com';
const DEFAULT_APP_URL = 'https://pennypantry.xyz';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const apiKey = process.env.RESEND_API_KEY?.trim();
const from = process.env.WELCOME_FROM_EMAIL?.trim() || DEFAULT_FROM;
const to = process.env.TEST_EMAIL?.trim() || DEFAULT_TO;
const appUrl = process.env.EXPO_PUBLIC_APP_URL?.trim()?.replace(/\/$/, '') || DEFAULT_APP_URL;

if (!apiKey) {
  console.error('❌ RESEND_API_KEY is missing. Add it to .env.local or .env and retry.');
  process.exit(1);
}

console.log('Resend test email');
console.log(`  from: ${from}`);
console.log(`  to:   ${to}`);

const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from,
    to: [to],
    subject: 'Penny Pantry — email test',
    html: buildTestEmailHtml(appUrl),
  }),
});

const bodyText = await response.text();
let bodyJson;
try {
  bodyJson = JSON.parse(bodyText);
} catch {
  bodyJson = null;
}

if (!response.ok) {
  console.error(`❌ Resend API error (${response.status})`);
  console.error(bodyJson ? JSON.stringify(bodyJson, null, 2) : bodyText);
  process.exit(1);
}

console.log('✅ Test email sent successfully');
console.log(bodyJson ? JSON.stringify(bodyJson, null, 2) : bodyText);
