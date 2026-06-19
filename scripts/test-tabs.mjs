import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox'],
  protocolTimeout: 120000,
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
await page.goto('http://localhost:8081/', { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForFunction(() => document.body.innerText.includes('Good evening'), { timeout: 30000 });

const onboardingReachable = await page.evaluate(() => {
  const tab = document.querySelector("a[role=tab][href='/more']");
  const r = tab?.getBoundingClientRect();
  if (!r) return false;
  const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return hit === tab || tab?.contains(hit);
});
console.log('Tab bar reachable during onboarding:', onboardingReachable);

if (await page.evaluate(() => document.body.innerText.includes('Get Started'))) {
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
  '/shopping-lists': 'My Grocery List',
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
  const path = await page.evaluate(() => location.pathname);
  const ok = await page.evaluate((n) => document.body.innerText.includes(n), needle);
  console.log(`${href}: path=${path} content=${ok ? 'PASS' : 'FAIL'}`);
}

await browser.close();
