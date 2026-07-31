import { HERO_IMAGES, FOUNDERS, TESTIMONIALS } from './content.js';
import { PACKAGES, CURATION_ADDON, CONSULT_ONLY, DAY_PARTS, INTAKE_OPTIONS, calculateTotal, getSlotMinutes, generateSessionId, buildSheetPayload, isValidEmail, isValidNycZip } from './booking.js';

// Every booking POSTs to the same Apps Script deployment, which writes into one of two tabs
// ("Prod Bookings" or "Dev Bookings") in a single Google Sheet, based on the `environment` field
// below. Until PROD_HOSTNAME is set to the real official domain, it can't match anything, so
// every host (localhost, this Vercel deployment, previews) writes to Dev Bookings. See
// google-apps-script/SETUP.md.
const PROD_HOSTNAME_PLACEHOLDER = 'PASTE_YOUR_OFFICIAL_PRODUCTION_DOMAIN_HERE';
const PROD_HOSTNAME = PROD_HOSTNAME_PLACEHOLDER;
const SHEETS_WEBAPP_URL_PLACEHOLDER = 'PASTE_YOUR_APPS_SCRIPT_DEPLOYMENT_URL_HERE';
const SHEETS_WEBAPP_URL_CONFIGURED = 'https://script.google.com/macros/s/AKfycbxtUf7-zZIdCj7o8PcYgj04qJUJSP-NmR2ZVDtRXp8vIWwwZpaquh5RY9J9TChgwGZy/exec';

const isProdHost = typeof window !== 'undefined' && window.location.hostname === PROD_HOSTNAME;
// window.__RESTORECO_TEST_WEBAPP_URL__ is a test-only seam (see tests/dom/modal-submit.mjs) that lets
// smoke tests simulate a configured deployment without editing this file.
const SHEETS_WEBAPP_URL = (typeof window !== 'undefined' && window.__RESTORECO_TEST_WEBAPP_URL__) || SHEETS_WEBAPP_URL_CONFIGURED;

const bookingState = {
  sessionId: null,
  firstName: '',
  lastName: '',
  email: '',
  zip: '',
  packageId: '',
  curationAddon: false,
  consultOnly: false,
  weekdayAvailability: [],
  weekendAvailability: [],
  intake: [],
};

const STEP_IDS = ['contact', 'package', 'availability', 'intake', 'confirm'];

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
    console.warn('Restore Co: SHEETS_WEBAPP_URL is still the placeholder, booking was not sent. See google-apps-script/SETUP.md.');
    return false;
  }
  const payload = {
    ...buildSheetPayload(bookingState),
    environment: isProdHost ? 'prod' : 'dev',
    hostname: typeof window !== 'undefined' ? window.location.hostname : '',
  };
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
        <div id="booking-step-availability" class="booking-step hidden"></div>
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
      <div>
        <input id="input-firstName" type="text" placeholder="First name" required class="interactive w-full border border-ink/20 rounded-xl px-4 py-3 font-sans focus-visible:outline focus-visible:outline-2 focus-visible:outline-terracotta" />
      </div>
      <div>
        <input id="input-lastName" type="text" placeholder="Last name" required class="interactive w-full border border-ink/20 rounded-xl px-4 py-3 font-sans focus-visible:outline focus-visible:outline-2 focus-visible:outline-terracotta" />
      </div>
      <div>
        <input id="input-email" type="email" placeholder="Email" required class="interactive w-full border border-ink/20 rounded-xl px-4 py-3 font-sans focus-visible:outline focus-visible:outline-2 focus-visible:outline-terracotta" />
        <p id="error-email" class="hidden mt-1 font-sans text-xs text-red-600">Please enter a valid email address.</p>
      </div>
      <div>
        <input id="input-zip" type="text" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" placeholder="NYC ZIP code" required class="interactive w-full border border-ink/20 rounded-xl px-4 py-3 font-sans focus-visible:outline focus-visible:outline-2 focus-visible:outline-terracotta" />
        <p id="error-zip" class="hidden mt-1 font-sans text-xs text-red-600">Please enter a valid 5-digit NYC ZIP code.</p>
      </div>
    </div>
    <button id="contact-next" class="interactive mt-8 w-full bg-terracotta text-cream font-sans font-semibold py-3 rounded-full shadow-elevated hover:bg-terracotta-dark">Next</button>
  `;

  let contactAttempted = false;

  function setFieldError(inputId, hasError) {
    const el = document.getElementById(inputId);
    el.classList.toggle('border-red-500', hasError);
  }

  function validateContactStep(showErrors) {
    const firstName = document.getElementById('input-firstName').value.trim();
    const lastName = document.getElementById('input-lastName').value.trim();
    const email = document.getElementById('input-email').value.trim();
    const zip = document.getElementById('input-zip').value.trim();

    const firstNameValid = Boolean(firstName);
    const lastNameValid = Boolean(lastName);
    const emailValid = isValidEmail(email);
    const zipValid = isValidNycZip(zip);

    if (showErrors) {
      setFieldError('input-firstName', !firstNameValid);
      setFieldError('input-lastName', !lastNameValid);
      setFieldError('input-email', !emailValid);
      setFieldError('input-zip', !zipValid);
      document.getElementById('error-email').classList.toggle('hidden', email.length === 0 || emailValid);
      document.getElementById('error-zip').classList.toggle('hidden', zip.length === 0 || zipValid);
    }

    return firstNameValid && lastNameValid && emailValid && zipValid;
  }

  ['input-firstName', 'input-lastName', 'input-email', 'input-zip'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      if (contactAttempted) validateContactStep(true);
    });
  });

  document.getElementById('contact-next').addEventListener('click', () => {
    contactAttempted = true;
    if (!validateContactStep(true)) return;
    bookingState.firstName = document.getElementById('input-firstName').value.trim();
    bookingState.lastName = document.getElementById('input-lastName').value.trim();
    bookingState.email = document.getElementById('input-email').value.trim();
    bookingState.zip = document.getElementById('input-zip').value.trim();
    submitProgress();
    goToStep('package');
  });
}

function updatePriceTally() {
  const total = (bookingState.packageId || bookingState.consultOnly)
    ? calculateTotal(bookingState.packageId, bookingState.curationAddon, bookingState.consultOnly)
    : 0;
  document.getElementById('price-tally').textContent = `$${total}`;
}

function renderPackageStep() {
  const el = document.getElementById('booking-step-package');
  el.innerHTML = `
    <h2 class="font-display text-2xl font-semibold text-ink">Choose your package</h2>
    <div id="shoot-notes-top" class="mt-1 font-sans text-sm text-ink/60">Every shoot includes a pre-session consultation on outfits and location.</div>

    <div id="package-choice-group" class="rounded-3xl">
      <div id="package-options" class="mt-6 space-y-4">
        ${Object.values(PACKAGES).map(pkg => `
          <button type="button" class="interactive block w-full text-left border-2 border-ink/15 rounded-2xl p-4 cursor-pointer package-option" data-package-id="${pkg.id}">
            <div class="flex items-center justify-between">
              <span class="font-sans font-semibold text-ink">${pkg.name}</span>
              <span class="font-sans font-semibold text-terracotta">$${pkg.price}</span>
            </div>
            <p class="mt-1 font-sans text-sm text-ink/60">${pkg.description} · ${pkg.sessionLength}</p>
          </button>
        `).join('')}
      </div>

      <label id="curation-addon-label" class="interactive mt-4 flex items-center gap-2 border border-ink/15 rounded-2xl p-4 cursor-pointer">
        <input type="checkbox" id="curation-addon-toggle" />
        <span class="font-sans text-sm text-ink">${CURATION_ADDON.name} (+$${CURATION_ADDON.price}) · ${CURATION_ADDON.description}</span>
      </label>

      <p id="shoot-notes-bottom" class="mt-4 font-sans text-xs text-ink/50">Every shoot mixes film and phone camera. We recommend your app photos lean about 75% phone, 25% film, depending on your vibe.</p>

      <div class="mt-6 border-t border-ink/10 pt-6">
        <label class="interactive flex items-start gap-3 cursor-pointer">
          <input type="checkbox" id="consult-only-toggle" class="mt-1" />
          <span>
            <span class="block font-sans text-sm font-semibold text-ink">I don't want new pictures, just the app consultation (+$${CONSULT_ONLY.price})</span>
            <span class="block font-sans text-xs text-ink/60 mt-1">${CONSULT_ONLY.description}</span>
          </span>
        </label>
      </div>
    </div>

    <p id="package-error" class="hidden mt-3 font-sans text-xs text-red-600">Please choose a package or the consultation-only option.</p>

    <div class="mt-6 flex items-center justify-between font-display text-xl font-semibold text-ink">
      <span>Total</span>
      <span id="price-tally">$0</span>
    </div>
    <div class="mt-6 grid grid-cols-2 gap-3">
      <button id="package-back" type="button" class="interactive border-2 border-ink/15 text-ink font-sans font-semibold py-3 rounded-full hover:border-ink/30">Back</button>
      <button id="package-next" class="interactive bg-terracotta text-cream font-sans font-semibold py-3 rounded-full shadow-elevated hover:bg-terracotta-dark">Next</button>
    </div>
  `;

  let packageAttempted = false;

  function validatePackageStep(showErrors) {
    const valid = Boolean(bookingState.consultOnly || bookingState.packageId);
    if (showErrors) {
      document.getElementById('package-choice-group').classList.toggle('ring-2', !valid);
      document.getElementById('package-choice-group').classList.toggle('ring-red-500', !valid);
      document.getElementById('package-error').classList.toggle('hidden', valid);
    }
    return valid;
  }

  el.querySelectorAll('.package-option').forEach(btn => {
    btn.addEventListener('click', () => {
      bookingState.packageId = btn.dataset.packageId;
      el.querySelectorAll('.package-option').forEach(b => b.classList.remove('border-terracotta'));
      btn.classList.add('border-terracotta');
      updatePriceTally();
      validatePackageStep(packageAttempted);
    });
  });

  document.getElementById('curation-addon-toggle').addEventListener('change', (e) => {
    bookingState.curationAddon = e.target.checked;
    updatePriceTally();
  });

  document.getElementById('consult-only-toggle').addEventListener('change', (e) => {
    bookingState.consultOnly = e.target.checked;

    document.getElementById('package-options').classList.toggle('opacity-40', bookingState.consultOnly);
    document.getElementById('package-options').classList.toggle('pointer-events-none', bookingState.consultOnly);
    document.getElementById('curation-addon-label').classList.toggle('opacity-40', bookingState.consultOnly);
    document.getElementById('curation-addon-label').classList.toggle('pointer-events-none', bookingState.consultOnly);
    document.getElementById('shoot-notes-top').classList.toggle('hidden', bookingState.consultOnly);
    document.getElementById('shoot-notes-bottom').classList.toggle('hidden', bookingState.consultOnly);

    if (bookingState.consultOnly) {
      bookingState.packageId = '';
      bookingState.curationAddon = false;
      document.getElementById('curation-addon-toggle').checked = false;
      el.querySelectorAll('.package-option').forEach(b => b.classList.remove('border-terracotta'));
    }

    updatePriceTally();
    validatePackageStep(packageAttempted);
  });

  document.getElementById('package-back').addEventListener('click', () => goToStep('contact'));

  document.getElementById('package-next').addEventListener('click', () => {
    packageAttempted = true;
    if (!validatePackageStep(true)) return;
    submitProgress();
    renderAvailabilityStep();
    goToStep('availability');
  });
}

function renderAvailabilityStep() {
  const el = document.getElementById('booking-step-availability');
  const pkg = PACKAGES[bookingState.packageId];
  const durationText = bookingState.consultOnly
    ? `Your app consultation runs about ${CONSULT_ONLY.slotMinutes} minutes.`
    : (pkg ? `Your ${pkg.name} session runs about ${getSlotMinutes(bookingState.packageId)} minutes.` : '');
  el.innerHTML = `
    <h2 class="font-display text-2xl font-semibold text-ink">When are you generally available?</h2>
    <p class="mt-1 font-sans text-sm text-ink/60">${durationText} We'll reach out directly to lock in your exact session time, so we just need your general availability. Select all that apply.</p>

    <div class="mt-6">
      <p class="font-sans text-sm font-semibold text-ink mb-2">Weekdays</p>
      <div id="weekday-options" class="grid grid-cols-2 gap-3 rounded-2xl">
        ${DAY_PARTS.map(part => `
          <button type="button" class="weekday-option interactive border-2 ${bookingState.weekdayAvailability.includes(part) ? 'border-terracotta' : 'border-ink/15'} rounded-xl py-3 font-sans text-sm" data-part="${part}">${part}</button>
        `).join('')}
      </div>
    </div>

    <div class="mt-6">
      <p class="font-sans text-sm font-semibold text-ink mb-2">Weekends</p>
      <div id="weekend-options" class="grid grid-cols-2 gap-3 rounded-2xl">
        ${DAY_PARTS.map(part => `
          <button type="button" class="weekend-option interactive border-2 ${bookingState.weekendAvailability.includes(part) ? 'border-terracotta' : 'border-ink/15'} rounded-xl py-3 font-sans text-sm" data-part="${part}">${part}</button>
        `).join('')}
      </div>
    </div>

    <p id="availability-error" class="hidden mt-4 font-sans text-xs text-red-600">Please choose your weekday and weekend availability. You can't be unavailable for both.</p>

    <div class="mt-8 grid grid-cols-2 gap-3">
      <button id="availability-back" type="button" class="interactive border-2 border-ink/15 text-ink font-sans font-semibold py-3 rounded-full hover:border-ink/30">Back</button>
      <button id="availability-next" class="interactive bg-terracotta text-cream font-sans font-semibold py-3 rounded-full shadow-elevated hover:bg-terracotta-dark">Next</button>
    </div>
  `;

  let availabilityAttempted = false;

  function togglePart(field, part) {
    const current = bookingState[field];
    if (part === 'Unavailable') {
      bookingState[field] = (current.length === 1 && current[0] === 'Unavailable') ? [] : ['Unavailable'];
    } else if (current.includes(part)) {
      bookingState[field] = current.filter(p => p !== part);
    } else {
      bookingState[field] = [...current.filter(p => p !== 'Unavailable'), part];
    }
  }

  function validateAvailabilityStep(showErrors) {
    const bothChosen = bookingState.weekdayAvailability.length > 0 && bookingState.weekendAvailability.length > 0;
    const bothUnavailable = bookingState.weekdayAvailability.includes('Unavailable') && bookingState.weekendAvailability.includes('Unavailable');
    const valid = bothChosen && !bothUnavailable;
    if (showErrors) {
      const weekdayInvalid = bookingState.weekdayAvailability.length === 0 || bothUnavailable;
      const weekendInvalid = bookingState.weekendAvailability.length === 0 || bothUnavailable;
      document.getElementById('weekday-options').classList.toggle('ring-2', weekdayInvalid);
      document.getElementById('weekday-options').classList.toggle('ring-red-500', weekdayInvalid);
      document.getElementById('weekend-options').classList.toggle('ring-2', weekendInvalid);
      document.getElementById('weekend-options').classList.toggle('ring-red-500', weekendInvalid);
      document.getElementById('availability-error').classList.toggle('hidden', valid);
    }
    return valid;
  }

  el.querySelectorAll('.weekday-option').forEach(btn => {
    btn.addEventListener('click', () => {
      togglePart('weekdayAvailability', btn.dataset.part);
      el.querySelectorAll('.weekday-option').forEach(b => {
        b.classList.toggle('border-terracotta', bookingState.weekdayAvailability.includes(b.dataset.part));
        b.classList.toggle('border-ink/15', !bookingState.weekdayAvailability.includes(b.dataset.part));
      });
      validateAvailabilityStep(availabilityAttempted);
    });
  });

  el.querySelectorAll('.weekend-option').forEach(btn => {
    btn.addEventListener('click', () => {
      togglePart('weekendAvailability', btn.dataset.part);
      el.querySelectorAll('.weekend-option').forEach(b => {
        b.classList.toggle('border-terracotta', bookingState.weekendAvailability.includes(b.dataset.part));
        b.classList.toggle('border-ink/15', !bookingState.weekendAvailability.includes(b.dataset.part));
      });
      validateAvailabilityStep(availabilityAttempted);
    });
  });

  document.getElementById('availability-back').addEventListener('click', () => goToStep('package'));

  document.getElementById('availability-next').addEventListener('click', () => {
    availabilityAttempted = true;
    if (!validateAvailabilityStep(true)) return;
    submitProgress();
    goToStep('intake');
  });
}

function renderIntakeStep() {
  const el = document.getElementById('booking-step-intake');
  el.innerHTML = `
    <h2 class="font-display text-2xl font-semibold text-ink">What do you hope to get out of a better dating profile?</h2>
    <p class="mt-1 font-sans text-sm text-ink/60">Select all that apply.</p>
    <div id="intake-options" class="mt-6 space-y-3 rounded-2xl">
      ${INTAKE_OPTIONS.map(opt => `
        <button type="button" class="intake-option interactive block w-full text-left border-2 border-ink/15 rounded-xl px-4 py-3 font-sans text-sm" data-intake-id="${opt.id}">${opt.label}</button>
      `).join('')}
    </div>
    <p id="intake-error" class="hidden mt-3 font-sans text-xs text-red-600">Please select at least one option.</p>
    <div class="mt-8 grid grid-cols-2 gap-3">
      <button id="intake-back" type="button" class="interactive border-2 border-ink/15 text-ink font-sans font-semibold py-3 rounded-full hover:border-ink/30">Back</button>
      <button id="intake-next" class="interactive bg-terracotta text-cream font-sans font-semibold py-3 rounded-full shadow-elevated hover:bg-terracotta-dark">Next</button>
    </div>
  `;

  let intakeAttempted = false;

  function validateIntakeStep(showErrors) {
    const valid = bookingState.intake.length > 0;
    if (showErrors) {
      document.getElementById('intake-options').classList.toggle('ring-2', !valid);
      document.getElementById('intake-options').classList.toggle('ring-red-500', !valid);
      document.getElementById('intake-error').classList.toggle('hidden', valid);
    }
    return valid;
  }

  el.querySelectorAll('.intake-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.intakeId;
      const idx = bookingState.intake.indexOf(id);
      if (idx === -1) {
        bookingState.intake.push(id);
        btn.classList.add('border-terracotta');
      } else {
        bookingState.intake.splice(idx, 1);
        btn.classList.remove('border-terracotta');
      }
      validateIntakeStep(intakeAttempted);
    });
  });

  document.getElementById('intake-back').addEventListener('click', () => goToStep('availability'));

  document.getElementById('intake-next').addEventListener('click', () => {
    intakeAttempted = true;
    if (!validateIntakeStep(true)) return;
    submitProgress();
    renderConfirmStep();
    goToStep('confirm');
  });
}

function renderConfirmStep() {
  const el = document.getElementById('booking-step-confirm');
  const pkg = PACKAGES[bookingState.packageId];
  const total = calculateTotal(bookingState.packageId, bookingState.curationAddon, bookingState.consultOnly);
  const offeringLabel = bookingState.consultOnly
    ? CONSULT_ONLY.name
    : `${pkg.name}${bookingState.curationAddon ? ` + ${CURATION_ADDON.name}` : ''}`;
  const intakeLabels = bookingState.intake
    .map(id => INTAKE_OPTIONS.find(opt => opt.id === id)?.label)
    .filter(Boolean)
    .join(', ');
  const reviewRow = (label, value) => `
    <p><span class="font-sans font-semibold text-ink">${label}:</span> <span class="font-sans text-sm text-ink/70">${value}</span></p>
  `;
  el.innerHTML = `
    <h2 class="font-display text-2xl font-semibold text-ink">Review your details</h2>
    <p class="mt-1 font-sans text-sm text-ink/60">Take a look, then confirm below.</p>
    <div class="mt-6 space-y-2">
      ${reviewRow('Name', `${bookingState.firstName} ${bookingState.lastName}`)}
      ${reviewRow('Email', bookingState.email)}
      ${reviewRow('ZIP', bookingState.zip)}
      ${reviewRow('Package', offeringLabel)}
      ${reviewRow('Weekday availability', bookingState.weekdayAvailability.join(', '))}
      ${reviewRow('Weekend availability', bookingState.weekendAvailability.join(', '))}
      ${reviewRow('Goals', intakeLabels)}
    </div>
    <div class="mt-6 flex items-center justify-between font-display text-xl font-semibold text-ink">
      <span>Total</span>
      <span>$${total}</span>
    </div>
    <p class="mt-4 font-sans text-xs text-ink/50">Once you confirm, you'll be all set. Expect to hear back from us soon to lock in the details.</p>
    <div class="mt-8 grid grid-cols-2 gap-3">
      <button id="confirm-back" type="button" class="interactive border-2 border-ink/15 text-ink font-sans font-semibold py-3 rounded-full hover:border-ink/30">Back</button>
      <button id="confirm-submit" class="interactive bg-terracotta text-cream font-sans font-semibold py-3 rounded-full shadow-elevated hover:bg-terracotta-dark">Confirm</button>
    </div>
  `;

  document.getElementById('confirm-back').addEventListener('click', () => goToStep('intake'));

  document.getElementById('confirm-submit').addEventListener('click', async () => {
    const success = await submitProgress();
    if (success) {
      // A completed booking should never share its sessionId with a future one, otherwise
      // the Apps Script backend's upsert-by-sessionId would overwrite this row on the next visit.
      localStorage.removeItem('restoreco_session_id');
      el.innerHTML = `
        <h2 class="font-display text-2xl font-semibold text-ink">You're all set, ${bookingState.firstName}.</h2>
        <p class="mt-4 font-sans text-sm text-ink/70">Expect to hear back from us soon to lock in your session.</p>
      `;
    } else {
      el.innerHTML = `
        <h2 class="font-display text-2xl font-semibold text-ink">Something went wrong</h2>
        <p class="mt-4 font-sans text-sm text-ink/70">We couldn't save your booking. Please try again or reach out to us directly.</p>
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
  renderAvailabilityStep();
  renderIntakeStep();
  document.querySelectorAll('.js-open-booking').forEach(btn => btn.addEventListener('click', openModal));
  document.getElementById('close-booking-modal').addEventListener('click', closeModal);
}

function renderHeroCarousel() {
  const container = document.getElementById('hero-carousel');
  if (!container || HERO_IMAGES.length === 0) return;

  container.innerHTML = HERO_IMAGES.map(src => `<img src="${src}" alt="" class="hero-card" />`).join('');
  const cards = Array.from(container.querySelectorAll('.hero-card'));
  const total = cards.length;
  let current = 0;

  // Cards sit in a small ring around `current`: front (visible), one peeking in from the
  // right, one peeking out to the left, and the rest parked invisibly behind the front card
  // until their turn comes back around.
  function positionCards() {
    cards.forEach((card, i) => {
      const offset = (i - current + total) % total;
      if (offset === 0) {
        card.style.transform = 'translateX(0%) scale(1) rotate(0deg)';
        card.style.opacity = '1';
        card.style.zIndex = '40';
      } else if (offset === 1) {
        card.style.transform = 'translateX(55%) scale(0.85) rotate(6deg)';
        card.style.opacity = '0.45';
        card.style.zIndex = '30';
      } else if (offset === total - 1) {
        card.style.transform = 'translateX(-55%) scale(0.85) rotate(-6deg)';
        card.style.opacity = '0.45';
        card.style.zIndex = '30';
      } else {
        card.style.transform = 'translateX(0%) scale(0.7) rotate(0deg)';
        card.style.opacity = '0';
        card.style.zIndex = '10';
      }
    });
  }

  positionCards();
  if (total > 1) {
    setInterval(() => {
      current = (current + 1) % total;
      positionCards();
    }, 3000);
  }
}

function renderFounders() {
  const grid = document.getElementById('founders-grid');
  grid.innerHTML = FOUNDERS.map(founder => `
    <div class="bg-cream rounded-3xl shadow-elevated p-6 text-center">
      <img src="${founder.photo}" alt="${founder.name}" class="w-full aspect-square object-cover object-top rounded-2xl shadow-elevated" />
      <h3 class="mt-4 font-display text-xl font-semibold text-ink">${founder.name}</h3>
      <div class="mt-2 font-sans text-sm text-ink/60 space-y-2">
        ${founder.bio.split('\n\n').map(paragraph => `<p>${paragraph}</p>`).join('')}
      </div>
    </div>
  `).join('');
}

function renderTestimonials() {
  const grid = document.getElementById('testimonials-grid');
  grid.innerHTML = TESTIMONIALS.map(t => `
    <div class="bg-cream rounded-3xl shadow-elevated overflow-hidden grid md:grid-cols-[1fr_1.4fr_1fr] items-center">
      <div class="relative">
        <img src="${t.before}" alt="Before" class="w-full aspect-[390/844] object-cover" />
        <span class="absolute bottom-3 left-3 text-xs font-sans font-semibold bg-ink/80 text-cream px-2 py-1 rounded-full">Before</span>
      </div>
      <p class="font-display text-xl md:text-2xl text-ink text-center leading-snug px-8 py-8 md:py-0">${t.quote}</p>
      <div class="relative">
        <img src="${t.after}" alt="After" class="w-full aspect-[390/844] object-cover" />
        <span class="absolute bottom-3 left-3 text-xs font-sans font-semibold bg-terracotta text-cream px-2 py-1 rounded-full">After</span>
      </div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeroCarousel();
  renderFounders();
  renderTestimonials();
  initBooking();
});
