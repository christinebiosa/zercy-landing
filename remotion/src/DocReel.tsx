import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
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

export const DocReel: React.FC<DocReelProps> = ({ durationInFrames, audioSrc, musicSrc, beats, subtitles }) => {
  const lastBeat = beats[beats.length - 1];
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
      {musicSrc ? <Audio src={staticFile(musicSrc)} volume={0.16} /> : null}
    </AbsoluteFill>
  );
};
