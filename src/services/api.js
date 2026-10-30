// ------------------------------------------------------------------
// GAS API layer — talks to the Google Apps Script Web App (doGet/doPost)
// that sits in front of the Google Sheet database.
//
// Deploy gas/Code.gs as a Web App (Anyone access) and paste the
// /exec URL into GAS_ENDPOINT below (or a .env VITE_GAS_ENDPOINT).
//
// Every function degrades gracefully: if GAS is unreachable or not
// configured, a localStorage-backed store is used so the storefront
// AND the admin dashboard keep working (flagged source:'fallback').
// ------------------------------------------------------------------

import { COLOR_OPTIONS, FALLBACK_PRODUCTS, isValidImageSrc, splitImageString } from '../data/products.js';

// 👉 PASTE your Apps Script Web App /exec URL here after deploying.
export const GAS_ENDPOINT = 
  import.meta.env.VITE_GAS_ENDPOINT || 
  'https://script.google.com/macros/s/AKfycbyLxLwZPIPG7mwYduEPmqVyhfkL_JF2TspNdP7YSNIUOEOyRL-3ZBXmmM6_J4zb3xsX/exec';
export const isGasConfigured = () => !GAS_ENDPOINT.includes('PASTE_YOUR');

/* ---------------- local fallback store (localStorage) ---------------- */

const LS = {
  products: 'dm_products',
  orders: 'dm_orders',
  subscribers: 'dm_subscribers',
  messages: 'dm_messages',
};

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* storage full/blocked — ignore, app still works in-memory */
  }
}

/**
 * Product-cache saver with graceful degradation. localStorage holds roughly
 * 5 MB; every uploaded image is a ~45k-char data URL (up to 3 per product),
 * so an UNBOUNDED catalog can outgrow the quota. A naive try/catch silently
 * dropped the WHOLE write — the cache then went stale and old products
 * "reappeared". Instead, on QuotaExceededError we retry with progressively
 * slimmer copies:
 *   pass 1 — strip image payloads (keep id/name/price/stock/color/sku so
 *            the offline fallback still lists everything sensibly),
 *   pass 2 — halve the list (newest entries are kept — callers prepend new
 *            products) until it fits, floor at a single entry.
 * Google Sheets remains the real database; the cache is an offline bonus,
 * so shedding image bytes is always better than losing the whole catalog.
 */
function saveProductsCache(list) {
  try {
    localStorage.setItem(LS.products, JSON.stringify(list));
    return;
  } catch {
    /* out of quota — degrade below */
  }
  let slim = (Array.isArray(list) ? list : []).map((p) => ({
    ...p,
    image: '',
    images: [],
  }));
  try {
    localStorage.setItem(LS.products, JSON.stringify(slim));
    return;
  } catch {
    /* still too big — halve below */
  }
  while (slim.length > 1) {
    slim = slim.slice(0, Math.ceil(slim.length / 2));
    try {
      localStorage.setItem(LS.products, JSON.stringify(slim));
      return;
    } catch {
      /* keep halving */
    }
  }
  try {
    localStorage.setItem(LS.products, JSON.stringify([]));
  } catch {
    /* storage fully blocked — in-memory state still works */
  }
}

function localProducts() {
  const saved = lsGet(LS.products, null);
  // Seed the demo catalog ONLY when nothing was ever cached. An existing
  // (possibly empty) array is intentional truth — e.g. every product
  // deleted via GAS — and must NOT be silently replaced by the demo seed.
  const source = Array.isArray(saved) ? saved : [...FALLBACK_PRODUCTS];
  // Backfill `color` for items cached before the color feature existed,
  // so old local/Sheet rows still appear under the right filter.
  const byId = Object.fromEntries(FALLBACK_PRODUCTS.map((p) => [p.id, p]));
  let touched = false;
  const merged = source.map((p) => {
    let out = p;
    const fb = byId[p.id];
    if (fb && (!out.color || !out.sku)) {
      touched = true;
      out = { ...out, color: out.color || fb.color, sku: out.sku || fb.sku };
    }
    // Sanitize the gallery: split comma-joined caches, drop invalid slots,
    // rewrite BOTH fields. This kills the old wrap-whole-string bug where a
    // joined `image` masqueraded as one view and hid View 2/3 on reload.
    const fromArr = Array.isArray(out.images)
      ? out.images.filter(isValidImageSrc).slice(0, 3)
      : [];
    const fromStr = fromArr.length
      ? []
      : splitImageString(out.image).filter(isValidImageSrc).slice(0, 3);
    const gallery = fromArr.length ? fromArr : fromStr;
    const joined = gallery.join(',');
    // Only flag genuine changes — an already-slim cache entry (quota
    // degradation stripped its images) must not retrigger writes on read.
    if (out.image !== joined || !Array.isArray(out.images) || out.images.length !== gallery.length) {
      touched = true;
      out = { ...out, images: gallery, image: joined };
    }
    return out;
  });
  if (!Array.isArray(saved) || touched) saveProductsCache(merged);
  return merged;
}

// Seed demo orders once so the admin overview looks alive offline.
function seedOrders() {
  return [
    {
      orderId: 'DM-ORD-DEMO1',
      date: new Date(Date.now() - 86400000).toISOString(),
      items: 'Passion Rose Graphic Tee x1',
      total: 799,
      name: 'Aarav Sharma',
      phone: '+91 98111 22233',
      status: 'Shipped',
    },
    {
      orderId: 'DM-ORD-DEMO2',
      date: new Date(Date.now() - 2 * 86400000).toISOString(),
      items: 'Floral Summer Dress x1, Essential Hoodie x1',
      total: 2998,
      name: 'Diya Patel',
      phone: '+91 98222 33344',
      status: 'Processing',
    },
  ];
}

/* ---------------- low-level GAS transport ---------------- */

// Pinned fetch policy for every GAS call:
// - redirect:'follow' — /exec answers 302 → script.googleusercontent.com;
//   an unpinned/blocked redirect surfaces as net::ERR_FAILED (TypeError).
// - mode:'cors' — readable responses for GET + POST round trips.
const GAS_FETCH_BASE = { redirect: 'follow', mode: 'cors' };

// Actions that are safe to re-send after an opaque/CORS-blocked attempt.
// product_* are idempotent upsert/delete-by-id on the Sheet; order,
// subscribe and contact use appendRow — a blind retry could DOUBLE-APPEND
// rows, so they are deliberately excluded from the no-cors fallback.
const RETRYABLE_ACTIONS = new Set(['product_add', 'product_update', 'product_delete']);

async function gasGet(action, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${GAS_ENDPOINT}?action=${action}&_=${Date.now()}`, {
      ...GAS_FETCH_BASE,
      signal: controller.signal,
    });
    // CORS or network failures: return empty object instead of throwing
    if (!res.ok) return {};
    return await res.json();
  } catch (e) {
    // Network error / CORS block — fall back to empty data
    return {};
  } finally {
    clearTimeout(timer);
  }
}

// POST policy: 'text/plain;charset=utf-8' is a CORS-"simple" Content-Type,
// so the browser skips the OPTIONS preflight entirely — the Origin header
// is never challenged and Access-Control-Allow-Origin blocks cannot occur
// on the request itself. JSON.stringify carries the payload; the Apps
// Script doPost reads e.postData.contents and JSON.parse()s it.
async function gasPost(payload, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const body = JSON.stringify(payload);
  const headers = { 'Content-Type': 'text/plain;charset=utf-8' };
  try {
    const res = await fetch(GAS_ENDPOINT, {
      ...GAS_FETCH_BASE,
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
    // Opaque response (never expected in cors mode, guarded anyway):
    // the body WAS delivered — do not attempt res.json() on it.
    if (res.type === 'opaque') return { ok: true, opaque: true };
    // Product CRUD: an HTTP failure means the Sheet did NOT receive the
    // write — surface it so the caller persists locally instead of
    // falsely reporting success (which would desync the next full refetch).
    // Order/subscribe/contact keep the legacy graceful { ok:true } so
    // storefront flows never break on a bad response.
    if (!res.ok && RETRYABLE_ACTIONS.has(payload?.action)) {
      throw new Error(`GAS responded HTTP ${res.status}`);
    }
    if (!res.ok) return { ok: true };
    return await res.json().catch(() => ({ ok: true }));
  } catch (e) {
    // CORS/network block or HTTP failure on the READABLE request. For
    // idempotent product writes, a mode:'no-cors' retry still delivers
    // the body to the Sheet (response is opaque and unreadable, the
    // write is not). Orders and subscribes skip this to avoid duplicate
    // rows.
    if (RETRYABLE_ACTIONS.has(payload?.action)) {
      try {
        const nc = new AbortController();
        const nct = setTimeout(() => nc.abort(), timeoutMs);
        await fetch(GAS_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          redirect: 'follow',
          headers,
          body,
          signal: nc.signal,
        });
        clearTimeout(nct);
        return { ok: true, opaque: true };
      } catch {
        /* no-cors retry also failed — propagate so callers fall back */
        throw new Error(`GAS unreachable (${e.message})`);
      }
    }
    return { ok: true };
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- products ---------------- */

/** Parse an `images` field from GAS (array, JSON string, or comma-joined). */
function parseImagesField(val) {
  if (Array.isArray(val)) {
    const clean = val.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 3);
    if (clean.length) return clean;
  }
  if (typeof val === 'string' && val.trim()) {
    // splitImageString() protects data URLs (whose `;base64,` holds a comma).
    const parts = splitImageString(val);
    if (parts.length) return parts;
  }
  return [];
}

/** Normalise a Sheet row into the product shape the UI expects. */
function normaliseRow(row, i) {
  // Gallery: prefer `images`, else legacy columns — joined with commas
  // first so a comma-packed `image` string splits back into its views
  // (splitImageString protects data URLs), else safe fallback.
  let images = parseImagesField(row.images ?? row.Images);
  if (!images.length) {
    const cols = [row.image ?? row.Image, row.image2 ?? row.Image2, row.image3 ?? row.Image3]
      .map((s) => String(s || '').trim())
      .filter(Boolean);
    images = splitImageString(cols.join(','));
  }
  if (!images.length) images = [FALLBACK_PRODUCTS[i % FALLBACK_PRODUCTS.length].image];
  // Uniform contract: `image` is ALWAYS the comma-joined transport string
  // (safe for single-column Sheets), `images` the parsed array. Render
  // paths must use firstImage()/getGallery() — never `p.image` raw.
  return {
    id: String(row.id ?? row.ID ?? `DM-${i + 1}`).trim(),
    sku: String(row.sku ?? row.SKU ?? '').trim(),
    name: String(row.name ?? row.Name ?? 'New Arrival'),
    category: String(row.category ?? row.Category ?? 'New In'),
    price: Number(row.price ?? row.Price ?? 999),
    mrp: Number(row.mrp ?? row.MRP ?? row.price ?? 1499),
    rating: Number(row.rating ?? row.Rating ?? 4.5),
    badge: String(row.badge ?? row.Badge ?? ''),
    image: images.join(','),
    images,
    description: String(row.description ?? row.Description ?? ''),
    color: String(row.color ?? row.Color ?? '').trim(),
    stock: Number(row.stock ?? row.Stock ?? 10),
  };
}

/** Primary (main-view) image of a product object being saved. */
function primaryImage(data) {
  // Accept the array or any (possibly joined) string, then keep only
  // genuinely renderable sources so junk URLs fail validation instead
  // of becoming broken storefront cards.
  const raw = Array.isArray(data.images) ? data.images : splitImageString(data.image);
  const imgs = raw.filter(isValidImageSrc).slice(0, 3);
  return { primary: imgs[0] || '', images: imgs };
}

/** Auto-assign a SKU like ZAR-RED-K3P9 when the admin leaves it blank. */
export function assignSku(data) {
  const given = String(data.sku || '').trim().toUpperCase();
  if (given) return given;
  const colorCode = String(data.color || 'GEN').slice(0, 3).toUpperCase();
  // Random tail, not timestamp: adding several products in one burst
  // (double-click Add, quick consecutive saves) must never mint two
  // identical SKUs within the same millisecond.
  return `ZAR-${colorCode}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/** GET product catalog. Falls back to the local store. */
export async function fetchProducts({ timeoutMs = 20000 } = {}) {
  const local = localProducts();
  if (!isGasConfigured()) {
    return { products: local, source: 'fallback' };
  }
  try {
    const json = await gasGet('products', timeoutMs);
    // gasGet swallows transport failures into {}. A parseable error
    // envelope also carries no products. Only a real sheet read counts,
    // INCLUDING an empty one — the admin may have legitimately deleted
    // every product, and "throw on empty" would resurrect them from the
    // stale cache instead of showing the (correct) empty catalog.
    if (!Object.keys(json).length || json.error) throw new Error('GAS catalog unavailable');
    const rows = Array.isArray(json) ? json : json.products || json.data || [];
    const products = rows.map(normaliseRow);
    // Mirror remote truth into the offline cache so any later fallback
    // refetch (GAS hiccup/suspension) agrees with the Sheet — deletions
    // stay deleted, additions stay listed, edits stay edited.
    saveProductsCache(products);
    return { products, source: 'gas' };
  } catch (err) {
    console.warn('[Zareef] GAS fetch failed, using local:', err.message);
    return { products: local, source: 'fallback', error: err.message };
  }
}

/** Validate the admin product form. Returns an error string or ''. */
export function validateProduct(p) {
  if (!p.name?.trim()) return 'Title is required.';
  if (!(Number(p.price) > 0)) return 'Price must be greater than 0.';
  if (!p.category?.trim()) return 'Please select a Type (T-Shirt / Oversized).';
  if (!COLOR_OPTIONS.includes(p.color)) return 'Please select a Color (Maroon, Red, Black, White, Blue).';
  if (!primaryImage(p).primary) return 'A valid Main Image is required (URL or uploaded file).';
  if (!(Number(p.stock) >= 0)) return 'Stock cannot be negative.';
  return '';
}

/** Add a product (GAS → local fallback). */
export async function createProduct(data) {
  const err = validateProduct(data);
  if (err) throw new Error(err);
  const { primary, images } = primaryImage(data);
  const product = {
    ...data,
    id:
      data.id?.trim() ||
      `DM-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`,
    sku: assignSku(data),
    price: Number(data.price),
    mrp: Number(data.mrp) || Number(data.price),
    rating: Number(data.rating) || 4.5,
    color: String(data.color || '').trim(),
    // Dual persistence: `images` array for the new backend AND a
    // comma-joined `image` string, so even a pre-update Apps Script
    // deployment (single image column) keeps View 2 + View 3 intact.
    image: images.join(',') || primary,
    images,
    stock: Number(data.stock),
  };
  if (!isGasConfigured()) {
    const list = [product, ...localProducts()];
    saveProductsCache(list);
    return { product, source: 'fallback' };
  }
  try {
    const res = await gasPost({ action: 'product_add', product }, 20000);
    // An explicit ok:false means the Sheet did NOT receive the row —
    // treat it as a failure so the local fallback below persists it.
    if (res && res.ok === false) throw new Error(res.error || 'GAS rejected the add.');
    // Mirror the add into the offline cache (same reason as delete/update:
    // a later fallback refetch must agree with what the user just did).
    saveProductsCache([product, ...localProducts()]);
    // Client-wins merge: the Sheet echo lacks the `images` array, so the
    // just-validated local product (with all 3 views) takes precedence —
    // otherwise the UI would show stale views until the next reload.
    return { product: { ...(res.product || {}), ...product }, source: 'gas' };
  } catch (e) {
    const list = [product, ...localProducts()];
    saveProductsCache(list);
    return { product, source: 'fallback', error: e.message };
  }
}

/** Edit a product (GAS → local fallback). */
export async function updateProduct(id, data) {
  const err = validateProduct({ ...data, id });
  if (err) throw new Error(err);
  const { primary, images } = primaryImage({ ...data, id });
  // Full numeric coercion (parity with createProduct): price, mrp, stock,
  // rating never round-trip as form strings, so storefront cards and the
  // admin table read identical values from state or a refetch.
  const product = {
    ...data,
    id,
    sku: assignSku({ ...data, id }),
    price: Number(data.price),
    mrp: Number(data.mrp) || Number(data.price),
    rating: Number(data.rating) || 4.5,
    color: String(data.color || '').trim(),
    image: images.join(',') || primary,
    images,
    stock: Number(data.stock),
  };
  // Mirror the edit into the offline cache. Without this, a successful GAS
  // write followed by a failed/slow storefront refetch would fall back to
  // the STALE local cache and show old prices/images.
  const syncCache = () =>
    saveProductsCache(localProducts().map((p) => (p.id === id ? { ...p, ...product } : p)));
  if (!isGasConfigured()) {
    syncCache();
    return { product, source: 'fallback' };
  }
  try {
    const res = await gasPost({ action: 'product_update', id, product }, 20000);
    // An explicit ok:false means the Sheet did NOT receive the edit —
    // treat it as a failure so the local fallback below persists it.
    if (res && res.ok === false) throw new Error(res.error || 'GAS rejected the update.');
    // Client-wins merge (see createProduct): keeps the edited views live,
    // and the cache mirror above keeps any later fallback refetch honest.
    syncCache();
    return { product: { ...(res.product || {}), ...product }, source: 'gas' };
  } catch (e) {
    syncCache();
    return { product, source: 'fallback', error: e.message };
  }
}

/** Delete a product (GAS → local fallback). */
export async function deleteProduct(id) {
  // Purge the offline cache in every path. A stale `dm_products` entry is
  // precisely what resurrects a deleted product: any later failed refetch
  // falls back to the cache and re-renders it. Deleting here means the
  // removal survives refresh/re-render even when GAS is unreachable.
  const purge = () =>
    saveProductsCache(localProducts().filter((p) => p.id !== id));
  if (!isGasConfigured()) {
    purge();
    return { ok: true, source: 'fallback' };
  }
  try {
    const res = await gasPost({ action: 'product_delete', id });
    // An explicit ok:false (HTTP 200 from GAS) means the Sheet did NOT
    // remove the row — treat it as a failure so we still report honestly.
    if (res && res.ok === false) throw new Error(res.error || 'GAS rejected the delete.');
    purge();
    return { ok: true, source: 'gas' };
  } catch (e) {
    purge();
    return { ok: true, source: 'fallback', error: e.message };
  }
}

/**
 * Convert an uploaded image file to a resized Base64 data URL for Sheets/GAS.
 * Guards: image type (MIME or extension), 15 MB size cap, decodability,
 * zero-dimension files and null canvas contexts. Transparent PNGs are
 * flattened onto white so the JPEG never renders as a black box.
 */
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/**
 * Hard budget for ONE image cell. Google Sheets cells reject content over
 * 50,000 characters — a data URL above that makes upsertProduct_'s
 * setValues throw and the whole edit silently fails to reach the Sheet.
 * 45k leaves headroom for the other 13 columns of the row.
 */
const SHEET_SAFE_URL_CHARS = 45000;

/** One encode pass: scaled canvas → JPEG data URL. */
function encodeImage(img, maxDim, quality) {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser could not process that image.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const looksImage =
      file && (file.type?.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(file.name || ''));
    if (!looksImage) {
      reject(new Error('Please choose an image file (JPG, PNG, GIF, WebP).'));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      reject(new Error('That file is over 15 MB — please pick a smaller photo.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a readable image.'));
      img.onload = () => {
        if (!img.width || !img.height) {
          reject(new Error('That image has no dimensions — try another file.'));
          return;
        }
        // Progressive compression: start at 800px / q0.82 and step down
        // quality, then dimensions, until the data URL fits inside a
        // Google Sheet cell (50k char hard limit). Guarantees the payload
        // stored in image/image2/image3 is a VALID, renderable data URL —
        // the collection page renders it directly as <img src>.
        // (Pass a truthy second arg to skip compression for non-Sheet use.)
        let url = encodeImage(img, 800, 0.82);
        const steps = [
          [800, 0.6], [640, 0.55], [480, 0.5],
          [360, 0.45], [256, 0.4], [192, 0.35],
        ];
        for (const [dim, q] of steps) {
          if (url.length <= SHEET_SAFE_URL_CHARS) break;
          try {
            url = encodeImage(img, dim, q);
          } catch {
            break; // keep the last successful encode
          }
        }
        if (!url || url.length < 100) {
          reject(new Error('Image conversion failed — try another file.'));
          return;
        }
        resolve(url);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---------------- orders & subscribers (admin) ---------------- */

export async function fetchOrders() {
  const local = lsGet(LS.orders, null) || seedOrders();
  lsSet(LS.orders, local);
  if (!isGasConfigured()) return { orders: local, source: 'fallback' };
  try {
    const json = await gasGet('orders');
    const rows = Array.isArray(json) ? json : json.orders || json.data || [];
    return { orders: rows.length ? rows : local, source: rows.length ? 'gas' : 'fallback' };
  } catch (e) {
    return { orders: local, source: 'fallback', error: e.message };
  }
}

export async function fetchSubscribers() {
  const seeds = [
    { email: 'aarav@example.com', date: new Date(Date.now() - 86400000).toISOString() },
    { email: 'diya@example.com', date: new Date(Date.now() - 2 * 86400000).toISOString() },
  ];
  const local = lsGet(LS.subscribers, null) || seeds;
  lsSet(LS.subscribers, local);
  if (!isGasConfigured()) return { subscribers: local, source: 'fallback' };
  try {
    const json = await gasGet('subscribers');
    const rows = Array.isArray(json) ? json : json.subscribers || json.data || [];
    return {
      subscribers: rows.length ? rows : local,
      source: rows.length ? 'gas' : 'fallback',
    };
  } catch (e) {
    return { subscribers: local, source: 'fallback', error: e.message };
  }
}

/** Place an order (used by future checkout; admin demo uses it too). */
export async function placeOrder(order) {
  const record = {
    orderId: `DM-ORD-${Date.now().toString(36).toUpperCase()}`,
    date: new Date().toISOString(),
    status: 'Processing',
    ...order,
  };
  lsSet(LS.orders, [record, ...lsGet(LS.orders, seedOrders())]);
  if (!isGasConfigured()) return { ok: true, orderId: record.orderId, source: 'fallback' };
  try {
    const res = await gasPost({ action: 'order', ...record });
    return { ok: true, orderId: res.orderId || record.orderId, source: 'gas' };
  } catch (e) {
    return { ok: true, orderId: record.orderId, source: 'fallback', error: e.message };
  }
}

/** POST a newsletter email (also mirrors to the local store for admin view). */
export async function subscribeEmail(email) {
  const entry = { email, date: new Date().toISOString() };
  const subs = lsGet(LS.subscribers, []);
  if (!subs.some((s) => s.email === email)) lsSet(LS.subscribers, [entry, ...subs]);
  if (!isGasConfigured()) return { ok: true, source: 'fallback' };
  try {
    return await gasPost({ action: 'subscribe', email });
  } catch {
    return { ok: true, source: 'fallback' };
  }
}

/** Contact form → GAS (action:'contact'), local fallback. */
export async function sendContactMessage({ name, email, message }) {
  const entry = { name, email, message, date: new Date().toISOString() };
  lsSet(LS.messages, [entry, ...lsGet(LS.messages, [])]);
  if (!isGasConfigured()) return { ok: true, source: 'fallback' };
  try {
    return await gasPost({ action: 'contact', ...entry });
  } catch {
    return { ok: true, source: 'fallback' };
  }
}

/* ---------------- contact (Web3Forms direct email) ---------------- */

// Web3Forms delivers the contact form straight to the owner's inbox —
// no backend needed. Replace this key with your own from
// https://web3forms.com if it ever rotates.
export const WEB3FORMS_ACCESS_KEY = '247ebd95-e7ab-4e87-a349-44b2c057fd81';
export const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

// The address every submitted message must land in. Sent as the hidden
// "email" field of the submission (keep in sync with STORE.email in
// components/KnowUs.jsx, which renders the matching hidden input).
export const CONTACT_OWNER_EMAIL = 'zareef@gmail.com';

/**
 * Send the contact form via Web3Forms. The hidden `email` field carries
 * the OWNER's address so the message is delivered directly to
 * zareef@gmail.com (temporary testing address); the customer's own address
 * rides along as
 * `customer_email` (rendered in the email body alongside name+message,
 * and usable for replies). Never throws raw network/HTTP errors —
 * every failure resolves to a clean, human-readable Error the UI can
 * show inline (400 Bad Request included).
 */
export async function sendWeb3Form({ name, email, message }) {
  // Belt-and-braces field checks (the form also validates) so an empty
  // submission can never produce a 400 from missing required data.
  const clean = {
    name: String(name || '').trim(),
    email: String(email || '').trim(),
    message: String(message || '').trim(),
  };
  if (!clean.name || !clean.email || !clean.message) {
    throw new Error('Please fill your name, a valid email and a message.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(WEB3FORMS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        // Hidden "email" field → owner inbox (matches the hidden input).
        email: CONTACT_OWNER_EMAIL,
        // Customer's details — delivered in the email the owner receives.
        customer_email: clean.email,
        name: clean.name,
        message: clean.message,
        subject: `ZAREEF — New message from ${clean.name}`,
        from_name: 'ZAREEF Website',
      }),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success !== false) return json;

    // Map every failure to a friendly, actionable message.
    const serverMsg = typeof json.message === 'string' ? json.message : '';
    if (res.status === 400) {
      throw new Error(
        serverMsg
          ? `Contact service rejected the message (${serverMsg}). Please email us directly at ${CONTACT_OWNER_EMAIL}.`
          : `Contact service rejected the message — please email us directly at ${CONTACT_OWNER_EMAIL}.`
      );
    }
    if (res.status === 429) {
      throw new Error('Too many messages sent in a short time — please try again in a few minutes.');
    }
    if (res.status >= 500) {
      throw new Error('The contact service is temporarily down — please try again shortly or email us directly.');
    }
    throw new Error(serverMsg || 'Message could not be sent — please email us directly.');
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error('The request timed out — please check your connection and try again.');
    }
    // Already a friendly Error from above — rethrow as-is.
    throw e instanceof Error ? e : new Error('Message could not be sent — please email us directly.');
  } finally {
    clearTimeout(timer);
  }
}

/** Compute dashboard metrics client-side from loaded data. */
export function computeOverview(products, orders, subscribers) {
  const revenue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const active = orders.filter((o) => !/deliver|cancel/i.test(String(o.status))).length;
  const units = products.reduce((s, p) => s + (Number(p.stock) || 0), 0);
  const lowStock = products.filter((p) => Number(p.stock) <= 5);
  return {
    revenue,
    totalOrders: orders.length,
    activeOrders: active,
    productCount: products.length,
    units,
    subscriberCount: subscribers.length,
    lowStock,
  };
}

/** Format INR prices consistently. */
export const inr = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

