import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox'],
  protocolTimeout: 180000,
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('CONSOLE:', msg.text());
});
await page.setViewport({ width: 390, height: 844 });
await page.goto('http://localhost:8081/receipts', { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForFunction(() => document.body.innerText.includes('All scanned receipts'), {
  timeout: 30000,
});

async function dismissOnboarding() {
  const has = await page.evaluate(() => document.body.innerText.includes('Get Started'));
  if (has) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('*')].find((el) => el.textContent === 'Get Started');
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
  }
}

await dismissOnboarding();

for (const href of ['/lists', '/more']) {
  console.log('--- Testing', href, '---');
  const before = page.url();
  const clicked = await page.evaluate((h) => {
    const el = document.querySelector(`a[role=tab][href='${h}']`);
    if (!el) return { ok: false, reason: 'missing tab' };
    el.click();
    return { ok: true };
  }, href);
  console.log('click result:', clicked);
  await new Promise((r) => setTimeout(r, 4000));
  const after = page.url();
  const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 200));
  console.log('url:', before, '->', after, 'changed:', before !== after);
  console.log('text:', text);
}

await browser.close();
