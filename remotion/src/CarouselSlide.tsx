import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { Grade } from './components/Grade';

export type SlideProps = {
  width: number; height: number;
  kind: 'cover' | 'content' | 'cta';
  imageSrc: string;
  index: number; total: number;
  title?: string; hook?: string;
  heading?: string; line?: string; bestFor?: string;
  headline?: string; sub?: string;
};

const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif';
const NAVY = '#0F172A';
const OCEAN = '#0EA5E9';
const SUNSET = '#F97316';

export const CarouselSlide: React.FC<SlideProps> = (p) => {
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      {p.imageSrc ? (
        <Img src={staticFile(p.imageSrc)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : null}
      <Grade />
      <AbsoluteFill style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.45) 38%, rgba(15,23,42,0) 70%)' }} />

      <div style={{ position: 'absolute', bottom: 48, left: 56, right: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(255,255,255,0.85)', fontFamily: FONT, fontSize: 30, fontWeight: 700 }}>
        <span>{'✈'} Zercy</span>
        <span style={{ color: 'rgba(255,255,255,0.65)' }}>{p.index}/{p.total}</span>
      </div>

      {p.kind === 'cover' && (
        <div style={{ position: 'absolute', left: 56, right: 56, bottom: 150, color: '#fff', fontFamily: FONT }}>
          <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.05, textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>{p.title}</div>
          <div style={{ fontSize: 40, fontWeight: 500, marginTop: 22, color: 'rgba(255,255,255,0.92)' }}>{p.hook}</div>
          <div style={{ fontSize: 30, fontWeight: 700, marginTop: 30, color: SUNSET, letterSpacing: 2 }}>SWIPE {'→'}</div>
        </div>
      )}
      {p.kind === 'content' && (
        <div style={{ position: 'absolute', left: 56, right: 56, bottom: 150, color: '#fff', fontFamily: FONT }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, color: '#fff', textShadow: '0 2px 14px rgba(0,0,0,0.6)' }}>{p.heading}</div>
          <div style={{ fontSize: 42, fontWeight: 500, marginTop: 18, lineHeight: 1.3 }}>{p.line}</div>
          {p.bestFor ? <div style={{ fontSize: 30, fontWeight: 700, marginTop: 22, color: OCEAN }}>best for: {p.bestFor}</div> : null}
        </div>
      )}
      {p.kind === 'cta' && (
        <div style={{ position: 'absolute', left: 56, right: 56, bottom: 150, color: '#fff', fontFamily: FONT }}>
          <div style={{ fontSize: 70, fontWeight: 800, lineHeight: 1.08, textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>{p.headline}</div>
          <div style={{ fontSize: 40, fontWeight: 600, marginTop: 22, color: SUNSET }}>{p.sub}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
