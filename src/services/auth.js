// ------------------------------------------------------------------
// Admin auth — route guard for the ZAREEF dashboard.
//
// NOTE: this is a client-side demo gate (constants ship in the bundle),
// suitable for a family-run store's casual barrier. For production, move
// credential checks server-side (e.g. a GAS doPost login issuing tokens).
// ------------------------------------------------------------------

const KEY = 'dm_admin_auth';

// Credentials (change here to rotate them).
// Strict single-credential gate — ONLY zareef / sareef1234@123.
const ADMIN_USER = 'zareef';
const ADMIN_PASS = 'sareef1234@123';

export function isAuthenticated() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** Returns '' on success, otherwise an error message for the UI. */
export function loginAdmin(username, password) {
  const u = String(username || '').trim();
  const p = String(password || '');
  if (!u || !p) return 'Please enter both username and password.';
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* private mode — session lasts for this tab via state */
    }
    return '';
  }
  return 'Invalid Username or Password';
}

export function logoutAdmin() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
