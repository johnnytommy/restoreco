import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTotal,
  getSlotMinutes,
  generateSessionId,
  buildSheetPayload,
  isValidEmail,
  isValidNycZip,
  PACKAGES,
  CONSULT_ONLY,
} from '../booking.js';

test('calculateTotal returns package price with no add-on', () => {
  assert.equal(calculateTotal('quick', false, false), 40);
  assert.equal(calculateTotal('full', false, false), 75);
});

test('calculateTotal adds the app curation consultation add-on', () => {
  assert.equal(calculateTotal('quick', true, false), 90);
  assert.equal(calculateTotal('full', true, false), 125);
});

test('calculateTotal returns the flat consult-only price regardless of package or add-on', () => {
  assert.equal(calculateTotal('', false, true), 50);
  assert.equal(calculateTotal('full', true, true), 50);
});

test('calculateTotal throws on an unknown package', () => {
  assert.throws(() => calculateTotal('deluxe', false, false));
});

test('getSlotMinutes matches package slot length', () => {
  assert.equal(getSlotMinutes('quick'), 15);
  assert.equal(getSlotMinutes('full'), 45);
});

test('generateSessionId returns a well-formed UUID', () => {
  const id = generateSessionId();
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
});

test('isValidEmail accepts well-formed addresses and rejects the rest', () => {
  assert.equal(isValidEmail('jamie@example.com'), true);
  assert.equal(isValidEmail('jamie@example'), false);
  assert.equal(isValidEmail(''), false);
});

test('isValidNycZip accepts 5-digit codes and rejects the rest', () => {
  assert.equal(isValidNycZip('10001'), true);
  assert.equal(isValidNycZip('1000'), false);
  assert.equal(isValidNycZip('abcde'), false);
});

test('buildSheetPayload computes the total and carries all fields', () => {
  const payload = buildSheetPayload({
    sessionId: 'abc-123',
    firstName: 'Jamie',
    lastName: 'Rivera',
    email: 'jamie@example.com',
    zip: '10001',
    packageId: 'full',
    curationAddon: true,
    consultOnly: false,
    date: '2026-08-01',
    dayPart: 'Evening',
    intake: 'serious',
  });
  assert.equal(payload.total, 125);
  assert.equal(payload.packageName, PACKAGES.full.name);
  assert.equal(payload.sessionId, 'abc-123');
  assert.equal(payload.email, 'jamie@example.com');
  assert.equal(payload.zip, '10001');
  assert.ok(payload.submittedAt);
});

test('buildSheetPayload uses the consult-only package name and flat price', () => {
  const payload = buildSheetPayload({
    sessionId: 'abc-456',
    firstName: 'Jamie',
    lastName: 'Rivera',
    email: 'jamie@example.com',
    zip: '10001',
    packageId: '',
    curationAddon: false,
    consultOnly: true,
  });
  assert.equal(payload.total, 50);
  assert.equal(payload.packageId, CONSULT_ONLY.id);
  assert.equal(payload.packageName, CONSULT_ONLY.name);
  assert.equal(payload.consultOnly, true);
});
