import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';
import { KenBurnsImage } from './components/KenBurnsImage';
import { Chyron } from './components/Chyron';
import { Subtitles } from './components/Subtitles';
import { Grade } from './components/Grade';
import { EndCard } from './components/EndCard';

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
};

export const DocReel: React.FC<DocReelProps> = ({ fps, durationInFrames, audioSrc, musicSrc, beats, subtitles }) => {
  const lastBeat = beats[beats.length - 1];

  // Musik nur am Anfang und Ende hoerbar, im Mittelteil sehr leise (Stimme im Vordergrund).
  const introEnd = Math.round(fps * 4);
  const outroStart = durationInFrames - Math.round(fps * 6);
  const musicVolume = (f: number) => {
    const intro = interpolate(f, [0, fps, introEnd], [0, 0.4, 0.05], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const outro = interpolate(f, [outroStart, durationInFrames], [0.05, 0.4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return Math.max(intro, outro);
  };
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {beats.map((b, i) => {
        const dur = b.endFrame - b.startFrame;
        return (
          <Sequence key={i} from={b.startFrame} durationInFrames={dur}>
            <KenBurnsImage src={b.imageSrc} durationInFrames={dur} />
            {b.label ? <Chyron label={b.label} /> : null}
          </Sequence>
        );
      })}

      <Grade />
      <Subtitles cues={subtitles} />

      {lastBeat ? (
        <Sequence from={lastBeat.startFrame} durationInFrames={lastBeat.endFrame - lastBeat.startFrame}>
          <EndCard durationInFrames={lastBeat.endFrame - lastBeat.startFrame} />
        </Sequence>
      ) : null}

      {audioSrc ? <Audio src={staticFile(audioSrc)} /> : null}
      {musicSrc ? <Audio src={staticFile(musicSrc)} volume={musicVolume} /> : null}
    </AbsoluteFill>
  );
};
