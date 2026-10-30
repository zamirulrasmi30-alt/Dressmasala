// CheckoutModal — Full Name, Phone, Delivery Address (street/city/
// pincode). Validates, then hands the payload to App, which posts to GAS
// and returns the WhatsApp receipt.
// Success view: "Order Created! Redirecting to WhatsApp…" with an auto
// redirect attempt plus a manual button (popup-blocker fallback).
import React, { useEffect, useState } from 'react';
import { inr } from '../services/api.js';
import './Drawers.css';

const empty = { name: '', phone: '', street: '', city: '', pincode: '' };

export default function CheckoutModal({ open, lines, total, onClose, onConfirm }) {
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // { orderId, link }

  useEffect(() => {
    if (open) {
      setForm(empty);
      setErr('');
      setBusy(false);
      setDone(null);
    }
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    const fn = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, busy, onClose]);

  // Auto-redirect attempt once the order is created (manual button below
  // covers browsers that block programmatic popups after async work).
  useEffect(() => {
    if (done?.link) {
      const t = window.setTimeout(() => {
        try {
          window.open(done.link, '_blank', 'noopener');
        } catch {
          /* manual button remains */
        }
      }, 600);
      return () => window.clearTimeout(t);
    }
  }, [done]);

  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const res = await onConfirm(form); // { orderId, link } or throws validation msg
      setDone(res);
    } catch (ex) {
      setErr(ex.message || 'Could not place the order. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="co-overlay" onClick={() => !busy && onClose()}>
      <div className="co-modal" role="dialog" aria-label="Checkout" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="order-success">
            <span className="big">✅</span>
            <h3>Order Created!</h3>
            <p>Redirecting to WhatsApp to send your order receipt…</p>
            <code>{done.orderId}</code>
            <br />
            <a className="btn btn-dark" href={done.link} target="_blank" rel="noreferrer">
              Open WhatsApp →
            </a>
            <div style={{ marginTop: 10 }}>
              <button className="btn" style={{ borderColor: 'var(--ink)', color: 'var(--ink)' }} onClick={onClose}>
                Continue Shopping
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="co-head">
              <h2>Checkout ♛</h2>
              <button type="button" className="co-x" onClick={onClose} aria-label="Close checkout" disabled={busy}>
                ✕
              </button>
            </div>
            <p className="co-sub">
              {lines.reduce((s, l) => s + l.qty, 0)} item(s) · Total{' '}
              <strong>{inr(total)}</strong>
            </p>

            <label>
              Full Name *
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Aarav Sharma" autoComplete="name" />
            </label>
            <label>
              Phone Number *
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="e.g. 98111 22233" inputMode="tel" autoComplete="tel" />
            </label>
            <label>
              Street Address *
              <input value={form.street} onChange={(e) => set('street', e.target.value)} placeholder="Flat / Street / Area" autoComplete="street-address" />
            </label>
            <div className="co-row">
              <label>
                City *
                <input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="City" autoComplete="address-level2" />
              </label>
              <label>
                Pincode *
                <input value={form.pincode} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="400001" inputMode="numeric" autoComplete="postal-code" />
              </label>
            </div>

            {err && (
              <p className="check-err" role="alert">
                {err}
              </p>
            )}
            <button type="submit" className="btn btn-dark co-place" disabled={busy}>
              {busy ? 'Creating order…' : 'Place Order via WhatsApp →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
