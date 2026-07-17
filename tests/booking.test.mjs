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
