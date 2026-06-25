import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const serverUrl = pathToFileURL('./src/services/kroger/krogerApi.server.ts').href;
const { searchKrogerProductQuotes, isKrogerConfigured } = await import(serverUrl);

console.log('Kroger configured:', isKrogerConfigured());

for (const term of ['milk', 'eggs', 'bread']) {
  const result = await searchKrogerProductQuotes({ term, zipCode: '90210', limit: 3 });
  console.log(`\n${term.toUpperCase()} @ ${result.storeName ?? 'no store'} (${result.locationId ?? 'n/a'})`);
  if (result.quotes.length === 0) {
    console.log('  (no quotes returned)');
    continue;
  }
  for (const quote of result.quotes) {
    console.log(`  $${quote.price.toFixed(2)} — ${quote.storeName}`);
  }
}
