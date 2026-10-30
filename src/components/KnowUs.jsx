// Know Us sections — targets of the navbar KNOW US dropdown:
// #about (story/mission/vision), #contact (form/email/phone),
// #location (100% online store banner with quick links).
import React, { useState } from 'react';
import { sendWeb3Form } from '../services/api.js';
import './KnowUs.css';

export const STORE = {
  email: 'zareef@gmail.com',
  phone: '9750181402',
  phoneHref: 'tel:+919750181402',
  phoneTiming: '10AM – 8PM IST',
  // 100% online store — no physical address to list.
  addressLines: ['100% Online Store (We deliver right to your doorstep!)'],
};

/* Minimal stroke social icons — same visual language as the storefront. */
const SOCIAL_STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const SOCIAL_ICONS = {
  instagram: (
    <svg viewBox="0 0 24 24" {...SOCIAL_STROKE}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" {...SOCIAL_STROKE}>
      <path d="M15 3h-2.5A3.5 3.5 0 009 6.5V9H6.5v3.5H9V21h3.5v-8.5H15l.7-3.5h-3.2V7a1 1 0 011-1H15z" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" {...SOCIAL_STROKE}>
      <path d="M4 4l16 16M20 4L4 20" />
    </svg>
  ),
  pinterest: (
    <svg viewBox="0 0 24 24" {...SOCIAL_STROKE}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 20l3-9.5M8.5 11.5c-.4-2.6 1.3-5 4-5 2.3 0 4 1.6 4 3.8 0 2.9-1.8 5.2-4.2 5.2-1 0-1.9-.5-2.2-1.3" />
    </svg>
  ),
};

const SOCIALS = [
  { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/zareef.clothing?cplk=MTN0bDdhbmE5cHE3Nw==' },
  { id: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/zareef.in' },
  { id: 'x', label: 'X (Twitter)', href: 'https://x.com/zareef_in' },
  { id: 'pinterest', label: 'Pinterest', href: 'https://www.pinterest.com/zareef_in' },
];

export function AboutUs() {
  return (
    <section className="section-pad container knowus" id="about" aria-label="About Us">
      <div className="about-grid">
        <div
          className="about-photo"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1000&q=80&auto=format&fit=crop')",
          }}
          role="img"
          aria-label="Inside the Zareef store"
        />
        <div className="about-copy">
          <p className="eyebrow" style={{ color: 'var(--accent-hover)' }}>
            Know Us · Our Story
          </p>
          <h2>
            Wear Your Vibe,
            <br />
            Made in India ♛
          </h2>
          <p className="lead">
            We are a new and growing online T-shirt brand, launched in 2026,
            focused on bringing creativity and style to everyday fashion.
          </p>
          <p>
            We offer a wide range of customized T-shirts with unique designs
            created by our team. We also provide personalized T-shirt
            customization based on customer ideas, preferences, and requirements.
          </p>
          <p>
            Our goal is to make every T-shirt unique, stylish, and special for
            every customer. We believe that fashion is a way to express your
            personality!
          </p>
          <div className="mvv">
            <div>
              <h4>🎯 Mission</h4>
              <p>Premium everyday fashion every Indian wardrobe can afford.</p>
            </div>
            <div>
              <h4>🔭 Vision</h4>
              <p>India&apos;s most loved homegrown clothing label by 2030.</p>
            </div>
            <div>
              <h4>💛 Values</h4>
              <p>Quality first, fair makers, easy returns — always.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ContactUs() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email) || !form.message.trim()) {
      setMsg('Please fill your name, a valid email and a message.');
      return;
    }
    setBusy(true);
    setMsg('Sending…');
    try {
      // Web3Forms delivers name + email + message directly to the
      // owner's inbox (see sendWeb3Form in services/api.js).
      await sendWeb3Form(form);
      setForm({ name: '', email: '', message: '' }); // reset first
      setMsg('');
      setToast('Message sent successfully! We will get back to you soon.');
      window.clearTimeout(submit._t);
      submit._t = window.setTimeout(() => setToast(''), 4500);
    } catch (ex) {
      setMsg(ex?.message || `Could not send right now — please email us directly at ${STORE.email}.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section-pad container" id="contact" aria-label="Contact Us">
      <div className="section-head">
        <div>
          <p className="eyebrow" style={{ color: 'var(--accent-hover)' }}>
            Know Us · Contact
          </p>
          <h2>Talk to Us</h2>
        </div>
        <p>Orders, sizing, bulk buys — we reply within 24 hours.</p>
      </div>

      <div className="contact-wrap">
        {/* Left — light HQ details card */}
        <div className="contact-info">
          <h3>Zareef HQ</h3>
          <p className="contact-sub">100% online — reach us on any channel below.</p>
          <div className="contact-line">
            <span className="ico" aria-hidden>
              ✉️
            </span>
            <span>
              <strong>Support Email</strong>
              <a href={`mailto:${STORE.email}`}>{STORE.email}</a>
            </span>
          </div>
          <div className="contact-line">
            <span className="ico" aria-hidden>
              📞
            </span>
            <span>
              <strong>Phone · {STORE.phoneTiming}</strong>
              <a href={STORE.phoneHref}>{STORE.phone}</a>
            </span>
          </div>
          <div className="contact-line">
            <span className="ico" aria-hidden>
              🚚
            </span>
            <span>
              <strong>Location</strong>
              <span className="v">{STORE.addressLines[0]}</span>
            </span>
          </div>
          <div className="contact-socials">
            <span className="soc-label">Follow</span>
            {SOCIALS.map((s) => (
              <a
                key={s.id}
                href={s.href}
                target={s.href.startsWith('http') ? '_blank' : undefined}
                rel={s.href.startsWith('http') ? 'noreferrer' : undefined}
                aria-label={s.label}
                title={s.label}
              >
                {SOCIAL_ICONS[s.id]}
              </a>
            ))}
          </div>
        </div>

        {/* Right — the form (Web3Forms delivery) */}
        <form className="contact-form" onSubmit={submit}>
          {/* Hidden field: routes every submission directly to the
              owner's inbox — zareef@gmail.com (mirrored in the
              API payload as `email`, customer's address as customer_email). */}
          <input type="hidden" name="email" value={STORE.email} />
          <h3>Send a Message</h3>
          <div className="form-row">
            <div>
              <label htmlFor="c-name">Name</label>
              <input
                id="c-name"
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                autoComplete="name"
                required
              />
            </div>
            <div>
              <label htmlFor="c-email">Email</label>
              <input
                id="c-email"
                name="customer_email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="c-msg">Message</label>
            <textarea
              id="c-msg"
              name="message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="How can we help?"
              required
            />
          </div>
          <div>
            <button type="submit" className="btn btn-dark" disabled={busy}>
              {busy ? 'Sending…' : 'Send Message →'}
            </button>
          </div>
          {msg && <p className="form-msg">{msg}</p>}
        </form>
      </div>

      {/* Success toast (auto-dismisses) */}
      {toast && (
        <div className="contact-toast" role="status" aria-live="polite">
          ✓ {toast}
        </div>
      )}
    </section>
  );
}

export function Location() {
  return (
    <section className="section-pad container" id="location" aria-label="Zareef is a 100% online store">
      <div className="online-card">
        <span className="online-badge" aria-hidden>
          ♛ 100% Online
        </span>
        <h2>
          No physical store,
          <br />
          we live on your screen 24/7!
        </h2>
        <p>
          Zareef is a fully online label — every piece is crafted to order and shipped
          straight from our atelier to your doorstep, anywhere in India. 🇮🇳
        </p>
        <p className="online-sub">No rent. No queues. Just premium fashion, one tap away. ✨</p>
        <div className="online-links">
          <a className="btn btn-gold" href="#collections">
            Browse Collections →
          </a>
          <a className="btn btn-dark" href="#contact">
            Contact Online Support →
          </a>
        </div>
      </div>
    </section>
  );
}
