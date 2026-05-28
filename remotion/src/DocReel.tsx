// remotion/src/DocReel.tsx
import React from 'react';
import { AbsoluteFill } from 'remotion';

export type DocReelProps = {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  lang: string;
  audioSrc: string | null;
  musicSrc: string | null;
  beats: Array<{ kind: string; imageSrc: string; label: string | null; startFrame: number; endFrame: number }>;
  subtitles: Array<{ startFrame: number; endFrame: number; text: string }>;
  cityName?: string;
};

export const DocReel: React.FC<DocReelProps> = ({ cityName = 'Zercy' }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ color: 'white', fontSize: 90, fontFamily: 'Helvetica, sans-serif' }}>{cityName}</div>
    </AbsoluteFill>
  );
};
