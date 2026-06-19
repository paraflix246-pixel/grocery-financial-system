import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox'],
  protocolTimeout: 60000,
});

for (const path of ['/more', '/lists']) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log(path, 'PAGE ERROR:', e.message));
  await page.setViewport({ width: 390, height: 844 });
  console.log('--- Fresh page goto', path, '---');
  const start = Date.now();
  try {
    await page.goto(`http://localhost:8081${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(() => document.body.innerText.length > 20, { timeout: 10000 });
    const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 200));
    console.log('OK in', Date.now() - start, 'ms:', text);
  } catch (e) {
    console.log('FAIL after', Date.now() - start, 'ms:', e.message);
  }
  await page.close();
}

await browser.close();
