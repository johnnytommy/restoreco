import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();

await page.evaluateOnNewDocument(() => {
  window.fetch = async () => new Response('{}');
});

await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

await page.click('.js-open-booking');
await page.waitForSelector('#booking-step-contact:not(.hidden)');
await page.type('#input-firstName', 'Jamie');
await page.type('#input-lastName', 'Rivera');
await page.type('#input-neighborhood', 'Fishtown');
await page.click('#contact-next');

await page.waitForSelector('#booking-step-package:not(.hidden)');
await page.click('[data-package-id="full"]');
await page.click('#addon-toggle');

try {
  const tally = await page.$eval('#price-tally', el => el.textContent);
  if (tally !== '$84') {
    throw new Error(`Expected tally of $84 (Full Makeover $75 + add-on $9), got ${tally}`);
  }

  console.log('PASS: price tally reflects Full Makeover + Phone Consultation add-on');
} finally {
  await browser.close();
}
