// AdminLogin — gate shown INSTEAD of the dashboard whenever #/admin is
// visited without a valid admin session. Calls onLogin() on success,
// which flips App's authed state and reveals the dashboard.
import React, { useState } from 'react';
import { loginAdmin } from '../services/auth.js';
import './Admin.css';

export default function AdminLogin({ onLogin, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setBusy(true);
    // Tiny delay so the button press feels acknowledged.
    window.setTimeout(() => {
      const msg = loginAdmin(username, password);
      setBusy(false);
      if (msg) {
        setErr(msg);
      } else {
        setErr('');
        onLogin();
      }
    }, 350);
  };

  return (
    <div className="ad-login-wrap">
      <form className="ad-login-card" onSubmit={submit}>
        <p className="ad-login-crown">♛</p>
        <h1>ZAREEF Admin</h1>
        <p className="ad-login-sub">Restricted area — sign in to continue.</p>

        {err && (
          <p className="ad-login-err" role="alert">
            {err}
          </p>
        )}

        <label htmlFor="al-user">Username</label>
        <input
          id="al-user"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          autoComplete="username"
          autoFocus
        />

        <label htmlFor="al-pass">Password</label>
        <div className="ad-pw-row">
          <input
            id="al-pass"
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
          />
          <button
            type="button"
            className="ad-pw-toggle"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? '🙈' : '👁'}
          </button>
        </div>

        <button type="submit" className="ad-btn ad-login-btn" disabled={busy}>
          {busy ? 'Verifying…' : 'Login →'}
        </button>

        <button type="button" className="ad-link back ad-login-back" onClick={onBack}>
          ← Back to Storefront
        </button>
      </form>
    </div>
  );
}
