// FeaturedProducts ("T-Shirt Types") — dynamic grid fed by GAS.
// Fixed type pills (ALL / T-SHIRTS / OVERSIZED) combine with the color
// filter; each card renders a multi-image ProductMedia carousel.
import React, { useState } from 'react';
import { COLOR_FILTERS, matchColor, matchType, typeLabel } from '../data/products.js';
import { DEFAULT_SIZE, SIZES } from '../services/order.js';
import ProductMedia from './ProductMedia.jsx';
import { inr } from '../services/api.js';
import './Sections.css';

const hexOf = (color) =>
  COLOR_FILTERS.find((c) => c.title.toLowerCase() === String(color || '').toLowerCase())?.hex ||
  '#999';

export default function FeaturedProducts({
  products,
  source,
  loading,
  onAdd,
  colorFilter = 'All',
  onResetColor,
  wishlist = [],
  onToggleWishlist,
  onOrderNow,
}) {
  // Strict pill set: ALL shows everything. matchType() is tolerant of
  // stored variants ("T-Shirt" vs legacy "T-Shirts") so admin-saved and
  // old Sheet rows filter identically.
  const pills = ['All', 'T-Shirts', 'Oversized'];
  const [filter, setFilter] = useState('All');
  // Per-card size selection (S/M/L/XL, default M) — sent with Add to Bag.
  const [sizes, setSizes] = useState({});
  const sizeOf = (id) => sizes[id] || DEFAULT_SIZE;

  // Type pill AND color card filters combine.
  const list = products.filter(
    (p) => matchType(p, filter) && matchColor(p, colorFilter)
  );

  return (
    <section className="shop-section section-pad" id="shop">
      <div className="container">
        <div className="section-head">
          <div>
            <p className="eyebrow" style={{ color: 'var(--accent-hover)' }}>
              Wear Your Vibe
            </p>
            <h2>T-Shirt Types</h2>
          </div>
          <div className="filter-row" role="tablist" aria-label="Filter by type">
            {pills.map((c) => (
              <button
                key={c}
                className={filter === c ? 'active' : ''}
                onClick={() => setFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <p className="source-note">
          Catalog source:{' '}
          {source === 'gas' ? (
            <span className="live">● Live from Google Sheets</span>
          ) : (
            <span>○ Local preview (connect GAS to go live)</span>
          )}
        </p>

        {/* Active color filter banner with reset */}
        {colorFilter !== 'All' && (
          <div className="active-filter" role="status">
            <span className="active-dot" style={{ background: hexOf(colorFilter) }} />
            Showing <strong>&nbsp;{colorFilter} T-Shirts&nbsp;</strong> ({list.length})
            <button className="reset-btn" onClick={onResetColor}>
              All Colors ×
            </button>
          </div>
        )}

        {loading ? (
          <div className="skeleton">Loading fresh styles from Zareef…</div>
        ) : list.length === 0 ? (
          <div className="skeleton">
            No {colorFilter !== 'All' ? `${colorFilter} ` : ''}styles found.{' '}
            <button className="reset-btn" onClick={onResetColor}>
              Reset Filter →
            </button>
          </div>
        ) : (
          <div className="product-grid">
            {list.map((p) => {
              // Strikethrough MRP renders ONLY when an independent MRP
              // exists and exceeds the selling price — never a price-copied
              // fallback (data layer falls back blank mrp → price, which
              // makes mrp === price and cleanly hides the strikethrough).
              // The JSX below renders inr(mrp) — the actual p.mrp value.
              const price = Number(p.price);
              const mrp = Number(p.mrp);
              const showMrp = p.mrp && Number(p.mrp) > price;
              const off = showMrp ? Math.round((1 - price / mrp) * 100) : 0;
              return (
                <article className="card" key={p.id}>
                  <ProductMedia
                    product={p}
                    liked={wishlist.includes(p.id)}
                    onToggleWishlist={onToggleWishlist}
                  />
                  <div className="card-body">
                    <span className="card-cat">
                      {p.color ? (
                        <span
                          className="card-dot"
                          style={{ background: hexOf(p.color) }}
                          title={p.color}
                        />
                      ) : null}
                      {typeLabel(p.category)}
                      {p.color ? ` · ${p.color}` : ''}
                    </span>
                    <h3 className="card-name">{p.name}</h3>
                    <span className="card-rating">★ {p.rating} · {p.stock} in stock</span>
                    <div className="card-price">
                      <strong>{inr(price)}</strong>
                      {showMrp && (
                        <>
                          <s style={{ textDecoration: 'line-through' }}>{inr(mrp)}</s>
                          {off > 0 && <em>{off}% off</em>}
                        </>
                      )}
                    </div>
                    <div className="size-row" role="radiogroup" aria-label={`Select size for ${p.name}`}>
                      {SIZES.map((s) => (
                        <button
                          key={s}
                          role="radio"
                          aria-checked={sizeOf(p.id) === s}
                          className={sizeOf(p.id) === s ? 'active' : ''}
                          onClick={() => setSizes((m) => ({ ...m, [p.id]: s }))}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <div className="card-actions">
                      <button className="btn-bag" onClick={() => onAdd(p, sizeOf(p.id))}>
                        Add to Bag
                      </button>
                      <button
                        className="btn-buy"
                        onClick={() => onOrderNow && onOrderNow(p, sizeOf(p.id))}
                      >
                        Order Now
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
