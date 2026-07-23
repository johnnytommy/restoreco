# Restore Co. Landing Page — Layout & Content Revision

Date: 2026-07-22

## Purpose

Revises the page structure and copy of the shipped v0 landing page
(`docs/superpowers/specs/2026-07-17-restore-co-landing-page-design.md`) based
on Johnny's review of the live site at restoreco.vercel.app. This document
supersedes the "Site Structure" and testimonial-content parts of the original
spec; everything else there (Booking Flow, Data Flow/Storage, Visual Design
guardrails, Explicitly Out of Scope) still applies unchanged.

## Site Structure (revised order, top to bottom)

1. **Header/nav** — unchanged, except the "About" link now anchors to the
   quote+mission section specifically (see #3 below), not a combined
   section.

2. **Hero** — unchanged position and image treatment. Headline copy changes:

   > Dating app success comes down to one thing...**curation**.

   "curation" is styled to visually stand out from the rest of the line —
   terracotta accent color, bold — rather than sitting at the same weight as
   the surrounding text.

3. **Curation callout** (dark full-bleed text block, "You shouldn't feel bad
   about yourself...") — unchanged, stays exactly where it is between the
   hero and the section below.

4. **`#about` section** (nav "About" anchors here) — internal order, top to
   bottom:
   1. Small uppercase kicker label: **"Our mission"** — small, tracked-out
      text sitting above the pull-quote, not a full heading. The quote
      remains the visual focal point of the section.
   2. Big pull-quote (unchanged copy/styling from the original spec):
      **"The world wanting you is great, but you wanting you is better."**
   3. **New**: full-width photo placeholder, sitting between the quote and
      the mission paragraphs — both the quote above it and the paragraphs
      below it stay full-width/centered around it.
   4. Mission paragraphs — unchanged copy from the original spec.

   Founder bio cards are **removed from this section** — they move to their
   own section at the bottom of the page (#6).

5. **Testimonials** (`#testimonials`, unchanged anchor) — same heading
   ("See the difference") and same underlying data-driven approach
   (`TESTIMONIALS` array in `content.js`, extend by adding an object), but
   the per-entry layout and image treatment both change:

   - **Layout**: each testimonial renders as a full-width **row**, stacked
     vertically for however many entries exist (this replaces the previous
     3-column grid of small square-ish tiles). Each row is a **3-column
     layout**: old/before profile screenshot on the **left**, the written
     testimonial quote in the **middle**, new/after profile screenshot on
     the **right**.
   - **Images**: sized and proportioned like real iPhone screenshots of a
     dating-app profile — tall/portrait aspect ratio, not the small square
     crop from the original design. Placeholder images update to a portrait
     `placehold.co` size (e.g. `~390x844`, matching a phone-screenshot
     shape) instead of the previous roughly-square crop.
   - **Data shape change**: `TESTIMONIALS` entries gain a new `quote` field
     (placeholder text for now, e.g. `"Quote coming soon."`, matching the
     placeholder-bio pattern already used for founders) alongside the
     existing `before`/`after` image fields.

6. **New "Founders" section**, placed at the very bottom of the page, just
   above the footer — contains the founder bio cards (same content and
   card styling as before), just relocated out of `#about`. No nav link
   points here — reaching it is scroll-only, consistent with Johnny's
   choice not to add a second nav item.

## Content fix: founder name spelling

**"Deja Powell" → "Dejah Powell"** everywhere in `content.js` (the `name`
field, the placeholder image's `?text=` label, and the entry's internal
`id`, e.g. `deja-powell` → `dejah-powell`). This is a factual correction, not
a style choice — apply it exactly as given. The original 2026-07-17 spec
still says "Deja Powell" in its historical text; that document is left
as-is as a record of what was originally decided, since only the live
site's actual content needs the fix.

## Explicitly Out of Scope for This Revision

- No changes to the booking modal, pricing, Google Sheets data flow, or the
  prod/dev environment split — all of that is unaffected by this layout
  revision.
- No real testimonial quotes or real photos yet — still placeholders
  throughout, per the original spec's placeholder-everywhere approach.
- No new nav links (per Johnny's explicit choice: "About" only points to
  the quote+mission section; the Founders section is scroll-only).
