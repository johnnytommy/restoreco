import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

const cardCount = await page.$$eval('#founders-grid > div', els => els.length);
if (cardCount !== 2) {
  throw new Error(`Expected 2 founder cards, found ${cardCount}`);
}

const names = await page.$$eval('#founders-grid h3', els => els.map(el => el.textContent));
if (!names.includes('Dejah Powell') || !names.includes('Johnny Thomas')) {
  throw new Error(`Expected Dejah Powell and Johnny Thomas, found: ${names.join(', ')}`);
}

console.log('PASS: About section renders both founder cards');
await browser.close();
