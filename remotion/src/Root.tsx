import React from 'react';
import { Composition } from 'remotion';
import { DocReel } from './DocReel';
import { CarouselSlide } from './CarouselSlide';

const DOC_DEFAULTS = {
  width: 1080, height: 1920, fps: 30, durationInFrames: 90,
  lang: 'de', audioSrc: null, musicSrc: null, beats: [], subtitles: [],
};

const SLIDE_DEFAULTS = {
  width: 1080, height: 1350, kind: 'cover' as const, imageSrc: '',
  index: 1, total: 7, title: 'Zercy', hook: '', heading: '', line: '', bestFor: '', headline: '', sub: '',
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="DocReel"
      component={DocReel}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={DOC_DEFAULTS}
      calculateMetadata={({ props }) => ({
        durationInFrames: props.durationInFrames || 90,
        fps: props.fps || 30,
        width: props.width || 1080,
        height: props.height || 1920,
      })}
    />
    <Composition
      id="Carousel"
      component={CarouselSlide}
      durationInFrames={1}
      fps={30}
      width={1080}
      height={1350}
      defaultProps={SLIDE_DEFAULTS}
    />
  </>
);
