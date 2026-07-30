export const PACKAGES = {
  quick: {
    id: 'quick',
    name: 'Quick Shoot',
    price: 40,
    description: "One outfit. Great for your first photo on the app, plus profile pictures for Instagram (arguably the best dating app out there).",
    sessionLength: '~15 min session',
    slotMinutes: 15,
  },
  full: {
    id: 'full',
    name: 'Full Makeover',
    price: 75,
    description: 'Multiple outfits, full profile photo set',
    sessionLength: '~45 min session',
    slotMinutes: 45,
  },
};

export const CURATION_ADDON = {
  id: 'curationAddon',
  name: 'App Curation Consultation',
  price: 50,
  description: 'Post-shoot: we work on the right combination of your pictures and your prompts.',
};

export const CONSULT_ONLY = {
  id: 'consultOnly',
  name: 'App Consultation Only',
  price: 50,
  description: "No new photos. We consult on what you already have and help you build your strongest profile.",
  slotMinutes: 30,
};

export const INTAKE_OPTIONS = [
  { id: 'casual', label: 'Something casual' },
  { id: 'serious', label: 'Something serious' },
  { id: 'moreOptions', label: 'More options in general' },
  { id: 'gram', label: "Just want better photos for the 'gram" },
  { id: 'feelBetter', label: 'I want to feel better about myself' },
];

export const DAY_PARTS = ['Morning', 'Afternoon', 'Evening', 'Unavailable'];

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
}

export function isValidNycZip(value) {
  return /^\d{5}$/.test(value || '');
}

export function calculateTotal(packageId, curationAddonEnabled, consultOnly) {
  if (consultOnly) return CONSULT_ONLY.price;
  const pkg = PACKAGES[packageId];
  if (!pkg) throw new Error(`Unknown package: ${packageId}`);
  return pkg.price + (curationAddonEnabled ? CURATION_ADDON.price : 0);
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
    email: state.email || '',
    zip: state.zip || '',
    packageId: state.consultOnly ? CONSULT_ONLY.id : (state.packageId || ''),
    packageName: state.consultOnly ? CONSULT_ONLY.name : (pkg ? pkg.name : ''),
    curationAddon: Boolean(state.curationAddon),
    consultOnly: Boolean(state.consultOnly),
    total: (state.packageId || state.consultOnly) ? calculateTotal(state.packageId, state.curationAddon, state.consultOnly) : 0,
    weekdayAvailability: Array.isArray(state.weekdayAvailability) ? state.weekdayAvailability.join(', ') : (state.weekdayAvailability || ''),
    weekendAvailability: Array.isArray(state.weekendAvailability) ? state.weekendAvailability.join(', ') : (state.weekendAvailability || ''),
    intake: Array.isArray(state.intake) ? state.intake.join(', ') : (state.intake || ''),
    submittedAt: new Date().toISOString(),
  };
}
