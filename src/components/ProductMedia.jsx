// ProductMedia — multi-image carousel for storefront product cards.
// Up to 3 views (Main / Design Detail / Logo-Tag) with sleek dot
// navigation overlaid at the bottom. Dots are clickable; hovering the
// card auto-cycles; touch swipe works on mobile. Single-image products
// render statically (dots hidden) via the getImages() safe fallback.
import React, { useEffect, useRef, useState } from 'react';
import { getGallery, PLACEHOLDER_IMG } from '../data/products.js';

const VIEW_LABELS = ['Main view', 'Design detail', 'Logo / tag'];
const HOVER_MS = 2200;
const SWIPE_PX = 35;

export default function ProductMedia({ product, liked, onToggleWishlist }) {
  // Always 3 views (missing ones duplicate View 1) → 3 working dots.
  const imgs = getGallery(product);
  const [idx, setIdx] = useState(0);
  // Indexes whose <img> failed to load → swapped to the placeholder.
  // Single-swap per index (flag-gated) so a dead placeholder can't loop.
  const [failed, setFailed] = useState({});
  const timer = useRef(null);
  const touchX = useRef(null);

  // Reset the visible index AND stale per-slot error flags whenever a
  // different product's data — or a changed image for the same product —
  // arrives (e.g. after an admin edit). Lengths alone would miss a
  // same-length URL swap and keep showing the placeholder fallback, so
  // the signature hashes per-slot lengths plus the tail of View 1.
  const gallerySig = `${product.id}|${imgs.length}|${imgs
    .map((s) => String(s).length)
    .join('.')}|${String(imgs[0] || '').slice(-32)}`;
  useEffect(() => {
    setIdx(0);
    setFailed({});
  }, [gallerySig]);

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Cleanup on unmount.
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    []
  );

  const stop = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const startHover = () => {
    if (imgs.length < 2 || reduceMotion) return;
    stop();
    timer.current = setInterval(() => setIdx((i) => (i + 1) % imgs.length), HOVER_MS);
  };

  const endHover = () => {
    stop();
    setIdx(0);
  };

  const go = (i) => setIdx(((i % imgs.length) + imgs.length) % imgs.length);

  return (
    <div
      className="card-img pmedia"
      onMouseEnter={startHover}
      onMouseLeave={endHover}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (dx > SWIPE_PX) go(idx - 1);
        else if (dx < -SWIPE_PX) go(idx + 1);
        touchX.current = null;
      }}
    >
      {imgs.map((src, i) => (
        <img
          key={`${product.id}-${i}`}
          src={failed[i] ? PLACEHOLDER_IMG : src}
          alt={i === 0 ? product.name : `${product.name} — ${VIEW_LABELS[i] || `view ${i + 1}`}`}
          loading="lazy"
          draggable={false}
          aria-hidden={i !== idx}
          className={i === idx ? 'on' : ''}
          onError={() => {
            if (!failed[i]) setFailed((f) => ({ ...f, [i]: true }));
          }}
        />
      ))}

      {product.badge ? <span className="badge">{product.badge}</span> : null}

      <button
        className={`wish-btn${liked ? ' liked' : ''}`}
        aria-pressed={!!liked}
        aria-label={liked ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        title={liked ? 'Liked' : 'Add to wishlist'}
        onClick={(e) => {
          e.stopPropagation();
          if (onToggleWishlist) onToggleWishlist(product);
        }}
      >
        {liked ? '♥' : '♡'}
      </button>

      {imgs.length > 1 && (
        <div className="pmedia-dots" role="tablist" aria-label={`${product.name} images`}>
          {imgs.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === idx}
              aria-label={`${VIEW_LABELS[i] || `View ${i + 1}`} of ${product.name}`}
              className={i === idx ? 'on' : ''}
              onClick={(e) => {
                e.stopPropagation();
                setIdx(i);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
