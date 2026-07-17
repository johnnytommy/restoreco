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
