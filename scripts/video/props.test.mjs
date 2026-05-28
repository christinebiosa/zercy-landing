// scripts/video/props.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProps } from './props.mjs';

const beatSheet = {
  cityName: 'Paris',
  beats: [
    { kind: 'coldOpen', query: 'q1', label: null },
    { kind: 'neighborhood', query: 'q2', label: 'LE MARAIS · 4e' },
    { kind: 'reveal', query: 'q3', label: null },
  ],
  narration: { de: ['aa', 'bbbb', 'cc'], en: [], es: [] },
};

const props = buildProps({
  beatSheet,
  lang: 'de',
  imageSrcs: ['renders/paris/img0.jpg', 'renders/paris/img1.jpg', 'renders/paris/img2.jpg'],
  audioDurationSec: 8,
  cues: [{ startMs: 0, endMs: 1000, text: 'Es ist sechs.' }],
  musicSrc: 'music/a.mp3',
  fps: 30,
});

test('buildProps setzt Grundwerte', () => {
  assert.equal(props.width, 1080);
  assert.equal(props.height, 1920);
  assert.equal(props.fps, 30);
  assert.equal(props.durationInFrames, 240); // 8s * 30
  assert.equal(props.lang, 'de');
  assert.equal(props.musicSrc, 'music/a.mp3');
});

test('buildProps verteilt Beats proportional und lueckenlos', () => {
  assert.equal(props.beats.length, 3);
  assert.equal(props.beats[0].startFrame, 0);
  assert.equal(props.beats[2].endFrame, 240);
  for (let i = 1; i < props.beats.length; i++) {
    assert.equal(props.beats[i].startFrame, props.beats[i - 1].endFrame);
  }
  // mittlerer Beat (Text "bbbb") ist laenger als die aeusseren ("aa","cc")
  const len0 = props.beats[0].endFrame - props.beats[0].startFrame;
  const len1 = props.beats[1].endFrame - props.beats[1].startFrame;
  assert.ok(len1 > len0);
  assert.equal(props.beats[1].label, 'LE MARAIS · 4e');
  assert.equal(props.beats[1].imageSrc, 'renders/paris/img1.jpg');
});

test('buildProps rechnet Untertitel-Cues in Frames', () => {
  assert.deepEqual(props.subtitles[0], { startFrame: 0, endFrame: 30, text: 'Es ist sechs.' });
});
