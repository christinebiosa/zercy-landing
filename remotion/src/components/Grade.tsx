import React from 'react';
import { AbsoluteFill } from 'remotion';

export const Grade: React.FC = () => (
  <>
    <AbsoluteFill style={{
      background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)',
      mixBlendMode: 'multiply',
    }} />
    <AbsoluteFill style={{ backgroundColor: 'rgba(20,40,55,0.10)', mixBlendMode: 'soft-light' }} />
    <AbsoluteFill style={{ opacity: 0.07, mixBlendMode: 'overlay' }}>
      <svg width="100%" height="100%">
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" /></filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  </>
);
