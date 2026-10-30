// Hero slider — now powered by LOCAL banners:
// /banner1.jpg, /banner2.jpg, /banner3.jpg (placed in /public).
// Smooth carousel: stacked crossfading slides + slow Ken Burns zoom,
// autoplay (5s), pause-on-hover, dots, arrows, keyboard + touch swipe.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HERO_SLIDES } from '../data/products.js';
import './Hero.css';

const AUTOPLAY_MS = 2000;

export default function Hero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);
  const count = HERO_SLIDES.length;

  const go = useCallback((dir) => setIndex((i) => (i + dir + count) % count), [count]);

  // Preload local banners so rotation never flashes.
  useEffect(() => {
    HERO_SLIDES.forEach((s) => {
      const img = new Image();
      img.src = s.image;
    });
  }, []);

  // Autoplay rotation (skipped while hovering / tab hidden).
  useEffect(() => {
    if (paused || document.hidden) return;
    const t = setInterval(() => go(1), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [go, paused, index]);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const slide = HERO_SLIDES[index];

  return (
    <section
      className="hero"
      id="home"
      aria-label="Featured banners"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (dx > 40) go(-1);
        else if (dx < -40) go(1);
        touchX.current = null;
      }}
    >
      {/* Stacked slides — only the active one is opaque (CSS crossfade). */}
      <div className="hero-slides" aria-hidden={false}>
        {HERO_SLIDES.map((s, i) => (
          <div
            key={s.image}
            className={`hero-bg${i === index ? ' active' : ''}`}
            style={{ backgroundImage: `url(${s.image})` }}
            role="img"
            aria-label={i === index ? s.title : undefined}
            aria-hidden={i !== index}
          />
        ))}
      </div>
      <div className="hero-overlay" />

      <button className="hero-arrow left" onClick={() => go(-1)} aria-label="Previous banner">
        ‹
      </button>
      <button className="hero-arrow right" onClick={() => go(1)} aria-label="Next banner">
        ›
      </button>

      {/* Text re-animates on every slide change via key={index}. */}
      <div className="hero-content hero-enter" key={index}>
        <p className="hero-eyebrow">{slide.eyebrow}</p>
        <div className="hero-crown">♛</div>
        <h1 className="hero-title">{slide.title}</h1>
        <p className="hero-sub">{slide.subtitle}</p>
        <p className="hero-text">{slide.text}</p>
        <a href="#shop" className="btn">
          {slide.cta} <span aria-hidden>→</span>
        </a>
      </div>

      <div className="hero-dots" role="tablist" aria-label="Banners">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.title}
            role="tab"
            aria-selected={i === index}
            aria-label={`Banner ${i + 1}: ${s.title}`}
            className={i === index ? 'active' : ''}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}
