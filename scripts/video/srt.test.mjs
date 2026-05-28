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

import { groupCues } from './srt.mjs';

test('groupCues fasst bis zum Satzende zusammen', () => {
  const cues = [
    { startMs: 0,   endMs: 300,  text: 'Es' },
    { startMs: 300, endMs: 600,  text: 'ist' },
    { startMs: 600, endMs: 1000, text: 'sechs.' },
    { startMs: 1000,endMs: 1300, text: 'Du' },
    { startMs: 1300,endMs: 1700, text: 'wachst' },
    { startMs: 1700,endMs: 2100, text: 'auf.' },
  ];
  const phrases = groupCues(cues, { maxWords: 8, maxMs: 5000 });
  assert.equal(phrases.length, 2);
  assert.deepEqual(phrases[0], { startMs: 0, endMs: 1000, text: 'Es ist sechs.' });
  assert.deepEqual(phrases[1], { startMs: 1000, endMs: 2100, text: 'Du wachst auf.' });
});

test('groupCues bricht bei maxWords um', () => {
  const cues = Array.from({ length: 6 }, (_, i) => ({
    startMs: i * 300, endMs: i * 300 + 300, text: `w${i}`,
  }));
  const phrases = groupCues(cues, { maxWords: 3, maxMs: 5000 });
  assert.equal(phrases.length, 2);
  assert.equal(phrases[0].text, 'w0 w1 w2');
  assert.equal(phrases[1].text, 'w3 w4 w5');
});
