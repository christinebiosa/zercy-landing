// scripts/video/props.mjs
export function buildProps({ beatSheet, lang, imageSrcs, audioDurationSec, cues, musicSrc, fps = 30 }) {
  const width = 1080, height = 1920;
  const durationInFrames = Math.max(1, Math.round(audioDurationSec * fps));
  const lines = beatSheet.narration[lang];

  const weights = lines.map(l => Math.max(1, l.length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const beats = [];
  let acc = 0;
  for (let i = 0; i < beatSheet.beats.length; i++) {
    const startFrame = i === 0 ? 0 : beats[i - 1].endFrame;
    acc += weights[i];
    const endFrame = i === beatSheet.beats.length - 1
      ? durationInFrames
      : Math.round((acc / totalWeight) * durationInFrames);
    beats.push({
      kind: beatSheet.beats[i].kind,
      imageSrc: imageSrcs[i],
      label: beatSheet.beats[i].label,
      startFrame,
      endFrame,
    });
  }

  const subtitles = cues.map(c => ({
    startFrame: Math.round((c.startMs / 1000) * fps),
    endFrame: Math.round((c.endMs / 1000) * fps),
    text: c.text,
  }));

  return { width, height, fps, durationInFrames, lang, musicSrc, beats, subtitles, audioSrc: null };
}
