// remotion/src/Root.tsx
import React from 'react';
import { Composition } from 'remotion';
import { DocReel } from './DocReel';

const DEFAULTS = {
  width: 1080, height: 1920, fps: 30, durationInFrames: 90,
  lang: 'de', audioSrc: null, musicSrc: null, beats: [], subtitles: [], cityName: 'Zercy',
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="DocReel"
    component={DocReel}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={DEFAULTS}
    calculateMetadata={({ props }) => ({
      durationInFrames: props.durationInFrames || 90,
      fps: props.fps || 30,
      width: props.width || 1080,
      height: props.height || 1920,
    })}
  />
);
