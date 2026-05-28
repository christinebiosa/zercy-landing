import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export const EndCard: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 120, opacity }}>
      <div style={{
        color: 'white', fontFamily: 'Helvetica, sans-serif', fontSize: 52, fontWeight: 800,
        textShadow: '0 2px 12px rgba(0,0,0,0.8)',
      }}>
        zercy.app
      </div>
      <div style={{ color: 'white', fontFamily: 'Helvetica, sans-serif', fontSize: 26, opacity: 0.85, marginTop: 8 }}>
        Link in Bio
      </div>
    </AbsoluteFill>
  );
};
