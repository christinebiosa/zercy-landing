// scripts/video/stills.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectStill } from './stills.mjs';

const RESPONSE = {
  photos: [
    { width: 4000, height: 2000, src: { portrait: 'p1', large2x: 'l1' } }, // Querformat -> raus
    { width: 1200, height: 1800, src: { portrait: 'p2', large2x: 'l2' } }, // Hochformat ok
    { width: 2000, height: 3000, src: { portrait: 'p3', large2x: 'l3' } }, // groesser & hoch
  ],
};

test('selectStill nimmt das groesste Hochformat-Bild, portrait-URL', () => {
  assert.equal(selectStill(RESPONSE), 'p3');
});

test('selectStill faellt auf large2x zurueck wenn portrait fehlt', () => {
  const r = { photos: [{ width: 1000, height: 1500, src: { large2x: 'only-large' } }] };
  assert.equal(selectStill(r), 'only-large');
});

test('selectStill gibt null bei keinem Hochformat', () => {
  const r = { photos: [{ width: 4000, height: 1000, src: { portrait: 'x' } }] };
  assert.equal(selectStill(r), null);
});
