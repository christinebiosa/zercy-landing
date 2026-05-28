import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export const Chyron: React.FC<{ label: string }> = ({ label }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, 1000], [0, 1, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute', left: 64, bottom: 360, opacity,
      color: 'white', fontFamily: 'Helvetica, sans-serif', fontSize: 30, letterSpacing: 4,
      fontWeight: 700, textShadow: '0 2px 8px rgba(0,0,0,0.7)',
    }}>
      {label}
    </div>
  );
};
