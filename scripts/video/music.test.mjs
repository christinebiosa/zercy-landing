// scripts/video/music.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickTrack } from './music.mjs';

const TRACKS = ['a.mp3', 'b.mp3', 'c.mp3'];

test('pickTrack ist deterministisch pro Stadt', () => {
  assert.equal(pickTrack(TRACKS, 'Paris'), pickTrack(TRACKS, 'Paris'));
});

test('pickTrack verteilt verschiedene Staedte', () => {
  const picks = new Set(['Paris', 'Rome', 'Tokyo', 'Lima'].map(c => pickTrack(TRACKS, c)));
  assert.ok(picks.size >= 2);
});

test('pickTrack wirft bei leerer Bibliothek', () => {
  assert.throws(() => pickTrack([], 'Paris'), /keine Musik/);
});
