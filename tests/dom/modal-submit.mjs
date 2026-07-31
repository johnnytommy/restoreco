import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();

const capturedPayloads = [];
await page.exposeFunction('__captureFetch', (body) => capturedPayloads.push(JSON.parse(body)));
await page.evaluateOnNewDocument(() => {
  // app.js refuses to fetch while SHEETS_WEBAPP_URL is still the shipped placeholder (see fix #2
  // in the final-review pass); this test-only seam simulates a configured deployment so the
  // progressive-submission flow can actually be exercised.
  window.__RESTORECO_TEST_WEBAPP_URL__ = 'https://example.com/fake-apps-script-deployment';
  window.fetch = async (url, options) => {
    await window.__captureFetch(options.body);
    return new Response('{}');
  };
});

await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

try {
  await page.click('.js-open-booking');
  await page.waitForSelector('#booking-step-contact:not(.hidden)');
  await page.type('#input-firstName', 'Jamie');
  await page.type('#input-lastName', 'Rivera');
  await page.type('#input-email', 'jamie@example.com');
  await page.type('#input-zip', '10001');
  await page.click('#contact-next');

  await page.waitForSelector('#booking-step-package:not(.hidden)');
  await page.click('[data-package-id="quick"]');
  await page.click('#package-next');

  await page.waitForSelector('#booking-step-availability:not(.hidden)');
  await page.click('#weekday-options [data-part="Evening"]');
  await page.click('#weekday-options [data-part="Morning"]');
  await page.click('#weekend-options [data-part="Morning"]');
  await page.click('#availability-next');

  await page.waitForSelector('#booking-step-intake:not(.hidden)');
  await page.click('[data-intake-id="serious"]');
  await page.click('[data-intake-id="feelBetter"]');
  await page.click('#intake-next');

  await page.waitForSelector('#booking-step-confirm:not(.hidden)');
  await page.click('#confirm-submit');

  if (capturedPayloads.length !== 5) {
    throw new Error(`Expected 5 progressive submissions (Contact, Package, Availability, Intake, Confirm), got ${capturedPayloads.length}`);
  }

  const last = capturedPayloads[capturedPayloads.length - 1];
  if (last.packageId !== 'quick' || last.total !== 40 || last.intake !== 'serious, feelBetter' || last.weekdayAvailability !== 'Evening, Morning' || last.weekendAvailability !== 'Morning') {
    throw new Error(`Unexpected final payload: ${JSON.stringify(last)}`);
  }
  // localhost must never be tagged as prod, that would write test bookings into the real
  // Prod Bookings tab instead of Dev Bookings.
  if (!capturedPayloads.every(p => p.environment === 'dev')) {
    throw new Error(`Expected every payload to carry environment: 'dev' on localhost, got: ${JSON.stringify(capturedPayloads.map(p => p.environment))}`);
  }
  if (!capturedPayloads.every(p => p.hostname === 'localhost')) {
    throw new Error(`Expected every payload to carry hostname: 'localhost', got: ${JSON.stringify(capturedPayloads.map(p => p.hostname))}`);
  }
  const distinctSessionIds = new Set(capturedPayloads.map(p => p.sessionId));
  if (distinctSessionIds.size !== 1) {
    throw new Error(`Expected one sessionId across all progressive submissions, got ${distinctSessionIds.size}`);
  }

  console.log(`PASS: submitted ${capturedPayloads.length} progressive updates sharing one sessionId; final payload correct`);
} finally {
  await browser.close();
}
