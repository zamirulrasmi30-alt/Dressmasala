// Slide-out Cart + Wishlist drawers.
// Cart: grouped lines with qty steppers and a checkout handoff.
// name/phone checkout that records the order via GAS (placeOrder).
// Wishlist: liked items with move-to-bag. Escape closes either drawer.
import React, { useEffect } from 'react';
import { inr } from '../services/api.js';
import { firstImage } from '../data/products.js';
import { SIZES } from '../services/order.js';
import './Drawers.css';

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return;
    const fn = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);
}

export function CartDrawer({ open, lines, onClose, onInc, onDec, onRemove, onSize, onCheckout }) {
  useEscape(open, onClose);

  if (!open) return null;

  // Total = item price × quantity ONLY — no shipping fee, no taxes.
  // Mirrors checkoutTotal in App.jsx so bag, checkout and the WhatsApp
  // receipt always show the identical amount.
  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Shopping bag">
        <div className="drawer-head">
          <h2>
            Shopping Bag <span>({count})</span>
          </h2>
          <button className="drawer-x" onClick={onClose} aria-label="Close bag">
            ✕
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="drawer-empty">
            <span className="big">🛍️</span>
            Your bag is empty.
            <br />
            Beautiful tees await ↓
          </div>
        ) : (
          <>
            <div className="drawer-lines">
              {lines.map(({ product: p, size, qty }) => (
                <div className="drawer-line" key={`${p.id}__${size}`}>
                  <img src={firstImage(p)} alt="" />
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {p.category}
                      {p.color ? ` · ${p.color}` : ''}
                    </small>
                    <span className="price">{inr(p.price * qty)}</span>
                    <div className="qty">
                      <button onClick={() => onDec(p.id, size)} aria-label="Decrease quantity">−</button>
                      <span>{qty}</span>
                      <button onClick={() => onInc(p.id, size)} aria-label="Increase quantity">+</button>
                      <select
                        className="size-pick"
                        value={size}
                        onChange={(e) => onSize(p.id, size, e.target.value)}
                        aria-label={`Size for ${p.name}`}
                      >
                        {SIZES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button className="line-rm" onClick={() => onRemove(p.id, size)} aria-label={`Remove ${p.name} (${size})`}>
                    🗑
                  </button>
                </div>
              ))}
            </div>
            <div className="drawer-foot">
              <div className="total-row grand">
                <span>Total</span>
                <span>{inr(total)}</span>
              </div>
              <button className="btn btn-dark" onClick={onCheckout} style={{ width: '100%' }}>
                Proceed to Checkout →
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

export function WishlistDrawer({ open, items, onClose, onMoveToBag, onRemove, onBrowse }) {
  useEscape(open, onClose);
  if (!open) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Wishlist">
        <div className="drawer-head">
          <h2>
            Wishlist <span>({items.length})</span>
          </h2>
          <button className="drawer-x" onClick={onClose} aria-label="Close wishlist">
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <div className="drawer-empty">
            <span className="big">♡</span>
            Nothing liked yet.
            <br />
            Tap the heart on any tee to save it here.
            <br />
            <br />
            <button className="btn btn-dark" onClick={onBrowse}>
              Browse Tees
            </button>
          </div>
        ) : (
          <>
            <div className="drawer-lines" style={{ paddingTop: 18 }}>
              {items.map((p) => (
                <div className="drawer-line" key={p.id}>
                  <img src={firstImage(p)} alt="" />
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {p.category}
                      {p.color ? ` · ${p.color}` : ''}
                    </small>
                    <span className="price">{inr(p.price)}</span>
                    <div className="qty">
                      <button
                        onClick={() => onMoveToBag(p)}
                        style={{ width: 'auto', padding: '0 12px', fontSize: '.75rem' }}
                      >
                        Move to Bag →
                      </button>
                    </div>
                  </div>
                  <button className="line-rm" onClick={() => onRemove(p.id)} aria-label={`Remove ${p.name} from wishlist`}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="drawer-foot">
              <button className="btn btn-dark" onClick={onBrowse}>
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
