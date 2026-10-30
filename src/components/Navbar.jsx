import React, { useEffect, useState } from 'react';
import './Navbar.css';

const KNOW_US_ITEMS = [
  { label: 'About Us', href: '#about', desc: 'Our story, mission & vision' },
  { label: 'Contact Us', href: '#contact', desc: 'Form, email & phone' },
  { label: 'Location', href: '#location', desc: 'Visit our store' },
];

function goAdmin() {
  window.location.hash = '#/admin';
}

export default function Navbar({ cartCount = 0, wishlistCount = 0, onSearch, onCart, onWishlist }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [mKnowOpen, setMKnowOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'Escape') {
        setDropOpen(false);
        setOpen(false);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  return (
    <>
      <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          {/* Brand — crown lockup for ZAREEF */}
          <a href="#home" className="brand" aria-label="Zareef home">
            <span>
              <span className="crown">♛</span>
              ZAREEF
              <small>CLOTHING&nbsp;STORE</small>
            </span>
          </a>

          <nav aria-label="Primary">
            <ul className="nav-links">
              <li>
                <a href="#home" className="active">
                  Home
                </a>
              </li>
              <li>
                <a href="#customized">CUSTOMIZED</a>
              </li>
              <li>
                <a href="#collections">Collections</a>
              </li>
              {/* KNOW US dropdown */}
              <li
                className={`has-dropdown ${dropOpen ? 'open' : ''}`}
                onMouseEnter={() => setDropOpen(true)}
                onMouseLeave={() => setDropOpen(false)}
              >
                <button
                  className="drop-toggle"
                  aria-haspopup="true"
                  aria-expanded={dropOpen}
                  onClick={() => setDropOpen((v) => !v)}
                  onFocus={() => setDropOpen(true)}
                >
                  Know Us <span className="caret" aria-hidden>▾</span>
                </button>
                <ul className="nav-dropdown" aria-label="Know Us">
                  {KNOW_US_ITEMS.map((item) => (
                    <li key={item.label}>
                      <a href={item.href} onClick={() => setDropOpen(false)}>
                        <strong>{item.label}</strong>
                        <small>{item.desc}</small>
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
              {/* Admin Dashboard — direct link beside KNOW US */}
              <li>
                <a href="#/admin" className="admin-link">
                  Admin Dashboard
                </a>
              </li>
            </ul>
          </nav>

          <div className="nav-icons">
            <button className="icon-btn" aria-label="Search" onClick={onSearch}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
            </button>
            <button className="icon-btn" aria-label="Wishlist" title="Wishlist" onClick={onWishlist}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path
                  d="M12 20.5C7 16.5 3.5 13.3 3.5 9.5 3.5 7 5.5 5 8 5c1.6 0 3.1.8 4 2.1C12.9 5.8 14.4 5 16 5c2.5 0 4.5 2 4.5 4.5 0 3.8-3.5 7-8.5 11z"
                  strokeLinejoin="round"
                />
              </svg>
              {wishlistCount > 0 && <span className="cart-count">{wishlistCount}</span>}
            </button>
            <button className="icon-btn" aria-label="Admin dashboard" title="Admin dashboard" onClick={goAdmin}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5" strokeLinecap="round" />
              </svg>
            </button>
            <button className="icon-btn" aria-label="Shopping bag" title="Shopping bag" onClick={onCart}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 8h12l-1 12H7L6 8z" strokeLinejoin="round" />
                <path d="M9 8V6a3 3 0 016 0v2" strokeLinecap="round" />
              </svg>
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </button>
            <button
              className="icon-btn hamburger"
              aria-label="Menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <nav className={`mobile-drawer ${open ? 'open' : ''}`} aria-label="Mobile">
        <a href="#home" onClick={() => setOpen(false)}>
          Home
        </a>
        <a href="#customized" onClick={() => setOpen(false)}>
          CUSTOMIZED
        </a>
        <a href="#collections" onClick={() => setOpen(false)}>
          Collections
        </a>
        <button
          className="mobile-group-toggle"
          aria-expanded={mKnowOpen}
          onClick={() => setMKnowOpen((v) => !v)}
        >
          Know Us <span aria-hidden>{mKnowOpen ? '▴' : '▾'}</span>
        </button>
        {mKnowOpen && (
          <div className="mobile-sub">
            {KNOW_US_ITEMS.map((item) => (
              <a key={item.label} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </a>
            ))}
          </div>
        )}
        <a href="#/admin" onClick={() => setOpen(false)} className="mobile-admin">
          Admin Dashboard →
        </a>
      </nav>
    </>
  );
}