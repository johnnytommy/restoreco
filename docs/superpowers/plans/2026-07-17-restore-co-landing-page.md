# Restore Co. Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page marketing/booking site for Restore Co. (dating-profile confidence coaching, run by Deja Powell and Johnny Thomas), with a multi-step booking modal that saves progress to a Google Sheet.

**Architecture:** Static `index.html` (Tailwind CDN, no build step) served locally via `serve.mjs`, visually verified via `screenshot.mjs` (Puppeteer). Page content (founder bios, testimonials) and booking logic (pricing, session id, payload shape) live in small ES modules (`content.js`, `booking.js`) so they're independently unit-testable with Node's built-in test runner; `app.js` wires them to the DOM. Booking submissions POST directly from the browser to a Google Apps Script Web App that upserts rows into a Google Sheet — no backend hosted by us.

**Tech Stack:** Plain HTML/CSS/JS (ES modules), Tailwind CSS via CDN, Google Fonts (Fraunces + Inter), Puppeteer (dev-only, screenshots), Node's built-in `node:test` runner, Google Apps Script + Google Sheets.

## Global Constraints

- Project root: `OneDrive - Endeavor\Desktop\Project Restore Co` (already created, git-initialized).
- Palette: cream `#FBF6EF`, ink `#241F1C`, terracotta `#C1552C`, terracotta-dark `#9C4222` — mapped to Tailwind theme colors `cream` / `ink` / `terracotta` / `terracotta-dark`. Never use default Tailwind blue/indigo.
- Type: display face **Fraunces** for headlines/pull-quotes (Tailwind `font-display`), body face **Inter** for UI/body copy (Tailwind `font-sans`), loaded via Google Fonts `<link>` tags. Never pair the same font for both roles.
- Tailwind loaded via CDN: `<script src="https://cdn.tailwindcss.com"></script>`, no bundler/build step.
- Placeholder images via `https://placehold.co/WIDTHxHEIGHT/BGHEX/FGHEX?text=Label`, using cream/ink/terracotta tones (not Tailwind defaults).
- Animate only `transform`/`opacity`; spring easing `cubic-bezier(0.34, 1.56, 0.64, 1)` (CSS var `--ease-spring`); never `transition-all`.
- Every clickable element gets hover, focus-visible, and active states — enforced via a shared `.interactive` utility class.
- `localStorage` key for the booking session id: `restoreco_session_id`.
- Booking POSTs go to a `SHEETS_WEBAPP_URL` constant at the top of `app.js`. It stays as the literal placeholder string `'PASTE_YOUR_APPS_SCRIPT_DEPLOYMENT_URL_HERE'` until the user completes the manual Google Sheets setup in Task 9 — this is an intentional external-config seam, not unfinished code.
- Never run Bash commands with a permission prompt — run them directly (per the carried-over OTGC CLAUDE.md convention). Never push to a remote without the user explicitly asking. Never force-push.
- Unit tests for pure logic (`booking.js`, `content.js`) use Node's built-in test runner (`node --test`, package.json has `"type": "module"`). Rendering/interaction checks use small Puppeteer scripts under `tests/dom/`, run against `serve.mjs` on `http://localhost:3000`.
- No real Stripe/payment processing, no gift-purchase flow, no calendar conflict-checking, no multi-page routing — all explicitly out of scope for v0 per the spec.

---

### Task 1: Project scaffolding & dev tooling

**Files:**
- Create: `package.json`
- Create: `serve.mjs`
- Create: `screenshot.mjs`
- Create: `.gitignore`
- Create: `CLAUDE.md`
- Create: `brand_assets/README.md`
- Create: `index.html` (placeholder, replaced fully in Task 4)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a working local dev loop — `node serve.mjs` serves the project root at `http://localhost:3000`, `node screenshot.mjs <url> [label]` saves a PNG to `./temporary screenshots/`. Every later task's verification step depends on this.

- [ ] **Step 1: Create `package.json`**

```json
{
  "type": "module",
  "scripts": {
    "test": "node --test"
  },
  "dependencies": {
    "puppeteer": "^24.40.0"
  }
}
```

- [ ] **Step 2: Create `serve.mjs`**

```js
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = join(__dirname, urlPath);

  try {
    const data = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Restore Co. dev server → http://localhost:${PORT}`);
});
```

- [ ] **Step 3: Create `screenshot.mjs`**

```js
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
```

(This is the OTGC `screenshot.mjs` plus one addition: a 4th CLI arg for viewport size, e.g. `node screenshot.mjs http://localhost:3000 mobile 390x844`, defaulting to `1440x900` — needed for the mobile-responsive QA pass in Task 10.)

- [ ] **Step 4: Create `.gitignore`**

```
.env
node_modules/
temporary screenshots/
```

- [ ] **Step 5: Create `brand_assets/README.md`**

```markdown
# Brand Assets

Drop real logos, founder photos, and before/after screenshots here when
they're ready. Until then, the site uses `placehold.co` placeholders
everywhere a real image will eventually go.
```

- [ ] **Step 6: Create `CLAUDE.md`**

```markdown
# CLAUDE.md — Frontend Website Rules

## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

## Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
- If no reference image: design from scratch with high craft (see guardrails below).
- Screenshot your output, compare against reference, fix mismatches, re-screenshot. Do at least 2 comparison rounds. Stop only when no visible differences remain or user says so.

## Local Server
- **Always serve on localhost** — never screenshot a `file:///` URL.
- Start the dev server: `node serve.mjs` (serves the project root at `http://localhost:3000`)
- `serve.mjs` lives in the project root. Start it in the background before taking any screenshots.
- If the server is already running, do not start a second instance.

## Screenshot Workflow
- Puppeteer is installed locally via `npm install puppeteer` in the project root.
- **Always screenshot from localhost:** `node screenshot.mjs http://localhost:3000`
- Screenshots are saved automatically to `./temporary screenshots/screenshot-N.png` (auto-incremented, never overwritten).
- Optional label suffix: `node screenshot.mjs http://localhost:3000 label` → saves as `screenshot-N-label.png`
- Optional viewport override: `node screenshot.mjs http://localhost:3000 label WIDTHxHEIGHT` (defaults to `1440x900`).
- `screenshot.mjs` lives in the project root. Use it as-is.
- After screenshotting, read the PNG from `temporary screenshots/` with the Read tool — Claude can see and analyze the image directly.
- When comparing, be specific: "heading is 32px but reference shows ~24px", "card gap is 16px but should be 24px"
- Check: spacing/padding, font size/weight/line-height, colors (exact hex), alignment, border-radius, shadows, image sizing

## Proactive Screenshots
- **Take a screenshot after every meaningful code change** — do not wait to be asked.
- After any edit to `index.html` or any frontend file, immediately run the screenshot command, read the result, and report what you see.
- If something looks wrong in the screenshot, fix it and re-screenshot before telling the user — arrive with a solution, not a problem.
- Always show the user what the current state looks like at the start of a new design session.
- Do not prompt the user to approve bash commands for screenshots - do not wait to be asked.

## Output Defaults
- Single `index.html` file for markup, all Tailwind classes inline. Page content (`content.js`) and booking logic (`booking.js`) live in their own small ES modules so they can be unit-tested with `node --test` — `app.js` wires them into the DOM. This is the one deliberate deviation from "single file"; do not further split beyond this structure.
- Tailwind CSS via CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- Placeholder images: `https://placehold.co/WIDTHxHEIGHT/BGHEX/FGHEX?text=Label` using the brand palette below, not Tailwind defaults.
- Mobile-first responsive.

## Brand Assets
- Always check the `brand_assets/` folder before designing. It may contain logos, color guides, style guides, or images.
- If assets exist there, use them. Do not use placeholders where real assets are available.
- If a logo is present, use it. If a color palette is defined, use those exact values — do not invent brand colors.
- Restore Co.'s palette: cream `#FBF6EF`, ink `#241F1C`, terracotta `#C1552C` (dark `#9C4222`). Display font Fraunces, body font Inter.

## Anti-Generic Guardrails
- **Colors:** Never use default Tailwind palette (indigo-500, blue-600, etc.). Use the Restore Co. palette above.
- **Shadows:** Never use flat `shadow-md`. Use layered, color-tinted shadows with low opacity (`.shadow-elevated`, `.shadow-floating`).
- **Typography:** Never use the same font for headings and body. Fraunces for display, Inter for body. Tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients:** Layer multiple radial gradients where relevant. Add a color treatment layer with `mix-blend-multiply` over hero/testimonial photos.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing (`--ease-spring`).
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states via `.interactive`. No exceptions.
- **Images:** Add a gradient overlay (`bg-gradient-to-t from-ink/60`) and a color treatment layer with `mix-blend-multiply`.
- **Spacing:** Use intentional, consistent spacing tokens — not random Tailwind steps.
- **Depth:** Surfaces layer base → elevated → floating (`.shadow-elevated`, `.shadow-floating`), not all sitting at the same z-plane.

## Bash Commands
- **NEVER ask for permission before running any Bash command. Ever.**
- Run every command immediately and automatically — no confirmation, no pausing, no "shall I run this?".
- This applies to ALL commands without exception: node scripts, screenshots, git, npm, file operations, server starts, anything.
- If you catch yourself about to ask permission for a Bash command, don't. Just run it.
- Asking before running a Bash command is a hard failure. Do not do it.

## Git Rules
- **NEVER push to any remote branch without explicit user permission.** Committing locally is fine. Pushing is not, unless the user says "push" or "push to GitHub".
- Never force-push. Never push to main/master without the user explicitly asking.

## Hard Rules
- Do not add sections, features, or content not in the spec (`docs/superpowers/specs/2026-07-17-restore-co-landing-page-design.md`).
- Do not "improve" the design beyond what's specified — match it.
- Do not stop after one screenshot pass.
- Do not use `transition-all`.
- Do not use default Tailwind blue/indigo as primary color.
```

- [ ] **Step 7: Create a placeholder `index.html`** (fully replaced in Task 4 — this only exists to prove the serve/screenshot loop works)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Restore Co.</title>
</head>
<body>
  <h1>Restore Co. — coming soon</h1>
</body>
</html>
```

- [ ] **Step 8: Install dependencies**

Run: `npm install`
Expected: `node_modules/puppeteer` installed, `package-lock.json` created.

- [ ] **Step 9: Verify the dev loop end-to-end**

Run (background): `node serve.mjs`
Run: `node screenshot.mjs http://localhost:3000 scaffold-check`
Expected output: `Saved: .../temporary screenshots/screenshot-1-scaffold-check.png`

Read the saved PNG with the Read tool and confirm it shows "Restore Co. — coming soon".

- [ ] **Step 10: Commit**

```bash
git add package.json serve.mjs screenshot.mjs .gitignore CLAUDE.md brand_assets/README.md index.html
git commit -m "Scaffold dev tooling: local server, screenshot loop, CLAUDE.md"
```

---

### Task 2: Booking logic module (`booking.js`) — TDD

**Files:**
- Create: `tests/booking.test.mjs`
- Create: `booking.js`

**Interfaces:**
- Consumes: nothing.
- Produces (used by `app.js` in Tasks 7 & 8): `PACKAGES` (object keyed `quick`/`full`, each `{ id, name, price, description, sessionLength, slotMinutes }`), `ADDON` (`{ id, name, price, description }`), `INTAKE_OPTIONS` (array of `{ id, label }`), `DAY_PARTS` (array of strings), `calculateTotal(packageId, addonEnabled) -> number`, `getSlotMinutes(packageId) -> number`, `generateSessionId() -> string`, `buildSheetPayload(state) -> object`.

- [ ] **Step 1: Write the failing test**

Create `tests/booking.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTotal,
  getSlotMinutes,
  generateSessionId,
  buildSheetPayload,
  PACKAGES,
} from '../booking.js';

test('calculateTotal returns package price with no add-on', () => {
  assert.equal(calculateTotal('quick', false), 40);
  assert.equal(calculateTotal('full', false), 75);
});

test('calculateTotal adds the phone consultation add-on', () => {
  assert.equal(calculateTotal('quick', true), 49);
  assert.equal(calculateTotal('full', true), 84);
});

test('calculateTotal throws on an unknown package', () => {
  assert.throws(() => calculateTotal('deluxe', false));
});

test('getSlotMinutes matches package slot length', () => {
  assert.equal(getSlotMinutes('quick'), 20);
  assert.equal(getSlotMinutes('full'), 45);
});

test('generateSessionId returns a well-formed UUID', () => {
  const id = generateSessionId();
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
});

test('buildSheetPayload computes the total and carries all fields', () => {
  const payload = buildSheetPayload({
    sessionId: 'abc-123',
    firstName: 'Jamie',
    lastName: 'Rivera',
    neighborhood: 'Fishtown',
    packageId: 'full',
    addonEnabled: true,
    date: '2026-08-01',
    dayPart: 'Evening',
    intake: 'serious',
  });
  assert.equal(payload.total, 84);
  assert.equal(payload.packageName, PACKAGES.full.name);
  assert.equal(payload.sessionId, 'abc-123');
  assert.ok(payload.submittedAt);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/booking.test.mjs`
Expected: FAIL — `Cannot find module '../booking.js'`

- [ ] **Step 3: Write `booking.js`**

```js
export const PACKAGES = {
  quick: {
    id: 'quick',
    name: 'Quick Shoot',
    price: 40,
    description: 'Single outfit, 1–2 profile-ready photos',
    sessionLength: '10–20 min session',
    slotMinutes: 20,
  },
  full: {
    id: 'full',
    name: 'Full Makeover',
    price: 75,
    description: 'Multiple outfits, full profile photo set',
    sessionLength: 'Includes a back-and-forth conversation before the session',
    slotMinutes: 45,
  },
};

export const ADDON = {
  id: 'phoneConsult',
  name: 'Phone Consultation',
  price: 9,
  description: 'Pre-session call to align on outfit and pose choices',
};

export const INTAKE_OPTIONS = [
  { id: 'casual', label: 'Something casual' },
  { id: 'serious', label: 'Something serious' },
  { id: 'moreOptions', label: 'More options in general' },
  { id: 'gram', label: "Just want better photos for the 'gram" },
];

export const DAY_PARTS = ['Morning', 'Afternoon', 'Evening'];

export function calculateTotal(packageId, addonEnabled) {
  const pkg = PACKAGES[packageId];
  if (!pkg) throw new Error(`Unknown package: ${packageId}`);
  return pkg.price + (addonEnabled ? ADDON.price : 0);
}

export function getSlotMinutes(packageId) {
  const pkg = PACKAGES[packageId];
  if (!pkg) throw new Error(`Unknown package: ${packageId}`);
  return pkg.slotMinutes;
}

export function generateSessionId() {
  return crypto.randomUUID();
}

export function buildSheetPayload(state) {
  const pkg = PACKAGES[state.packageId];
  return {
    sessionId: state.sessionId,
    firstName: state.firstName || '',
    lastName: state.lastName || '',
    neighborhood: state.neighborhood || '',
    packageId: state.packageId || '',
    packageName: pkg ? pkg.name : '',
    addonEnabled: Boolean(state.addonEnabled),
    total: state.packageId ? calculateTotal(state.packageId, state.addonEnabled) : 0,
    date: state.date || '',
    dayPart: state.dayPart || '',
    intake: state.intake || '',
    submittedAt: new Date().toISOString(),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/booking.test.mjs`
Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add booking.js tests/booking.test.mjs
git commit -m "Add booking logic module with unit tests"
```

---

### Task 3: Content data module (`content.js`) — TDD

**Files:**
- Create: `tests/content.test.mjs`
- Create: `content.js`

**Interfaces:**
- Consumes: nothing.
- Produces (used by `app.js` in Tasks 5 & 6): `FOUNDERS` (array of `{ id, name, photo, bio }`, exactly 2 entries), `TESTIMONIALS` (array of `{ id, before, after }`, starts with 3 entries).

- [ ] **Step 1: Write the failing test**

Create `tests/content.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOUNDERS, TESTIMONIALS } from '../content.js';

test('FOUNDERS has exactly Deja Powell and Johnny Thomas', () => {
  assert.equal(FOUNDERS.length, 2);
  const names = FOUNDERS.map(f => f.name);
  assert.ok(names.includes('Deja Powell'));
  assert.ok(names.includes('Johnny Thomas'));
});

test('every founder has an id, name, photo, and bio', () => {
  for (const founder of FOUNDERS) {
    assert.ok(founder.id);
    assert.ok(founder.name);
    assert.ok(founder.photo);
    assert.ok(founder.bio);
  }
});

test('TESTIMONIALS starts with 3 before/after entries', () => {
  assert.equal(TESTIMONIALS.length, 3);
  for (const t of TESTIMONIALS) {
    assert.ok(t.id);
    assert.ok(t.before);
    assert.ok(t.after);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/content.test.mjs`
Expected: FAIL — `Cannot find module '../content.js'`

- [ ] **Step 3: Write `content.js`**

```js
export const FOUNDERS = [
  {
    id: 'deja-powell',
    name: 'Deja Powell',
    photo: 'https://placehold.co/480x480/FBF6EF/241F1C?text=Deja+Powell',
    bio: 'Bio coming soon.',
  },
  {
    id: 'johnny-thomas',
    name: 'Johnny Thomas',
    photo: 'https://placehold.co/480x480/FBF6EF/241F1C?text=Johnny+Thomas',
    bio: 'Bio coming soon.',
  },
];

export const TESTIMONIALS = [
  {
    id: 'testimonial-1',
    before: 'https://placehold.co/480x600/241F1C/FBF6EF?text=Before',
    after: 'https://placehold.co/480x600/C1552C/FBF6EF?text=After',
  },
  {
    id: 'testimonial-2',
    before: 'https://placehold.co/480x600/241F1C/FBF6EF?text=Before',
    after: 'https://placehold.co/480x600/C1552C/FBF6EF?text=After',
  },
  {
    id: 'testimonial-3',
    before: 'https://placehold.co/480x600/241F1C/FBF6EF?text=Before',
    after: 'https://placehold.co/480x600/C1552C/FBF6EF?text=After',
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/content.test.mjs`
Expected: PASS — 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add content.js tests/content.test.mjs
git commit -m "Add founder/testimonial content module with unit tests"
```

---

### Task 4: Page shell — nav, hero, Home text block

**Files:**
- Modify: `index.html` (full rewrite, replacing the Task 1 placeholder)
- Create: `app.js`

**Interfaces:**
- Consumes: nothing yet (Tasks 5–8 extend `app.js`'s `DOMContentLoaded` handler).
- Produces: page `<head>` (Tailwind config, fonts, custom CSS incl. `.interactive`, `.shadow-elevated`, `.shadow-floating`, `--ease-spring`), nav with `.js-open-booking` trigger class, empty `<section id="about">` / `<section id="testimonials">` containers (filled in Tasks 5/6), empty `<div id="booking-modal-root"></div>` (filled in Task 7), `<script type="module" src="app.js"></script>` tag, and `app.js`'s initial `DOMContentLoaded` stub for later tasks to extend.

- [ ] **Step 1: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Restore Co. — We're here to clean up.</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            cream: '#FBF6EF',
            ink: '#241F1C',
            terracotta: '#C1552C',
            'terracotta-dark': '#9C4222',
          },
          fontFamily: {
            display: ['Fraunces', 'serif'],
            sans: ['Inter', 'sans-serif'],
          },
        },
      },
    };
  </script>
  <style>
    :root {
      --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    body { background-color: #FBF6EF; }
    .shadow-elevated {
      box-shadow: 0 8px 24px -8px rgba(36, 31, 28, 0.35), 0 2px 6px -2px rgba(36, 31, 28, 0.25);
    }
    .shadow-floating {
      box-shadow: 0 20px 48px -12px rgba(36, 31, 28, 0.4), 0 8px 16px -4px rgba(193, 85, 44, 0.25);
    }
    .interactive {
      transition: transform 200ms var(--ease-spring), opacity 200ms var(--ease-spring), background-color 200ms var(--ease-spring);
    }
    .interactive:hover { transform: translateY(-2px); }
    .interactive:active { transform: translateY(0px) scale(0.98); }
    .interactive:focus-visible {
      outline: 2px solid #C1552C;
      outline-offset: 2px;
    }
  </style>
</head>
<body class="font-sans text-ink">
  <header class="fixed top-0 inset-x-0 z-50 bg-cream/90 backdrop-blur border-b border-ink/10">
    <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
      <a href="#top" class="flex flex-col leading-none">
        <span class="font-display text-xl font-semibold text-ink">Restore Co.</span>
        <span class="font-sans text-xs text-ink/60 tracking-wide">We're here to clean up.</span>
      </a>
      <nav class="flex items-center gap-8">
        <a href="#about" class="interactive font-sans text-sm text-ink/80 hover:text-ink">About</a>
        <a href="#testimonials" class="interactive font-sans text-sm text-ink/80 hover:text-ink">Testimonials</a>
        <button class="js-open-booking interactive font-sans text-sm font-semibold bg-terracotta text-cream px-5 py-2.5 rounded-full shadow-elevated hover:bg-terracotta-dark">
          Book Now
        </button>
      </nav>
    </div>
  </header>

  <main id="top">
    <section class="pt-40 pb-24 px-6">
      <div class="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 class="font-display text-5xl md:text-6xl font-semibold text-ink tracking-tight leading-[1.05]">
            Your profile isn't the problem. It just needs a curator.
          </h1>
          <p class="mt-6 font-sans text-lg text-ink/70 leading-relaxed">
            Restore Co. helps you put your best self on display — real photos, a stronger profile, and the confidence to match.
          </p>
          <button class="js-open-booking interactive mt-8 inline-block font-sans font-semibold bg-terracotta text-cream px-8 py-4 rounded-full shadow-floating hover:bg-terracotta-dark">
            Book a Session
          </button>
        </div>
        <div class="relative">
          <img src="https://placehold.co/720x900/241F1C/FBF6EF?text=Hero+Photo" alt="" class="w-full rounded-3xl shadow-floating" />
          <div class="absolute inset-0 rounded-3xl bg-gradient-to-t from-ink/60 via-transparent to-transparent mix-blend-multiply"></div>
        </div>
      </div>
    </section>

    <section class="py-24 px-6 bg-ink text-cream">
      <div class="max-w-3xl mx-auto text-center">
        <p class="font-display text-3xl md:text-4xl leading-snug tracking-tight">
          You shouldn't feel bad about yourself for not getting matches. Your match rate is a function of your ability to curate the best parts of <em>you</em>. Let's find those and put them on display.
        </p>
      </div>
    </section>

    <section id="about" class="py-24 px-6"></section>

    <section id="testimonials" class="py-24 px-6 bg-ink/[0.03]"></section>
  </main>

  <div id="booking-modal-root"></div>

  <footer class="py-10 px-6 border-t border-ink/10">
    <div class="max-w-6xl mx-auto text-sm text-ink/50 font-sans">© 2026 Restore Co.</div>
  </footer>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write the initial `app.js` stub**

```js
document.addEventListener('DOMContentLoaded', () => {
  // Tasks 5–8 extend this: renderFounders(), renderTestimonials(), initBooking()
});
```

- [ ] **Step 3: Verify visually**

Run (background, if not already running): `node serve.mjs`
Run: `node screenshot.mjs http://localhost:3000 page-shell`

Read the resulting PNG and confirm: cream background, nav with "Restore Co." wordmark + "We're here to clean up." tagline + About/Testimonials links + terracotta "Book Now" button, hero headline in the serif display font, hero image placeholder with gradient overlay, dark "curate the best parts of you" text block beneath the hero.

- [ ] **Step 4: Commit**

```bash
git add index.html app.js
git commit -m "Add page shell: nav, hero, and Home text block"
```

---

### Task 5: About section — pull-quote, mission copy, founder bios

**Files:**
- Modify: `index.html:` the `<section id="about">` element from Task 4
- Modify: `app.js`

**Interfaces:**
- Consumes: `FOUNDERS` from `content.js` (Task 3).
- Produces: `renderFounders()` function in `app.js`, called from `DOMContentLoaded`.

- [ ] **Step 1: Fill in the About section markup**

Replace `<section id="about" class="py-24 px-6"></section>` in `index.html` with:

```html
<section id="about" class="py-24 px-6">
  <div class="max-w-3xl mx-auto text-center">
    <p class="font-display text-4xl md:text-5xl font-semibold text-ink tracking-tight leading-tight">
      "The world wanting you is great, but you wanting you is better."
    </p>
    <div class="mt-10 font-sans text-lg text-ink/70 leading-relaxed text-left space-y-6">
      <p>Our mission is to help men and women see themselves in a positive light — and build a confidence that holds up no matter how the world responds. Dating apps aren't the problem. Hating your experience on one is common, and for a lot of guys especially, a string of no's starts to feel personal. It isn't. Every app runs on an algorithm, and once you understand the rules, the picture changes.</p>
      <p>Over time, you'll find the greatest reward isn't how others react — it's the confidence you carry independent of that. But we're not naive about it: not getting matches can hold that confidence back before it even gets a chance to start. That's the hump we're here to help you get over, so you can be released from what's been holding you down.</p>
    </div>
  </div>

  <div id="founders-grid" class="mt-20 max-w-4xl mx-auto grid sm:grid-cols-2 gap-10"></div>
</section>
```

- [ ] **Step 2: Add `renderFounders()` to `app.js`**

```js
import { FOUNDERS } from './content.js';

function renderFounders() {
  const grid = document.getElementById('founders-grid');
  grid.innerHTML = FOUNDERS.map(founder => `
    <div class="bg-cream rounded-3xl shadow-elevated p-6 text-center">
      <img src="${founder.photo}" alt="${founder.name}" class="w-full aspect-square object-cover rounded-2xl shadow-elevated" />
      <h3 class="mt-4 font-display text-xl font-semibold text-ink">${founder.name}</h3>
      <p class="mt-2 font-sans text-sm text-ink/60">${founder.bio}</p>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderFounders();
});
```

(This replaces the Task 4 stub `DOMContentLoaded` block entirely.)

- [ ] **Step 3: Write a Puppeteer smoke check**

Create `tests/dom/about.mjs`:

```js
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

const cardCount = await page.$$eval('#founders-grid > div', els => els.length);
if (cardCount !== 2) {
  throw new Error(`Expected 2 founder cards, found ${cardCount}`);
}

const names = await page.$$eval('#founders-grid h3', els => els.map(el => el.textContent));
if (!names.includes('Deja Powell') || !names.includes('Johnny Thomas')) {
  throw new Error(`Expected Deja Powell and Johnny Thomas, found: ${names.join(', ')}`);
}

console.log('PASS: About section renders both founder cards');
await browser.close();
```

- [ ] **Step 4: Run the check**

Run (background, if not already running): `node serve.mjs`
Run: `node tests/dom/about.mjs`
Expected: `PASS: About section renders both founder cards`

- [ ] **Step 5: Screenshot and visually verify**

Run: `node screenshot.mjs http://localhost:3000 about-section`

Read the PNG and confirm: large pull-quote in the display font, mission paragraphs below it, two founder cards with placeholder photos and names.

- [ ] **Step 6: Commit**

```bash
git add index.html app.js tests/dom/about.mjs
git commit -m "Add About section: pull-quote, mission copy, founder bios"
```

---

### Task 6: Testimonials section

**Files:**
- Modify: `index.html:` the `<section id="testimonials">` element from Task 4
- Modify: `app.js`

**Interfaces:**
- Consumes: `TESTIMONIALS` from `content.js` (Task 3).
- Produces: `renderTestimonials()` function in `app.js`, called from `DOMContentLoaded`.

- [ ] **Step 1: Fill in the Testimonials section markup**

Replace `<section id="testimonials" class="py-24 px-6 bg-ink/[0.03]"></section>` in `index.html` with:

```html
<section id="testimonials" class="py-24 px-6 bg-ink/[0.03]">
  <div class="max-w-5xl mx-auto text-center">
    <h2 class="font-display text-3xl md:text-4xl font-semibold text-ink tracking-tight">See the difference</h2>
  </div>
  <div id="testimonials-grid" class="mt-14 max-w-5xl mx-auto grid md:grid-cols-3 gap-8"></div>
</section>
```

- [ ] **Step 2: Add `renderTestimonials()` to `app.js`**

```js
import { FOUNDERS, TESTIMONIALS } from './content.js';

function renderFounders() {
  const grid = document.getElementById('founders-grid');
  grid.innerHTML = FOUNDERS.map(founder => `
    <div class="bg-cream rounded-3xl shadow-elevated p-6 text-center">
      <img src="${founder.photo}" alt="${founder.name}" class="w-full aspect-square object-cover rounded-2xl shadow-elevated" />
      <h3 class="mt-4 font-display text-xl font-semibold text-ink">${founder.name}</h3>
      <p class="mt-2 font-sans text-sm text-ink/60">${founder.bio}</p>
    </div>
  `).join('');
}

function renderTestimonials() {
  const grid = document.getElementById('testimonials-grid');
  grid.innerHTML = TESTIMONIALS.map(t => `
    <div class="bg-cream rounded-3xl shadow-elevated overflow-hidden">
      <div class="grid grid-cols-2">
        <div class="relative">
          <img src="${t.before}" alt="Before" class="w-full h-full object-cover" />
          <span class="absolute bottom-2 left-2 text-xs font-sans font-semibold bg-ink/80 text-cream px-2 py-1 rounded-full">Before</span>
        </div>
        <div class="relative">
          <img src="${t.after}" alt="After" class="w-full h-full object-cover" />
          <span class="absolute bottom-2 left-2 text-xs font-sans font-semibold bg-terracotta text-cream px-2 py-1 rounded-full">After</span>
        </div>
      </div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderFounders();
  renderTestimonials();
});
```

- [ ] **Step 3: Write a Puppeteer smoke check**

Create `tests/dom/testimonials.mjs`:

```js
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
```

- [ ] **Step 4: Run the check**

Run: `node tests/dom/testimonials.mjs`
Expected: `PASS: Testimonials section renders 3 before/after cards`

- [ ] **Step 5: Screenshot and visually verify**

Run: `node screenshot.mjs http://localhost:3000 testimonials-section`

Read the PNG and confirm: 3 side-by-side Before/After cards with labeled placeholder images.

- [ ] **Step 6: Commit**

```bash
git add index.html app.js tests/dom/testimonials.mjs
git commit -m "Add Testimonials section rendered from content array"
```

---

### Task 7: Booking modal — shell, Contact step, Package step with live price tally

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: `PACKAGES`, `ADDON`, `calculateTotal`, `generateSessionId`, `buildSheetPayload` from `booking.js` (Task 2).
- Produces: `bookingState` object, `getOrCreateSessionId()`, `renderModalShell()`, `renderContactStep()`, `renderPackageStep()`, `updatePriceTally()`, `goToStep(name)`, `submitProgress()`, `openModal()`, `closeModal()`, `initBooking()` — called from `DOMContentLoaded`. `SHEETS_WEBAPP_URL` constant added at the top of `app.js`. Tasks 8 extends `initBooking()` with the remaining steps.

- [ ] **Step 1: Add the booking modal code to `app.js`**

Add to the top of `app.js` (alongside the existing `content.js` import):

```js
import { PACKAGES, ADDON, calculateTotal, generateSessionId, buildSheetPayload } from './booking.js';

const SHEETS_WEBAPP_URL = 'PASTE_YOUR_APPS_SCRIPT_DEPLOYMENT_URL_HERE'; // see google-apps-script/SETUP.md

const bookingState = {
  sessionId: null,
  firstName: '',
  lastName: '',
  neighborhood: '',
  packageId: '',
  addonEnabled: false,
  date: '',
  dayPart: '',
  intake: '',
};

const STEP_IDS = ['contact', 'package', 'schedule', 'intake', 'confirm'];

function getOrCreateSessionId() {
  let id = localStorage.getItem('restoreco_session_id');
  if (!id) {
    id = generateSessionId();
    localStorage.setItem('restoreco_session_id', id);
  }
  return id;
}

function goToStep(name) {
  STEP_IDS.forEach(id => {
    const el = document.getElementById(`booking-step-${id}`);
    if (el) el.classList.toggle('hidden', id !== name);
  });
}

async function submitProgress() {
  const payload = buildSheetPayload(bookingState);
  try {
    await fetch(SHEETS_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Restore Co: failed to save booking progress', err);
  }
}

function renderModalShell() {
  document.getElementById('booking-modal-root').innerHTML = `
    <div id="booking-modal-overlay" class="fixed inset-0 z-[100] hidden items-center justify-center bg-ink/60 p-4">
      <div class="relative w-full max-w-lg bg-cream rounded-3xl shadow-floating p-8 max-h-[90vh] overflow-y-auto">
        <button id="close-booking-modal" class="interactive absolute top-4 right-4 text-ink/50 hover:text-ink" aria-label="Close">✕</button>
        <div id="booking-step-contact" class="booking-step"></div>
        <div id="booking-step-package" class="booking-step hidden"></div>
        <div id="booking-step-schedule" class="booking-step hidden"></div>
        <div id="booking-step-intake" class="booking-step hidden"></div>
        <div id="booking-step-confirm" class="booking-step hidden"></div>
      </div>
    </div>
  `;
}

function renderContactStep() {
  document.getElementById('booking-step-contact').innerHTML = `
    <h2 class="font-display text-2xl font-semibold text-ink">Let's start with you</h2>
    <div class="mt-6 space-y-4">
      <input id="input-firstName" type="text" placeholder="First name" class="interactive w-full border border-ink/20 rounded-xl px-4 py-3 font-sans focus-visible:outline focus-visible:outline-2 focus-visible:outline-terracotta" />
      <input id="input-lastName" type="text" placeholder="Last name" class="interactive w-full border border-ink/20 rounded-xl px-4 py-3 font-sans focus-visible:outline focus-visible:outline-2 focus-visible:outline-terracotta" />
      <input id="input-neighborhood" type="text" placeholder="Neighborhood" class="interactive w-full border border-ink/20 rounded-xl px-4 py-3 font-sans focus-visible:outline focus-visible:outline-2 focus-visible:outline-terracotta" />
    </div>
    <button id="contact-next" class="interactive mt-8 w-full bg-terracotta text-cream font-sans font-semibold py-3 rounded-full shadow-elevated hover:bg-terracotta-dark">Next</button>
  `;
  document.getElementById('contact-next').addEventListener('click', () => {
    bookingState.firstName = document.getElementById('input-firstName').value.trim();
    bookingState.lastName = document.getElementById('input-lastName').value.trim();
    bookingState.neighborhood = document.getElementById('input-neighborhood').value.trim();
    submitProgress();
    goToStep('package');
  });
}

function updatePriceTally() {
  if (!bookingState.packageId) return;
  const total = calculateTotal(bookingState.packageId, bookingState.addonEnabled);
  document.getElementById('price-tally').textContent = `$${total}`;
}

function renderPackageStep() {
  const el = document.getElementById('booking-step-package');
  el.innerHTML = `
    <h2 class="font-display text-2xl font-semibold text-ink">Choose your package</h2>
    <div class="mt-6 space-y-4">
      ${Object.values(PACKAGES).map(pkg => `
        <label class="interactive block border-2 border-ink/15 rounded-2xl p-4 cursor-pointer package-option" data-package-id="${pkg.id}">
          <div class="flex items-center justify-between">
            <span class="font-sans font-semibold text-ink">${pkg.name}</span>
            <span class="font-sans font-semibold text-terracotta">$${pkg.price}</span>
          </div>
          <p class="mt-1 font-sans text-sm text-ink/60">${pkg.description} — ${pkg.sessionLength}</p>
        </label>
      `).join('')}
    </div>
    <label class="interactive mt-4 flex items-center gap-2 border border-ink/15 rounded-2xl p-4 cursor-pointer">
      <input type="checkbox" id="addon-toggle" />
      <span class="font-sans text-sm text-ink">${ADDON.name} (+$${ADDON.price}) — ${ADDON.description}</span>
    </label>
    <p class="mt-4 font-sans text-xs text-ink/50">All shoots are done on film. We recommend most of your actual app-slot photos still come from your phone.</p>
    <div class="mt-6 flex items-center justify-between font-display text-xl font-semibold text-ink">
      <span>Total</span>
      <span id="price-tally">$0</span>
    </div>
    <button id="package-next" disabled class="interactive mt-6 w-full bg-terracotta text-cream font-sans font-semibold py-3 rounded-full shadow-elevated hover:bg-terracotta-dark disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
  `;

  el.querySelectorAll('.package-option').forEach(label => {
    label.addEventListener('click', () => {
      bookingState.packageId = label.dataset.packageId;
      el.querySelectorAll('.package-option').forEach(l => l.classList.remove('border-terracotta'));
      label.classList.add('border-terracotta');
      updatePriceTally();
      document.getElementById('package-next').disabled = false;
    });
  });

  document.getElementById('addon-toggle').addEventListener('change', (e) => {
    bookingState.addonEnabled = e.target.checked;
    updatePriceTally();
  });

  document.getElementById('package-next').addEventListener('click', () => {
    submitProgress();
    goToStep('schedule');
  });
}

function openModal() {
  const overlay = document.getElementById('booking-modal-overlay');
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  goToStep('contact');
}

function closeModal() {
  const overlay = document.getElementById('booking-modal-overlay');
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');
}

function initBooking() {
  bookingState.sessionId = getOrCreateSessionId();
  renderModalShell();
  renderContactStep();
  renderPackageStep();
  document.querySelectorAll('.js-open-booking').forEach(btn => btn.addEventListener('click', openModal));
  document.getElementById('close-booking-modal').addEventListener('click', closeModal);
}
```

Update the `DOMContentLoaded` handler at the bottom of `app.js` to:

```js
document.addEventListener('DOMContentLoaded', () => {
  renderFounders();
  renderTestimonials();
  initBooking();
});
```

- [ ] **Step 2: Write a Puppeteer smoke check for the price tally**

Create `tests/dom/modal-tally.mjs`:

```js
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

const tally = await page.$eval('#price-tally', el => el.textContent);
if (tally !== '$84') {
  throw new Error(`Expected tally of $84 (Full Makeover $75 + add-on $9), got ${tally}`);
}

console.log('PASS: price tally reflects Full Makeover + Phone Consultation add-on');
await browser.close();
```

- [ ] **Step 3: Run the check**

Run: `node tests/dom/modal-tally.mjs`
Expected: `PASS: price tally reflects Full Makeover + Phone Consultation add-on`

- [ ] **Step 4: Screenshot and visually verify**

Run: `node screenshot.mjs http://localhost:3000 modal-package-step`

Read the PNG and confirm: modal is centered, dark overlay behind it, package cards with the terracotta highlight on the selected one, add-on checkbox row, live price tally, "Next" button.

- [ ] **Step 5: Commit**

```bash
git add app.js tests/dom/modal-tally.mjs
git commit -m "Add booking modal shell, Contact and Package steps with live price tally"
```

---

### Task 8: Booking modal — Schedule, Intake, Confirm steps + submission wiring

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: `DAY_PARTS`, `INTAKE_OPTIONS`, `PACKAGES`, `ADDON`, `calculateTotal` from `booking.js`; `goToStep`, `submitProgress`, `bookingState` from Task 7.
- Produces: `renderScheduleStep()`, `renderIntakeStep()`, `renderConfirmStep()`, wired into `initBooking()`.

- [ ] **Step 1: Add the remaining steps to `app.js`**

Update the `booking.js` import line to include the two new names:

```js
import { PACKAGES, ADDON, DAY_PARTS, INTAKE_OPTIONS, calculateTotal, getSlotMinutes, generateSessionId, buildSheetPayload } from './booking.js';
```

Add these functions (anywhere after `renderPackageStep`, before `initBooking`):

```js
function renderScheduleStep() {
  const el = document.getElementById('booking-step-schedule');
  const pkg = PACKAGES[bookingState.packageId];
  el.innerHTML = `
    <h2 class="font-display text-2xl font-semibold text-ink">Pick a date</h2>
    <p class="mt-1 font-sans text-sm text-ink/60">${pkg ? `Your ${pkg.name} session runs about ${getSlotMinutes(bookingState.packageId)} minutes.` : ''}</p>
    <input id="input-date" type="date" class="interactive mt-6 w-full border border-ink/20 rounded-xl px-4 py-3 font-sans" />
    <div class="mt-6 grid grid-cols-3 gap-3">
      ${DAY_PARTS.map(part => `
        <button type="button" class="daypart-option interactive border-2 border-ink/15 rounded-xl py-3 font-sans text-sm" data-day-part="${part}">${part}</button>
      `).join('')}
    </div>
    <p class="mt-4 font-sans text-xs text-ink/50">This is your preferred window — we'll follow up to confirm your exact time.</p>
    <button id="schedule-next" disabled class="interactive mt-8 w-full bg-terracotta text-cream font-sans font-semibold py-3 rounded-full shadow-elevated hover:bg-terracotta-dark disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
  `;

  function checkScheduleValid() {
    document.getElementById('schedule-next').disabled = !(bookingState.date && bookingState.dayPart);
  }

  el.querySelectorAll('.daypart-option').forEach(btn => {
    btn.addEventListener('click', () => {
      bookingState.dayPart = btn.dataset.dayPart;
      el.querySelectorAll('.daypart-option').forEach(b => b.classList.remove('border-terracotta'));
      btn.classList.add('border-terracotta');
      checkScheduleValid();
    });
  });

  document.getElementById('input-date').addEventListener('change', (e) => {
    bookingState.date = e.target.value;
    checkScheduleValid();
  });

  document.getElementById('schedule-next').addEventListener('click', () => {
    submitProgress();
    goToStep('intake');
  });
}

function renderIntakeStep() {
  const el = document.getElementById('booking-step-intake');
  el.innerHTML = `
    <h2 class="font-display text-2xl font-semibold text-ink">What are you hoping to get out of this?</h2>
    <div class="mt-6 space-y-3">
      ${INTAKE_OPTIONS.map(opt => `
        <button type="button" class="intake-option interactive block w-full text-left border-2 border-ink/15 rounded-xl px-4 py-3 font-sans text-sm" data-intake-id="${opt.id}">${opt.label}</button>
      `).join('')}
    </div>
    <button id="intake-next" disabled class="interactive mt-8 w-full bg-terracotta text-cream font-sans font-semibold py-3 rounded-full shadow-elevated hover:bg-terracotta-dark disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
  `;

  el.querySelectorAll('.intake-option').forEach(btn => {
    btn.addEventListener('click', () => {
      bookingState.intake = btn.dataset.intakeId;
      el.querySelectorAll('.intake-option').forEach(b => b.classList.remove('border-terracotta'));
      btn.classList.add('border-terracotta');
      document.getElementById('intake-next').disabled = false;
    });
  });

  document.getElementById('intake-next').addEventListener('click', () => {
    submitProgress();
    renderConfirmStep();
    goToStep('confirm');
  });
}

function renderConfirmStep() {
  const el = document.getElementById('booking-step-confirm');
  const pkg = PACKAGES[bookingState.packageId];
  const total = calculateTotal(bookingState.packageId, bookingState.addonEnabled);
  el.innerHTML = `
    <h2 class="font-display text-2xl font-semibold text-ink">You're all set</h2>
    <div class="mt-6 space-y-2 font-sans text-sm text-ink/70">
      <p>${bookingState.firstName} ${bookingState.lastName} — ${bookingState.neighborhood}</p>
      <p>${pkg.name}${bookingState.addonEnabled ? ` + ${ADDON.name}` : ''}</p>
      <p>${bookingState.date} (${bookingState.dayPart})</p>
    </div>
    <div class="mt-6 flex items-center justify-between font-display text-xl font-semibold text-ink">
      <span>Total</span>
      <span>$${total}</span>
    </div>
    <p class="mt-4 font-sans text-xs text-ink/50">We'll follow up to confirm your exact time.</p>
    <button id="confirm-submit" class="interactive mt-8 w-full bg-terracotta text-cream font-sans font-semibold py-3 rounded-full shadow-elevated hover:bg-terracotta-dark">Confirm</button>
  `;

  document.getElementById('confirm-submit').addEventListener('click', async () => {
    await submitProgress();
    el.innerHTML = `
      <h2 class="font-display text-2xl font-semibold text-ink">Thank you, ${bookingState.firstName}.</h2>
      <p class="mt-4 font-sans text-sm text-ink/70">We'll be in touch soon to lock in your session.</p>
    `;
  });
}
```

Update `initBooking()` to render the new steps too:

```js
function initBooking() {
  bookingState.sessionId = getOrCreateSessionId();
  renderModalShell();
  renderContactStep();
  renderPackageStep();
  renderScheduleStep();
  renderIntakeStep();
  document.querySelectorAll('.js-open-booking').forEach(btn => btn.addEventListener('click', openModal));
  document.getElementById('close-booking-modal').addEventListener('click', closeModal);
}
```

- [ ] **Step 2: Write a Puppeteer smoke check for the full flow**

Create `tests/dom/modal-submit.mjs`:

```js
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();

const capturedPayloads = [];
await page.exposeFunction('__captureFetch', (body) => capturedPayloads.push(JSON.parse(body)));
await page.evaluateOnNewDocument(() => {
  window.fetch = async (url, options) => {
    await window.__captureFetch(options.body);
    return new Response('{}');
  };
});

await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

await page.click('.js-open-booking');
await page.waitForSelector('#booking-step-contact:not(.hidden)');
await page.type('#input-firstName', 'Jamie');
await page.type('#input-lastName', 'Rivera');
await page.type('#input-neighborhood', 'Fishtown');
await page.click('#contact-next');

await page.waitForSelector('#booking-step-package:not(.hidden)');
await page.click('[data-package-id="quick"]');
await page.click('#package-next');

await page.waitForSelector('#booking-step-schedule:not(.hidden)');
await page.$eval('#input-date', el => {
  el.value = '2026-08-01';
  el.dispatchEvent(new Event('change', { bubbles: true }));
});
await page.click('[data-day-part="Evening"]');
await page.click('#schedule-next');

await page.waitForSelector('#booking-step-intake:not(.hidden)');
await page.click('[data-intake-id="serious"]');
await page.click('#intake-next');

await page.waitForSelector('#booking-step-confirm:not(.hidden)');
await page.click('#confirm-submit');

const last = capturedPayloads[capturedPayloads.length - 1];
if (last.packageId !== 'quick' || last.total !== 40 || last.intake !== 'serious' || last.dayPart !== 'Evening') {
  throw new Error(`Unexpected final payload: ${JSON.stringify(last)}`);
}
const distinctSessionIds = new Set(capturedPayloads.map(p => p.sessionId));
if (distinctSessionIds.size !== 1) {
  throw new Error(`Expected one sessionId across all progressive submissions, got ${distinctSessionIds.size}`);
}

console.log(`PASS: submitted ${capturedPayloads.length} progressive updates sharing one sessionId; final payload correct`);
await browser.close();
```

- [ ] **Step 3: Run the check**

Run: `node tests/dom/modal-submit.mjs`
Expected: `PASS: submitted 5 progressive updates sharing one sessionId; final payload correct`

- [ ] **Step 4: Screenshot and visually verify each remaining step**

Run: `node screenshot.mjs http://localhost:3000 modal-schedule-step`
Run: `node screenshot.mjs http://localhost:3000 modal-confirm-step`

Read both PNGs and confirm the Schedule step shows the date input + Morning/Afternoon/Evening buttons + slot-length note, and the Confirm step shows the recap + total + "We'll follow up..." copy.

- [ ] **Step 5: Commit**

```bash
git add app.js tests/dom/modal-submit.mjs
git commit -m "Add Schedule, Intake, and Confirm steps to booking modal"
```

---

### Task 9: Google Apps Script backend + setup instructions

**Files:**
- Create: `google-apps-script/Code.gs`
- Create: `google-apps-script/SETUP.md`

**Interfaces:**
- Consumes: the JSON payload shape produced by `buildSheetPayload()` in `booking.js` (Task 2) — `{ sessionId, firstName, lastName, neighborhood, packageId, packageName, addonEnabled, total, date, dayPart, intake, submittedAt }`.
- Produces: nothing consumed by other tasks — this is the external counterpart the user deploys by hand, and the URL it produces gets pasted into `app.js`'s `SHEETS_WEBAPP_URL` (Task 7) once deployed.

- [ ] **Step 1: Write `google-apps-script/Code.gs`**

```js
const SHEET_NAME = 'Bookings';
const COLUMNS = [
  'sessionId', 'firstName', 'lastName', 'neighborhood',
  'packageId', 'packageName', 'addonEnabled', 'total',
  'date', 'dayPart', 'intake', 'submittedAt',
];

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  const sessionIdCol = COLUMNS.indexOf('sessionId');

  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][sessionIdCol] === data.sessionId) {
      rowIndex = i + 1; // 1-indexed, matches getRange
      break;
    }
  }

  const rowValues = COLUMNS.map(col => (data[col] !== undefined ? data[col] : ''));

  if (rowIndex === -1) {
    sheet.appendRow(rowValues);
  } else {
    sheet.getRange(rowIndex, 1, 1, COLUMNS.length).setValues([rowValues]);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(COLUMNS);
  }
  return sheet;
}
```

- [ ] **Step 2: Write `google-apps-script/SETUP.md`**

```markdown
# Google Sheets Booking Backend Setup

Restore Co.'s booking modal saves progress by POSTing JSON straight from the
browser to a Google Apps Script Web App bound to a Google Sheet. This has to
be set up once, by hand, from a Google account you and Deja both have access
to — this part can't be done by Claude, since it needs your Google login.

## 1. Create the Sheet
1. Go to sheets.google.com and create a new spreadsheet, e.g. "Restore Co. Bookings".
2. Leave it empty — the script creates its own "Bookings" tab and header row the first time it runs.

## 2. Add the Apps Script
1. In the Sheet, go to **Extensions → Apps Script**.
2. Delete anything in the editor and paste in the contents of `google-apps-script/Code.gs` from this repo.
3. Save the project (e.g. name it "Restore Co Booking Backend").

## 3. Deploy as a Web App
1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set "Execute as" to **Me**, and "Who has access" to **Anyone**.
4. Click **Deploy**, and authorize the script when prompted (it needs permission to edit this Sheet).
5. Copy the **Web app URL** — it looks like `https://script.google.com/macros/s/XXXXXXXX/exec`.

## 4. Wire it into the site
1. Open `app.js`.
2. Replace:
   ```js
   const SHEETS_WEBAPP_URL = 'PASTE_YOUR_APPS_SCRIPT_DEPLOYMENT_URL_HERE';
   ```
   with your copied URL.
3. Reload the site and complete a test booking. Check the Sheet — a row should appear in the "Bookings" tab and update in place as you move through the modal's steps.

## Re-deploying after script edits
Any time you change `Code.gs`, go to **Deploy → Manage deployments**, edit the
existing deployment, and choose "New version" — the Web app URL stays the
same, so `app.js` doesn't need updating again.
```

- [ ] **Step 3: Commit**

```bash
git add google-apps-script/Code.gs google-apps-script/SETUP.md
git commit -m "Add Google Apps Script booking backend and setup instructions"
```

(No automated verification here — it requires the user's own Google account. Manual verification happens when they follow `SETUP.md`.)

---

### Task 10: Final visual QA pass

**Files:**
- No new files. Fixes land in `index.html` / `app.js` as needed.

**Interfaces:**
- Consumes: the full rendered page from Tasks 4–8.
- Produces: nothing new — this task is a verification/fix pass, per the CLAUDE.md screenshot workflow ("at least 2 comparison rounds").

- [ ] **Step 1: Full-page desktop screenshot**

Run: `node screenshot.mjs http://localhost:3000 full-desktop 1440x900`

Read the PNG. Check against the Global Constraints: cream/ink/terracotta palette (no default Tailwind blue/indigo), Fraunces on all headlines/pull-quotes vs. Inter on body/UI, layered shadows (`.shadow-elevated`/`.shadow-floating`, not flat `shadow-md`), photography-forward layout, rounded corners, gradient + `mix-blend-multiply` treatment on the hero image.

- [ ] **Step 2: Mobile viewport screenshot**

Run: `node screenshot.mjs http://localhost:3000 full-mobile 390x844`

Read the PNG. Check the nav, hero, About, and Testimonials sections stack correctly in a single column, text remains legible, and the "Book Now" button stays reachable without horizontal scrolling.

- [ ] **Step 3: Fix any mismatches found**

If Steps 1–2 surfaced issues (spacing, color, font, broken responsive stacking), fix them directly in `index.html`/`app.js`.

- [ ] **Step 4: Re-screenshot both viewports (2nd comparison round)**

Run: `node screenshot.mjs http://localhost:3000 full-desktop-round2 1440x900`
Run: `node screenshot.mjs http://localhost:3000 full-mobile-round2 390x844`

Read both PNGs and confirm no remaining mismatches against the Global Constraints checklist above.

- [ ] **Step 5: Run the full automated test suite one more time**

Run: `npm test`
Expected: PASS — all `booking.test.mjs` and `content.test.mjs` tests green.

Run: `node tests/dom/about.mjs && node tests/dom/testimonials.mjs && node tests/dom/modal-tally.mjs && node tests/dom/modal-submit.mjs`
Expected: all four `PASS: ...` lines print, no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Final visual QA pass: desktop/mobile screenshots, guardrail check"
```
