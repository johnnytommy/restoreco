# Restore Co. Landing Page — Design Spec

Date: 2026-07-17

## Purpose

A single-page marketing/booking site for Restore Co., a dating-profile makeover
consultation service run by Deja Powell and Johnny Thomas. Targets all dating
apps (not just Hinge). Core conversion goal: get visitors to book a
photoshoot/consultation session through an on-page modal.

Inspiration:
- Visual/tone reference: `Downloads/inspo.txt` (Hinge's corporate site — clean
  white space, bold rounded display type, testimonial-driven, editorial press
  layout). Palette from that reference (`#0066FF` blue, `#2e3644` navy,
  `#656565` gray) is not reused directly — Restore Co. needs its own identity
  (see Visual Design below) — but the layout confidence and heavy use of large
  photography carries over directly.
- Process/workflow reference: `Project OTGC/CLAUDE.md` — single `index.html`,
  Tailwind CDN, inline styles, `placehold.co` placeholders, local
  Puppeteer screenshot loop for iterative visual QA, anti-generic guardrails
  (custom color, layered shadows, paired display/body fonts, hover/focus/active
  states everywhere).

## Scope for v0

- Single-page static site (`index.html`), no page reloads.
- Nav: Logo · About · Testimonials · **Book Now** (button → opens modal).
- Booking modal captures leads and writes to Google Sheets (see Data Flow).
- No real payment processing yet — architected so Stripe can be dropped into
  the same modal step later without rework.
- No gift-purchase feature (mentioned as a maybe, not connected to anything
  else yet — explicitly out of scope for v0).
- No calendar/availability conflict-checking — date + day-part is a stated
  preference; Restore Co. confirms the actual time manually afterward.

## Site Structure

### Home (top of page)
The homepage's job is to route people into the other sections — it should
stay simple, not become its own long scroll. Modeled on how Hinge's homepage
uses a couple of short, text-forward blocks (big statement, minimal
supporting copy) between sections rather than dense paragraphs:

- Company tagline: **"We're here to clean up."** — used as the standing line
  under the logo/wordmark in the nav and/or directly under the hero headline.
- Hero: full-bleed hero photo placeholder with warm gradient overlay,
  headline + subhead + primary "Book Now" CTA (opens modal).
- One short text-forward section (Hinge-style energy — big line, little
  supporting copy, not a full paragraph), then a way into About/Testimonials:

  > You shouldn't feel bad about yourself for not getting matches. Your match
  > rate is a function of your ability to curate the best parts of *you*.
  > Let's find those and put them on display.

- That's the extent of Home's own content — everything else lives on
  About/Testimonials, which Home links into.

### About (anchor section)
- **Big bold pull-quote at the top** (this is the one thing most visitors will
  actually read): **"The world wanting you is great, but you wanting you is
  better."** Rendered large, tight tracking, in the display/serif face.
- Mission paragraph beneath it (existence/mission framing, not a sales pitch):

  > Our mission is to help men and women see themselves in a positive light —
  > and build a confidence that holds up no matter how the world responds.
  > Dating apps aren't the problem. Hating your experience on one is common,
  > and for a lot of guys especially, a string of no's starts to feel
  > personal. It isn't. Every app runs on an algorithm, and once you
  > understand the rules, the picture changes.
  >
  > Over time, you'll find the greatest reward isn't how others react — it's
  > the confidence you carry independent of that. But we're not naive about
  > it: not getting matches can hold that confidence back before it even gets
  > a chance to start. That's the hump we're here to help you get over, so
  > you can be released from what's been holding you down.

- Founder bio cards, placeholder image + placeholder bio text for each,
  structured as an array of objects (add a third founder later by copying one
  block):
  - Deja Powell
  - Johnny Thomas

### Testimonials (anchor section)
- Rendered from a simple array of `{ before, after }` placeholder image pairs.
  Start with 3 entries; extending to 5+ later is a copy-paste of one object.
- Each entry: side-by-side "Before / After" labeled card. No written quotes —
  the visual comparison is the testimonial.

### Book Now (modal, not a page)
Multi-step modal. See Booking Flow below.

## Booking Flow

One `sessionId` (generated client-side, persisted in `localStorage` for the
duration of the session) ties all steps together as a single upserted record.

1. **Contact** — first name, last name, neighborhood (used only to inform
   Restore Co.'s decision on shoot location — not shown to the user as a
   location picker).
2. **Package** — choose one:
   - *Quick Shoot* — $40, single outfit, 1–2 profile-ready photos, 10–20 min
     session.
   - *Full Makeover* — $75, multiple outfits, full profile photo set.
   - Add-on toggle: *Phone Consultation* (+$9) — pre-session call to align on
     outfit/pose choices.
   - Small explainer line: shoots are done on film, but most of the actual
     app-slot photos should come from mobile/iPhone shots — informs the
     choice without needing its own page.
   - Running price tally shown live as selections change.
3. **Schedule** — date picker + Morning / Afternoon / Evening preference (no
   exact time slot, no conflict-checking). Slot-length note shown per
   package: 20 min (Quick) or 45 min (Full — includes the back-and-forth
   conversation prior to the session).
4. **Intake** — single-select: "What are you hoping to get out of this?"
   - Something casual
   - Something serious
   - More options in general
   - Just want better photos for the 'gram
5. **Confirm** — recap of selections + total price, quiet copy (no "we're
   charging you" framing) along the lines of "We'll follow up to confirm your
   time," then submit.

## Data Flow / Storage

- No backend hosted by us. The static frontend POSTs directly from the
  browser to a **Google Apps Script Web App** URL bound to a Google Sheet
  that both Deja and Johnny own/can access directly.
- The Apps Script performs an **upsert**: look up the row matching
  `sessionId`; update it if found, otherwise append a new row. Each step of
  the modal fires this POST, so the Sheet always reflects the latest state of
  an in-progress or completed booking — never duplicate partial rows.
- Price tally is computed client-side from package + add-on selection and
  included as a column so the Sheet always shows the correct total.
- **Manual setup required from the user** (cannot be done by Claude — needs
  their Google account): create the Google Sheet, deploy the provided Apps
  Script as a Web App, and supply the deployment URL to be dropped into a
  config constant in `index.html`. Implementation will include the exact
  Apps Script source to paste in.
- This is the seam where Stripe gets added later: the Confirm step's price
  tally becomes a Stripe Checkout handoff; nothing else in the flow needs to
  change shape.

## Visual Design

- **Palette**: warm cream background (`~#FBF6EF`), near-black charcoal text
  (`~#241F1C`), bold burnt-terracotta accent (`~#C1552C`) for CTAs/highlights.
  Deliberately distinct from Hinge's corporate blue — warmer, more human.
- **Type**: heavy serif/display face for headlines and the About pull-quote
  (carries the "confidence" tone), clean sans for body/UI copy. Tight
  tracking on large display text, generous line-height on body copy.
- **Photography**: photos are the primary visual language, per the Hinge
  reference — large hero image, large founder photos, large before/after
  testimonial images. All placeholders for now via `placehold.co`, sized and
  positioned as real photography would be, with gradient overlay + subtle
  color treatment per the anti-generic guardrails.
- **Cards** (bios, testimonials, packages): layered, color-tinted shadows;
  rounded corners; base/elevated/floating depth system — not flat.
- **Interactive states**: every clickable element (nav links, CTAs, package
  toggles, modal steps) gets hover, focus-visible, and active states; spring-
  style easing; animate only `transform`/`opacity`.

## Explicitly Out of Scope for v0
- Real Stripe/payment processing (architected for, not built).
- Gift purchases/gifting flow.
- Calendar availability/conflict checking.
- Multi-page routing (everything lives in one `index.html`).
