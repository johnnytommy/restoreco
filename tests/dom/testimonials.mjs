import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

const cardCount = await page.$$eval('#testimonials-grid > div', els => els.length);
if (cardCount !== 3) {
  throw new Error(`Expected 3 testimonial cards, found ${cardCount}`);
}

const imagesPerCard = await page.$$eval('#testimonials-grid > div', els =>
  els.map(el => el.querySelectorAll('img').length)
);
if (imagesPerCard.some(count => count !== 2)) {
  throw new Error(`Expected 2 images (before/after) per card, found: ${imagesPerCard.join(', ')}`);
}

console.log('PASS: Testimonials section renders 3 before/after cards');
await browser.close();
