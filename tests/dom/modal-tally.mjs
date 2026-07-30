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
await page.type('#input-email', 'jamie@example.com');
await page.type('#input-zip', '10001');
await page.click('#contact-next');

await page.waitForSelector('#booking-step-package:not(.hidden)');
await page.click('[data-package-id="full"]');
await page.click('#curation-addon-toggle');

try {
  const tally = await page.$eval('#price-tally', el => el.textContent);
  if (tally !== '$125') {
    throw new Error(`Expected tally of $125 (Full Makeover $75 + curation add-on $50), got ${tally}`);
  }

  await page.click('#consult-only-toggle');
  const consultOnlyTally = await page.$eval('#price-tally', el => el.textContent);
  if (consultOnlyTally !== '$50') {
    throw new Error(`Expected consult-only tally of $50, got ${consultOnlyTally}`);
  }

  // Regression: unchecking consult-only (which clears packageId/curationAddon when it was
  // checked) must reset the tally to $0, not leave the stale $50 on screen.
  await page.click('#consult-only-toggle');
  const uncheckedTally = await page.$eval('#price-tally', el => el.textContent);
  if (uncheckedTally !== '$0') {
    throw new Error(`Expected tally to reset to $0 after unchecking consult-only with no package selected, got ${uncheckedTally}`);
  }

  console.log('PASS: price tally reflects Full Makeover + curation add-on, consult-only flat price, and resets to $0 when unchecked');
} finally {
  await browser.close();
}
