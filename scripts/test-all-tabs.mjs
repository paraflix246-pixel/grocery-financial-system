import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox'],
  protocolTimeout: 60000,
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
await page.goto('http://localhost:8081/receipts', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => document.body.innerText.includes('Receipts'), { timeout: 15000 });

for (const [href, needle] of [
  ['/', 'Good evening'],
  ['/receipts', 'All scanned receipts'],
  ['/scan', 'Retake'],
  ['/lists', 'Grocery List'],
  ['/more', 'Settings and quick links'],
]) {
  const before = page.url();
  await page.evaluate((h) => {
    document.querySelector(`a[role=tab][href='${h}']`)?.click();
  }, href);
  await new Promise((r) => setTimeout(r, 2000));
  const after = page.url();
  const ok = await page.evaluate((n) => document.body.innerText.includes(n), needle);
  console.log(`${href}: url ${before} -> ${after}, content ${ok ? 'PASS' : 'FAIL'} ("${needle}")`);
}

await browser.close();
