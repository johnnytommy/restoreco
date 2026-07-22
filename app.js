import { FOUNDERS, TESTIMONIALS } from './content.js';
import { PACKAGES, ADDON, DAY_PARTS, INTAKE_OPTIONS, calculateTotal, getSlotMinutes, generateSessionId, buildSheetPayload } from './booking.js';

// Production writes to the real Restore Co. Bookings sheet. Every other host (localhost,
// Vercel preview deployments, anything else) writes to a separate dev sheet instead, so
// local/preview testing never touches production lead data. See google-apps-script/SETUP.md.
const PROD_HOSTNAME = 'restoreco.vercel.app';
const SHEETS_WEBAPP_URL_PLACEHOLDER = 'PASTE_YOUR_DEV_APPS_SCRIPT_DEPLOYMENT_URL_HERE';
const SHEETS_WEBAPP_URL_PROD = 'https://script.google.com/macros/s/AKfycbxtUf7-zZIdCj7o8PcYgj04qJUJSP-NmR2ZVDtRXp8vIWwwZpaquh5RY9J9TChgwGZy/exec';
const SHEETS_WEBAPP_URL_DEV = SHEETS_WEBAPP_URL_PLACEHOLDER;

const isProdHost = typeof window !== 'undefined' && window.location.hostname === PROD_HOSTNAME;
// window.__RESTORECO_TEST_WEBAPP_URL__ is a test-only seam (see tests/dom/modal-submit.mjs) that lets
// smoke tests simulate a configured deployment without editing this file.
const SHEETS_WEBAPP_URL = (typeof window !== 'undefined' && window.__RESTORECO_TEST_WEBAPP_URL__) || (isProdHost ? SHEETS_WEBAPP_URL_PROD : SHEETS_WEBAPP_URL_DEV);

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
  if (SHEETS_WEBAPP_URL === SHEETS_WEBAPP_URL_PLACEHOLDER) {
    console.warn('Restore Co: SHEETS_WEBAPP_URL is still the placeholder — booking was not sent. See google-apps-script/SETUP.md.');
    return false;
  }
  const payload = buildSheetPayload(bookingState);
  try {
    await fetch(SHEETS_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (err) {
    console.error('Restore Co: failed to save booking progress', err);
    return false;
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
        <button type="button" class="interactive block w-full text-left border-2 border-ink/15 rounded-2xl p-4 cursor-pointer package-option" data-package-id="${pkg.id}">
          <div class="flex items-center justify-between">
            <span class="font-sans font-semibold text-ink">${pkg.name}</span>
            <span class="font-sans font-semibold text-terracotta">$${pkg.price}</span>
          </div>
          <p class="mt-1 font-sans text-sm text-ink/60">${pkg.description} — ${pkg.sessionLength}</p>
        </button>
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

  el.querySelectorAll('.package-option').forEach(btn => {
    btn.addEventListener('click', () => {
      bookingState.packageId = btn.dataset.packageId;
      el.querySelectorAll('.package-option').forEach(b => b.classList.remove('border-terracotta'));
      btn.classList.add('border-terracotta');
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
    renderScheduleStep();
    goToStep('schedule');
  });
}

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
    const success = await submitProgress();
    if (success) {
      // A completed booking should never share its sessionId with a future one — otherwise
      // the Apps Script backend's upsert-by-sessionId would overwrite this row on the next visit.
      localStorage.removeItem('restoreco_session_id');
      el.innerHTML = `
        <h2 class="font-display text-2xl font-semibold text-ink">Thank you, ${bookingState.firstName}.</h2>
        <p class="mt-4 font-sans text-sm text-ink/70">We'll be in touch soon to lock in your session.</p>
      `;
    } else {
      el.innerHTML = `
        <h2 class="font-display text-2xl font-semibold text-ink">Something went wrong</h2>
        <p class="mt-4 font-sans text-sm text-ink/70">We couldn't save your booking — please try again or reach out to us directly.</p>
      `;
    }
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
  renderScheduleStep();
  renderIntakeStep();
  document.querySelectorAll('.js-open-booking').forEach(btn => btn.addEventListener('click', openModal));
  document.getElementById('close-booking-modal').addEventListener('click', closeModal);
}

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
  initBooking();
});
