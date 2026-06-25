import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox'],
  protocolTimeout: 120000,
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
await page.goto('http://localhost:8081/', { waitUntil: 'networkidle2', timeout: 60000 });

const tabs = await page.evaluate(() =>
  [...document.querySelectorAll("a[role=tab]")].map((a) => ({
    href: a.getAttribute('href'),
    text: a.textContent?.trim(),
    selected: a.getAttribute('aria-selected'),
  }))
);
console.log('Tab links:', tabs);

// dismiss onboarding
if (await page.evaluate(() => document.body.innerText.includes('Get Started'))) {
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('*')].find((el) => el.textContent === 'Get Started');
    btn?.click();
  });
  await new Promise((r) => setTimeout(r, 1500));
}

for (const href of tabs.map((t) => t.href)) {
  const result = await Promise.race([
    (async () => {
      await page.evaluate((h) => {
        document.querySelector(`a[role=tab][href='${h}']`)?.click();
      }, href);
      await new Promise((r) => setTimeout(r, 4000));
      return page.evaluate(() => ({
        path: location.pathname,
        snippet: document.body.innerText.slice(0, 80).replace(/\s+/g, ' '),
      }));
    })(),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000)),
  ]).catch((e) => ({ error: e.message }));
  console.log(`${href}:`, result);
}

await browser.close();
