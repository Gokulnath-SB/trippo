import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import useReducedMotion from '../hooks/useReducedMotion';
import './intro.css';

const LANDSCAPE_URL = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&q=80';

// Cumulative auto-advance: 1.2s / 2.7s / 4.4s — stops on the ENTER scene.
const SCENE_STEPS = [1200, 1500, 1700];

// Static positions keep renders deterministic and avoid layout thrash.
const PARTICLES = [
  { x: '12%', y: '24%', size: 'var(--s1)', delay: '0s', duration: '7s' },
  { x: '26%', y: '68%', size: 'calc(var(--s1) / 2)', delay: '1.2s', duration: '8s' },
  { x: '43%', y: '16%', size: 'calc(var(--s1) / 2)', delay: '2.1s', duration: '9s' },
  { x: '61%', y: '78%', size: 'var(--s1)', delay: '0.6s', duration: '8.5s' },
  { x: '78%', y: '32%', size: 'calc(var(--s1) / 2)', delay: '1.8s', duration: '7.5s' },
  { x: '89%', y: '62%', size: 'var(--s1)', delay: '2.6s', duration: '9.5s' },
  { x: '34%', y: '44%', size: 'calc(var(--s1) / 2)', delay: '3.1s', duration: '8s' },
  { x: '70%', y: '12%', size: 'calc(var(--s1) / 2)', delay: '0.9s', duration: '7s' },
];

/**
 * Full-screen cinematic introduction. Never navigates by itself: it only
 * calls onEnter() when the user chooses ENTER TRIPO / Skip Intro / Escape.
 */
export default function CinematicIntro({ onEnter }) {
  const reduced = useReducedMotion();
  const [scene, setScene] = useState(() => (reduced ? 3 : 0));
  const onEnterRef = useRef(onEnter);
  const dialogRef = useRef(null);
  const skipRef = useRef(null);
  const enterRef = useRef(null);

  useEffect(() => {
    onEnterRef.current = onEnter;
  }, [onEnter]);

  const finish = useCallback(() => {
    onEnterRef.current?.();
  }, []);

  // Lock background scrolling while the overlay is mounted.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    if (reduced) {
      setScene(3);
      return undefined;
    }

    setScene(0);
    const timers = SCENE_STEPS.map((delay, index) =>
      window.setTimeout(() => setScene(index + 1), delay)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reduced]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { finish(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll('button:not([disabled])'))
        .filter((el) => el.offsetParent !== null && window.getComputedStyle(el).visibility !== 'hidden');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finish]);

  // Put keyboard focus on the quickest way out.
  useEffect(() => {
    const target = reduced ? enterRef.current : skipRef.current;
    if (target && typeof target.focus === 'function') target.focus();
  }, [reduced]);

  const enterButton = (
    <button ref={enterRef} type="button" className="intro__enter" onClick={finish}>
      <span>ENTER TRIPO</span>
      <ArrowRight size={18} aria-hidden="true" />
    </button>
  );

  const scenes = [
    {
      key: 'awakening',
      content: (
        <div className="intro__scene-inner">
          <span className="intro__awaken-mark" aria-hidden="true">
            <Compass size={28} strokeWidth={1.25} />
          </span>
          <p className="intro__awaken-text">The world is wider than you think.</p>
          <span className="intro__awaken-line" aria-hidden="true" />
        </div>
      ),
    },
    {
      key: 'brand',
      content: (
        <div className="intro__scene-inner">
          <span className="intro__mark" aria-hidden="true">
            <Compass size={26} strokeWidth={1.4} />
          </span>
          <div className="intro__wordmark-clip">
            <h1 className="intro__wordmark">tripo<span>.tech</span></h1>
            <span className="intro__sweep" aria-hidden="true" />
          </div>
          <p className="intro__sub">Your journey, thoughtfully mapped.</p>
        </div>
      ),
    },
    {
      key: 'landscape',
      backdrop: (
        <div className="intro__landscape" aria-hidden="true">
          <img src={LANDSCAPE_URL} alt="" decoding="async" />
          <span className="intro__landscape-veil" />
        </div>
      ),
      content: (
        <div className="intro__scene-inner intro__scene-inner--copy">
          <span className="intro__eyebrow">GO FURTHER</span>
          <p className="intro__landscape-title">Every horizon, within reach.</p>
        </div>
      ),
    },
    {
      key: 'enter',
      content: (
        <div className="intro__scene-inner intro__final">
          <span className="intro__eyebrow">WELCOME TO TRIPO.TECH</span>
          <h2 className="intro__tagline">Explore Beyond.<br /><span>Travel Smarter.</span></h2>
          <p className="intro__final-sub">Plan less. Discover more.</p>
          {enterButton}
        </div>
      ),
    },
  ];

  return (
    <div
      ref={dialogRef}
      className="intro"
      role="dialog"
      aria-modal="true"
      aria-label="Introduction"
      data-scene={scene}
      data-reduced={reduced ? 'true' : 'false'}
    >
      {!reduced ? (
        <>
          <div className="intro__ambient" aria-hidden="true">
            <span className="intro__glow" />
            <div className="intro__particles">
              {PARTICLES.map((particle, index) => (
                <span
                  key={`particle-${index}`}
                  className="intro__particle"
                  style={{
                    '--px': particle.x,
                    '--py': particle.y,
                    '--ps': particle.size,
                    '--pd': particle.duration,
                    '--pdelay': particle.delay,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="intro__stage">
            {scenes.map((item, index) => (
              <section
                key={item.key}
                className="intro__scene"
                data-active={index === scene ? 'true' : 'false'}
                aria-hidden={index === scene ? undefined : 'true'}
              >
                {item.backdrop}
                {item.content}
              </section>
            ))}
          </div>

          <div className="intro__progress" aria-hidden="true">
            {scenes.map((item, index) => (
              <span key={item.key} className="intro__dot" data-on={index === scene ? 'true' : 'false'} />
            ))}
          </div>
        </>
      ) : (
        <div className="intro__stage">
          <section className="intro__scene" data-active="true">{scenes[3].content}</section>
        </div>
      )}

      <button ref={skipRef} type="button" className="intro__skip" onClick={finish}>
        Skip Intro
      </button>
    </div>
  );
}
