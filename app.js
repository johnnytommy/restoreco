import { FOUNDERS, TESTIMONIALS } from './content.js';
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
