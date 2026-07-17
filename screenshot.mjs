import { mkdir, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function getPuppeteer() {
  try {
    const { default: puppeteer } = await import('puppeteer');
    return puppeteer;
  } catch {}

  try {
    const { default: puppeteer } = await import('puppeteer-core');
    return puppeteer;
  } catch {}

  throw new Error('Puppeteer not found.\nRun: npm install puppeteer');
}

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';
const viewportArg = process.argv[4] || '1440x900';
const [width, height] = viewportArg.split('x').map(Number);

const screenshotDir = join(__dirname, 'temporary screenshots');
await mkdir(screenshotDir, { recursive: true });

const existing = await readdir(screenshotDir).catch(() => []);
const nums = existing
  .map(f => parseInt(f.match(/^screenshot-(\d+)/)?.[1] ?? '0'))
  .filter(n => !isNaN(n) && n > 0);
const next = nums.length ? Math.max(...nums) + 1 : 1;

const filename = label ? `screenshot-${next}-${label}.png` : `screenshot-${next}.png`;
const outputPath = join(screenshotDir, filename);

const puppeteer = await getPuppeteer();

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
await page.screenshot({ path: outputPath, fullPage: false });
await browser.close();

console.log(`Saved: ${outputPath}`);
