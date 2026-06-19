import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox'],
  protocolTimeout: 180000,
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });

await page.goto('http://localhost:8081/', { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForFunction(() => document.body.innerText.includes('Good evening'), { timeout: 30000 });

// Dismiss onboarding
if (await page.evaluate(() => document.body.innerText.includes('Get Started'))) {
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('*')].find((el) => el.textContent === 'Get Started');
    btn?.click();
  });
  await new Promise((r) => setTimeout(r, 1500));
}

const tabs = ['/', '/receipts', '/scan', '/lists', '/more'];
for (const href of tabs) {
  const info = await page.evaluate((h) => {
    const el = document.querySelector(`a[role=tab][href='${h}']`);
    const r = el?.getBoundingClientRect();
    const hit = r ? document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) : null;
    return {
      exists: !!el,
      rect: r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null,
      hitTag: hit?.tagName,
      hitText: hit?.textContent?.slice(0, 30),
      hitRole: hit?.getAttribute?.('role'),
      hitHref: hit?.getAttribute?.('href'),
    };
  }, href);
  console.log(`${href} elementFromPoint:`, JSON.stringify(info));
}

// Try programmatic click on lists tab
console.log('\nProgrammatic click on /lists...');
const progResult = await Promise.race([
  page.evaluate(() => {
    const el = document.querySelector("a[role=tab][href='/lists']");
    el?.click();
    return 'clicked';
  }),
  new Promise((_, rej) => setTimeout(() => rej(new Error('prog click timeout')), 10000)),
]).catch((e) => e.message);
console.log('Prog click result:', progResult);
await new Promise((r) => setTimeout(r, 3000));
const afterProg = await page.evaluate(() => ({
  url: location.pathname,
  text: document.body.innerText.slice(0, 200),
}));
console.log('After prog click:', afterProg);

// Try direct goto lists
console.log('\nDirect goto /lists...');
await page.goto('http://localhost:8081/lists', { waitUntil: 'networkidle2', timeout: 60000 });
const afterGoto = await page.evaluate(() => ({
  url: location.pathname,
  hasList: document.body.innerText.includes('My Grocery List'),
}));
console.log('After goto:', afterGoto);

await browser.close();
