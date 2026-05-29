import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCarouselSheet } from './carousel-beatsheet.mjs';

const VALID = JSON.stringify({
  topic: 'paris',
  cover: { title: 'Where to stay in Paris', hook: 'Five cities in one.', query: 'paris skyline' },
  slides: [
    { heading: 'Le Marais', line: 'Never sleep.', bestFor: 'nightlife', query: 'le marais' },
    { heading: 'Saint-Germain', line: 'Old money calm.', query: 'saint germain' },
    { heading: 'Montmartre', line: 'Hilltop romance.', query: 'montmartre' },
    { heading: 'Bastille', line: 'Local and loud.', query: 'bastille paris' },
  ],
  cta: { headline: 'Save this', sub: 'Link in bio', query: 'seine sunrise' },
  caption: 'Where to stay in Paris. Save it.',
});

test('parseCarouselSheet akzeptiert gueltiges JSON mit Vortext', () => {
  const s = parseCarouselSheet('Here:\n' + VALID);
  assert.equal(s.topic, 'paris');
  assert.equal(s.slides.length, 4);
  assert.equal(s.cover.title, 'Where to stay in Paris');
});

test('parseCarouselSheet wirft bei zu wenigen slides', () => {
  const b = JSON.parse(VALID); b.slides = b.slides.slice(0, 3);
  assert.throws(() => parseCarouselSheet(JSON.stringify(b)), /slides/);
});

test('parseCarouselSheet wirft ohne JSON', () => {
  assert.throws(() => parseCarouselSheet('nope'), /kein JSON/);
});
