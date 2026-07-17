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
