import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOUNDERS, TESTIMONIALS } from '../content.js';

test('FOUNDERS has exactly Dejah Powell and Johnny Thomas', () => {
  assert.equal(FOUNDERS.length, 2);
  const names = FOUNDERS.map(f => f.name);
  assert.ok(names.includes('Dejah Powell'));
  assert.ok(names.includes('Johnny Thomas'));
});

test('every founder has an id, name, photo, and bio', () => {
  for (const founder of FOUNDERS) {
    assert.ok(founder.id);
    assert.ok(founder.name);
    assert.ok(founder.photo);
    assert.ok(founder.bio);
  }
});

test('TESTIMONIALS starts with 3 before/quote/after entries', () => {
  assert.equal(TESTIMONIALS.length, 3);
  for (const t of TESTIMONIALS) {
    assert.ok(t.id);
    assert.ok(t.before);
    assert.ok(t.after);
    assert.ok(t.quote);
  }
});
