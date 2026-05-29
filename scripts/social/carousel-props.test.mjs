import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSlideProps } from './carousel-props.mjs';

const sheet = {
  topic: 'paris',
  cover: { title: 'Where to stay in Paris', hook: 'Five cities in one.', query: 'q0' },
  slides: [
    { heading: 'Le Marais', line: 'Never sleep.', bestFor: 'nightlife', query: 'q1' },
    { heading: 'Saint-Germain', line: 'Calm.', bestFor: 'culture', query: 'q2' },
    { heading: 'Montmartre', line: 'Romance.', bestFor: 'views', query: 'q3' },
    { heading: 'Bastille', line: 'Local.', bestFor: 'food', query: 'q4' },
  ],
  cta: { headline: 'Save this', sub: 'Link in bio', query: 'q5' },
  caption: 'x',
};
const imageSrcs = ['renders-social/paris/img0.jpg','renders-social/paris/img1.jpg','renders-social/paris/img2.jpg','renders-social/paris/img3.jpg','renders-social/paris/img4.jpg','renders-social/paris/img5.jpg'];

const props = buildSlideProps({ sheet, imageSrcs });

test('buildSlideProps erzeugt cover + content + cta in Reihenfolge', () => {
  assert.equal(props.length, 6);
  assert.equal(props[0].kind, 'cover');
  assert.equal(props[1].kind, 'content');
  assert.equal(props[5].kind, 'cta');
});

test('buildSlideProps setzt index/total und Bild korrekt', () => {
  assert.equal(props[0].total, 6);
  assert.equal(props[0].index, 1);
  assert.equal(props[5].index, 6);
  assert.equal(props[0].imageSrc, 'renders-social/paris/img0.jpg');
  assert.equal(props[1].imageSrc, 'renders-social/paris/img1.jpg');
  assert.equal(props[5].imageSrc, 'renders-social/paris/img5.jpg');
  assert.equal(props[0].width, 1080);
  assert.equal(props[0].height, 1350);
});

test('buildSlideProps mappt Texte je kind', () => {
  assert.equal(props[0].title, 'Where to stay in Paris');
  assert.equal(props[0].hook, 'Five cities in one.');
  assert.equal(props[1].heading, 'Le Marais');
  assert.equal(props[1].line, 'Never sleep.');
  assert.equal(props[1].bestFor, 'nightlife');
  assert.equal(props[5].headline, 'Save this');
  assert.equal(props[5].sub, 'Link in bio');
});
