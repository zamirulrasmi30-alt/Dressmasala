// Footer + WhatsAppFab + SearchOverlay.
import React, { useState } from 'react';
import { inr } from '../services/api.js';
import { firstImage } from '../data/products.js';
import { CLIENT_WHATSAPP_NUMBER } from '../services/order.js';
import './Sections.css';

/** Floating WhatsApp chat button — fixed bottom-right on every page. */
export function WhatsAppFab() {
  const href = `https://wa.me/${CLIENT_WHATSAPP_NUMBER}?text=${encodeURIComponent(
    'Hi, I have a query regarding customization'
  )}`;
  return (
    <a
      className="wa-fab"
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Chat with us on WhatsApp"
    >
      <svg viewBox="0 0 32 32" className="wa-fab-ico" aria-hidden focusable="false">
        <path
          fill="currentColor"
          d="M16 2C8.3 2 2 8.3 2 16c0 2.5.7 4.9 1.9 7L2 30l7.2-1.9c2 1.1 4.3 1.7 6.8 1.7 7.7 0 14-6.3 14-14S23.7 2 16 2Zm0 25.4c-2.2 0-4.3-.6-6.1-1.7l-.5-.3-4.3 1.1 1.2-4.1-.4-.5A11.1 11.1 0 0 1 4.6 16C4.6 9.7 9.7 4.6 16 4.6S27.4 9.7 27.4 16 22.3 27.4 16 27.4Zm6.3-8.4c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.6-.5-.8-.5h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8 0 1.6 1.2 3.2 1.3 3.5.2.2 2.4 3.6 5.7 5.1.8.3 1.4.5 1.9.7.8.2 1.5.2 2.1.1.6-.1 2-.8 2.3-1.6.3-.8.3-1.5.2-1.6-.1-.2-.3-.2-.6-.4Z"
        />
      </svg>
      <span className="wa-fab-label">Let&apos;s Chat</span>
    </a>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="foot-grid">
          <div>
            <p className="foot-brand">♛ ZAREEF</p>
            <p style={{ marginTop: 12, maxWidth: 34 + 'ch' }}>
              Premium quality. Modern style. Made for your everyday journey.
            </p>
          </div>
          <div>
            <h5>Shop</h5>
            <a href="#shop">New Arrivals</a>
            <a href="#shop">T-Shirts</a>
            <a href="#collections">Collections</a>
            <a href="#shop">Sale</a>
          </div>
          <div>
            <h5>Know Us</h5>
            <a href="#about">About Us</a>
            <a href="#contact">Contact Us</a>
            <a href="#location">Location</a>
            <a href="#/admin">Admin Dashboard</a>
          </div>
          <div>
            <h5>Support</h5>
            <a href="#contact">Track Order</a>
            <a href="#contact">Returns</a>
            <a href="#about">Our Promise</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 Zareef Clothing Store. All rights reserved.</span>
          <span>Backend: Google Apps Script · Database: Google Sheets</span>
        </div>
      </div>
    </footer>
  );
}

export function SearchOverlay({ products, onClose, onAdd }) {
  const [q, setQ] = useState('');
  const results = q.trim()
    ? products
        .filter((p) => (p.name + ' ' + p.category).toLowerCase().includes(q.toLowerCase()))
        .slice(0, 6)
    : [];
  return (
    <div className="search-overlay" onClick={onClose} role="dialog" aria-label="Search">
      <div className="search-box" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          placeholder="Search tees, kurtas, dresses…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="search-results">
          {results.map((p) => (
            <button key={p.id} onClick={() => onAdd(p)}>
              <img src={firstImage(p)} alt="" />
              <span>
                <strong>{p.name}</strong>
                <br />
                <small>
                  {p.category} · {inr(p.price)}
                </small>
              </span>
            </button>
          ))}
          {q.trim() && !results.length && (
            <p style={{ padding: 16 }}>No matches for “{q}”.</p>
          )}
        </div>
      </div>
    </div>
  );
}
