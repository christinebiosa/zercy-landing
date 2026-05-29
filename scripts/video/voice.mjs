// scripts/video/voice.mjs
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';

// Ruhige, tiefere Erzaehler-Stimmen fuer den Doku-Ton
export const EDGE_VOICES = {
  de: 'de-DE-ConradNeural',
  en: 'en-US-AndrewNeural',
  es: 'es-ES-AlvaroNeural',
};

export function buildNarration(beatSheet, lang) {
  return beatSheet.narration[lang].map(s => s.trim()).join(' ');
}

// Tempo: zuegig, aber ruhig (vorher -15% war zu lahm)
const RATE = '+0%';

export function synthVoice({ text, lang, audioPath, srtPath }) {
  if (existsSync(audioPath) && existsSync(srtPath)) return;
  const voice = EDGE_VOICES[lang];
  const tmpTxt = audioPath + '.txt';
  writeFileSync(tmpTxt, text, 'utf8');
  execSync(
    `edge-tts --voice "${voice}" --rate="${RATE}" --file "${tmpTxt}" ` +
    `--write-media "${audioPath}" --write-subtitles "${srtPath}"`,
    { stdio: 'pipe' }
  );
  unlinkSync(tmpTxt);
}
