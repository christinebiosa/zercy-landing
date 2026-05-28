// scripts/video/srt.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSrt } from './srt.mjs';

const SAMPLE = `1
00:00:00,063 --> 00:00:00,463
Es

2
00:00:00,463 --> 00:00:00,800
ist

3
00:00:00,800 --> 00:00:01,500
sechs.
`;

test('parseSrt liest Cues mit ms-Zeitstempeln', () => {
  const cues = parseSrt(SAMPLE);
  assert.equal(cues.length, 3);
  assert.deepEqual(cues[0], { startMs: 63, endMs: 463, text: 'Es' });
  assert.deepEqual(cues[2], { startMs: 800, endMs: 1500, text: 'sechs.' });
});

test('parseSrt ignoriert leere Eingabe', () => {
  assert.deepEqual(parseSrt(''), []);
});
