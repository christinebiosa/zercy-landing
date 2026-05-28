import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

type Cue = { startFrame: number; endFrame: number; text: string };

export const Subtitles: React.FC<{ cues: Cue[] }> = ({ cues }) => {
  const frame = useCurrentFrame();
  const current = cues.find(c => frame >= c.startFrame && frame < c.endFrame);
  if (!current) return null;
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 220 }}>
      <div style={{
        maxWidth: 880, textAlign: 'center', color: 'white',
        fontFamily: 'Helvetica, sans-serif', fontSize: 40, lineHeight: 1.3, fontWeight: 500,
        textShadow: '0 2px 10px rgba(0,0,0,0.85)',
      }}>
        {current.text}
      </div>
    </AbsoluteFill>
  );
};
