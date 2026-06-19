import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox'],
  protocolTimeout: 180000,
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
await page.setViewport({ width: 390, height: 844 });
await page.goto('http://localhost:8081', { waitUntil: 'networkidle2', timeout: 60000 });

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

async function clickByText(text) {
  return page.evaluate((label) => {
    const el = [...document.querySelectorAll('*')].find(
      (node) => node.textContent?.trim() === label && node.getAttribute('role') === 'button'
    );
    if (!el) return { ok: false, reason: `button not found: ${label}` };
    el.click();
    return { ok: true };
  }, text);
}

console.log('--- Shopping Lists quick action ---');
let r = await clickByText('Shopping Lists');
console.log('click:', r);
await new Promise((res) => setTimeout(res, 3000));
let text = await page.evaluate(() => document.body.innerText.slice(0, 300));
console.log('text after quick action:', text.replace(/\s+/g, ' '));

console.log('--- Lists tab ---');
await page.evaluate(() => {
  const el = document.querySelector("a[role=tab][href='/lists']");
  if (el) el.click();
});
await new Promise((res) => setTimeout(res, 3000));
text = await page.evaluate(() => document.body.innerText.slice(0, 400));
console.log('lists tab text:', text.replace(/\s+/g, ' '));

const hasEmpty = text.includes('Create Weekly Shopping');
console.log('empty state visible:', hasEmpty);

if (hasEmpty) {
  console.log('--- Create Weekly Shopping ---');
  r = await clickByText('Create Weekly Shopping');
  console.log('click:', r);
  await new Promise((res) => setTimeout(res, 5000));
  text = await page.evaluate(() => document.body.innerText.slice(0, 500));
  console.log('detail text:', text.replace(/\s+/g, ' '));
  console.log('has Milk:', text.includes('Milk'));
}

await browser.close();
