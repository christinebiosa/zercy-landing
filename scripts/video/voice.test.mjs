// scripts/video/voice.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNarration, EDGE_VOICES } from './voice.mjs';

const BS = {
  beats: [{ kind: 'coldOpen' }, { kind: 'thesis' }, { kind: 'reveal' }],
  narration: {
    de: ['Es ist sechs.', 'Paris ist fuenf Staedte.', 'Hier waere ich.'],
    en: ['It is six.', 'Paris is five cities.', 'Here I would be.'],
    es: ['Son las seis.', 'Paris son cinco ciudades.', 'Aqui estaria.'],
  },
};

test('buildNarration verbindet Zeilen mit Leerzeichen', () => {
  assert.equal(buildNarration(BS, 'de'), 'Es ist sechs. Paris ist fuenf Staedte. Hier waere ich.');
});

test('EDGE_VOICES hat ruhige Erzaehler pro Sprache', () => {
  assert.ok(EDGE_VOICES.de && EDGE_VOICES.en && EDGE_VOICES.es);
});
