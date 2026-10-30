// Announcement marquee + T-Shirt color filter cards + promo banners.
// Categories: 5 vibrant swatch cards (Maroon/Red/Black/White/Blue).
// Clicking a card filters the #shop grid; clicking again resets.
import React, { useMemo } from 'react';
import { COLOR_FILTERS } from '../data/products.js';
import './Sections.css';

export function Marquee() {
  const items = [
    '✨ 100% Fully Customized T-Shirts',
    '🎨 Unique Designs Created By Our Team',
    '💡 Turn Your Ideas Into Fashion',
    '🚀 Premium Quality & Style',
  ];
  const row = [...items, ...items];
  return (
    <div className="marquee" aria-hidden>
      <div className="marquee-track">
        {row.map((t, i) => (
          <span key={i}>
            ✦ {t} &nbsp;&nbsp;&nbsp;
          </span>
        ))}
      </div>
    </div>
  );
}

export function Categories({ products = [], activeColor = 'All', onSelect }) {
  // Live per-color counts so cards always reflect the real catalog
  // (including dresses newly added from the Admin Dashboard).
  const counts = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      const key = String(p.color || '').trim().toLowerCase();
      if (key) map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [products]);

  const pick = (title) => {
    if (onSelect) onSelect(activeColor === title ? 'All' : title);
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="section-pad container" id="collections">
      <div className="section-head">
        <div>
          <p className="eyebrow" style={{ color: 'var(--accent-hover)' }}>
            Pick Your Shade
          </p>
          <h2>T-Shirt Colors</h2>
        </div>
        <button
          className="link-arrow"
          style={{ background: 'none', border: 'none', borderBottom: '1px solid var(--ink)', cursor: 'pointer' }}
          onClick={() => onSelect && onSelect('All')}
        >
          All Colors →
        </button>
      </div>
      <div className="color-grid" role="listbox" aria-label="Filter by T-shirt color">
        {COLOR_FILTERS.map((c) => {
          const n = counts[c.title.toLowerCase()] || 0;
          const active = activeColor === c.title;
          return (
            <button
              key={c.title}
              role="option"
              aria-selected={active}
              className={`color-card${active ? ' active' : ''}`}
              style={{ '--swatch': c.hex, '--tint': c.soft }}
              onClick={() => pick(c.title)}
            >
              <span className="color-swatch" aria-hidden />
              <span className="color-name">{c.title}</span>
              <span className="color-count">
                {n} style{n === 1 ? '' : 's'}
              </span>
              {active && <span className="color-tick" aria-hidden>✓</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function PromoBanners() {
  return (
    <section className="container promo-grid" aria-label="Promotions">
      <a href="#shop" className="promo tall">
        <img
          src="https://images.unsplash.com/photo-1445205170230-053b83016050?w=900&q=80&auto=format&fit=crop"
          alt="New season edit"
          loading="lazy"
        />
        <div className="promo-text">
          <p className="eyebrow">New Season</p>
          <h3>
            The Festive
            <br />
            Edit ’26
          </h3>
          <span className="btn btn-gold">Shop Now</span>
        </div>
      </a>
      <div className="promo-stack">
        <a href="#shop" className="promo">
          <img
            src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=900&q=80&auto=format&fit=crop"
            alt="Graphic tees"
            loading="lazy"
          />
          <div className="promo-text sm">
            <p className="eyebrow">Starting ₹499</p>
            <h3>Graphic Tees</h3>
          </div>
        </a>
        <a href="#shop" className="promo">
          <img
            src="https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=900&q=80&auto=format&fit=crop"
            alt="Ethnic wear"
            loading="lazy"
          />
          <div className="promo-text sm">
            <p className="eyebrow">Premium</p>
            <h3>Ethnic & Occasion</h3>
          </div>
        </a>
      </div>
    </section>
  );
}
