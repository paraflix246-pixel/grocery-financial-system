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
if (await page.evaluate(() => document.body.innerText.includes('Get Started'))) {
  const reachable = await page.evaluate(() => {
    const tab = document.querySelector("a[role=tab][href='/more']");
    const r = tab?.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return hit === tab || tab?.contains(hit);
  });
  console.log('Tab bar reachable during onboarding:', reachable);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('*')].find((el) => el.textContent === 'Get Started');
    btn?.click();
  });
  await new Promise((r) => setTimeout(r, 1500));
}

const expectations = {
  '/': 'Good evening',
  '/receipts': 'All scanned receipts',
  '/scan': 'Retake',
  '/lists': 'Grocery List',
  '/more': 'Settings and quick links',
};

for (const [href, needle] of Object.entries(expectations)) {
  await page.goto('http://localhost:8081/', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => document.body.innerText.includes('Good evening'), { timeout: 30000 });
  const box = await page.evaluate((h) => {
    const el = document.querySelector(`a[role=tab][href='${h}']`);
    const r = el?.getBoundingClientRect();
    return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
  }, href);
  await page.mouse.click(box.x, box.y);
  await new Promise((r) => setTimeout(r, 3000));
  const ok = await page.evaluate((n) => document.body.innerText.includes(n), needle);
  console.log(`${href}: ${ok ? 'PASS' : 'FAIL'}`);
}

await browser.close();
