/**
 * Sends preview copies of every Resend transactional email type to a test inbox.
 * Loads .env.local then .env (same order as local dev).
 *
 * Usage: npm run test:emails
 * Optional: TEST_EMAIL=you@example.com npm run test:emails
 */
import { readFileSync, existsSync } from 'node:fs';

import { buildPasswordChangedEmailHtmlForApp } from '../src/services/auth/transactionalEmail.server.ts';
import { buildEmailChangedAlertHtmlForApp } from '../src/services/auth/transactionalEmail.server.ts';
import {
  buildTestEmailHtml,
  buildWelcomeEmailHtml,
} from '../src/services/auth/welcomeEmail.server.ts';
import { getTransactionalFromEmail } from '../src/services/auth/resendEmail.server.ts';

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
const from = getTransactionalFromEmail();
const to = process.env.TEST_EMAIL?.trim() || DEFAULT_TO;
const appUrl = process.env.EXPO_PUBLIC_APP_URL?.trim()?.replace(/\/$/, '') || DEFAULT_APP_URL;

if (!apiKey) {
  console.error('❌ RESEND_API_KEY is missing. Add it to .env.local or .env and retry.');
  process.exit(1);
}

const EMAILS = [
  {
    type: 'Welcome email',
    subject: 'Welcome to Penny Pantry',
    html: buildWelcomeEmailHtml('Test User', appUrl),
  },
  {
    type: 'Password changed notification',
    subject: 'Your Penny Pantry password was updated',
    html: buildPasswordChangedEmailHtmlForApp(appUrl),
  },
  {
    type: 'Email changed (old address alert)',
    subject: 'Your Penny Pantry email was changed',
    html: buildEmailChangedAlertHtmlForApp('old@example.com', to, appUrl),
  },
  {
    type: 'Branded test email',
    subject: 'Penny Pantry — email test',
    html: buildTestEmailHtml(appUrl),
  },
];

async function sendEmail({ type, subject, html }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  const bodyText = await response.text();
  let bodyJson;
  try {
    bodyJson = JSON.parse(bodyText);
  } catch {
    bodyJson = null;
  }

  if (!response.ok) {
    return {
      type,
      sent: false,
      resendId: null,
      error: bodyJson?.message || bodyText || response.statusText,
    };
  }

  return {
    type,
    sent: true,
    resendId: bodyJson?.id ?? null,
    error: null,
  };
}

console.log('Sending all Penny Pantry transactional email previews');
console.log(`  from: ${from}`);
console.log(`  to:   ${to}`);
console.log('');

const results = [];
for (const email of EMAILS) {
  const result = await sendEmail(email);
  results.push(result);
  const icon = result.sent ? '✅' : '❌';
  const detail = result.sent ? result.resendId : result.error;
  console.log(`${icon} ${result.type}: ${detail}`);
}

console.log('');
console.log('Summary');
console.log('-------');
for (const result of results) {
  console.log(
    `${result.type} | ${result.sent ? 'sent' : 'failed'} | ${result.resendId || result.error}`
  );
}

if (results.some((result) => !result.sent)) {
  process.exit(1);
}
