// scripts/video/voice.mjs
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';

// Ruhige, tiefere Erzaehler-Stimmen fuer den Doku-Ton
export const EDGE_VOICES = {
  de: 'de-DE-ConradNeural',
  en: 'en-US-GuyNeural',
  es: 'es-ES-AlvaroNeural',
};

export function buildNarration(beatSheet, lang) {
  return beatSheet.narration[lang].map(s => s.trim()).join(' ');
}

// Langsameres Tempo fuer den Essay-Ton
const RATE = '-15%';

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
