// scripts/video/beatsheet.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBeatSheet } from './beatsheet.mjs';

const VALID = JSON.stringify({
  cityName: 'Paris',
  beats: [
    { kind: 'coldOpen', query: 'paris dawn', label: null },
    { kind: 'thesis', query: 'paris skyline', label: null },
    { kind: 'neighborhood', query: 'le marais', label: 'LE MARAIS · 4e' },
    { kind: 'reveal', query: 'seine sunrise', label: null },
  ],
  narration: {
    de: ['a', 'b', 'c', 'd'],
    en: ['a', 'b', 'c', 'd'],
    es: ['a', 'b', 'c', 'd'],
  },
});

test('parseBeatSheet akzeptiert gueltiges JSON mit Vortext', () => {
  const bs = parseBeatSheet('Hier dein Beat-Sheet:\n' + VALID);
  assert.equal(bs.cityName, 'Paris');
  assert.equal(bs.beats.length, 4);
  assert.equal(bs.narration.de.length, 4);
});

test('parseBeatSheet wirft bei ungleicher Zeilenanzahl', () => {
  const broken = JSON.parse(VALID);
  broken.narration.es = ['a', 'b'];
  assert.throws(() => parseBeatSheet(JSON.stringify(broken)), /narration\.es/);
});

test('parseBeatSheet wirft ohne JSON', () => {
  assert.throws(() => parseBeatSheet('kein json hier'), /kein JSON/);
});
