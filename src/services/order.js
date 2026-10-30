// ------------------------------------------------------------------
// ZAREEF ordering service — WhatsApp checkout + GAS order sync.
//
// 👉 STEP 1: put the store's WhatsApp number below (country code + number,
//    digits only — no '+', spaces or dashes). Order receipts open as a
//    pre-filled chat to this number.
// ------------------------------------------------------------------

import { splitImageString } from '../data/products.js';

// eslint-disable-next-line no-unused-vars
export const CLIENT_WHATSAPP_NUMBER = '919750181402';

export const SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
export const DEFAULT_SIZE = 'M';
export const PAYMENT_MODES = ['COD', 'UPI'];

/** Unique order id, e.g. #ZAR-1089 (+ time suffix on collision). */
export function genOrderId(existing = []) {
  const taken = new Set(existing);
  let id = '';
  for (let i = 0; i < 20; i++) {
    id = `#ZAR-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!taken.has(id)) return id;
  }
  return `#ZAR-${Date.now().toString(36).toUpperCase()}`;
}

/** DD-MM-YYYY for the receipt (spec format, e.g. 15-10-2026). */
export function receiptDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/** Validate checkout fields. Returns an error string or ''. */
export function validateCheckout(f) {
  if (!String(f.name || '').trim()) return 'Please enter your full name.';
  if (!/^[+\d][\d\s-]{7,}$/.test(String(f.phone || '').trim())) {
    return 'Please enter a valid phone number.';
  }
  if (!String(f.street || '').trim()) return 'Please enter your street address.';
  if (!String(f.city || '').trim()) return 'Please enter your city.';
  if (!/^\d{6}$/.test(String(f.pincode || '').trim())) {
    return 'Pincode must be 6 digits.';
  }
  return '';
}

/**
 * Check whether an image src is valid for use in a WhatsApp message.
 * Returns true for:
 *   - Non-empty strings that are not base64 data URLs
 *   - Relative image paths (e.g. "images/products/tshirt.jpg")
 *   - http(s) URLs
 * Returns false for:
 *   - Empty/null values
 *   - Base64 data URLs (would cause 4xx URI Too Long)
 *   - javascript: / ftp: URLs
 */
export const isValidImageSrc = (s) => {
  const t = String(s || '').trim();
  if (!t) return false;
  // Reject base64 data URLs (would bloat the WhatsApp URL → 4xx)
  if (/^data:image\/[a-zA-Z+]+;base64,/.test(t)) return false;
  // Reject javascript: / ftp: URLs
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return false;
  // Accept http(s) URLs and relative image paths (with image extension)
  if (/^https?:\/\//i.test(t)) return true;
  // Accept relative paths like "images/products/tshirt.jpg" or "tshirt.jpg"
  if (/\.(jpe?g|png|gif|webp|avif|bmp|svg|jfif)$/i.test(t)) return true;
  return false;
};

/** First usable (non-data:) value from a comma-joined image string or array
 *  element, protecting base64 payloads from being split at commas. */
function firstImageValue(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('data:')) return '';            // base64 cannot be embedded → 4xx
  if (s.indexOf(',') === -1) return s;
  return (splitImageString(s)[0] || '').trim();    // comma-joined transport string
}

/**
 * Make an image value clickable for WhatsApp:
 *   absolute http(s) → kept as-is
 *   protocol-relative (//cdn) → upgraded to https
 *   relative ("images/x.jpg", "/uploads/x.png") → prefixed with site origin
 *   base64 data URLs → skipped (embed = 414 URI Too Long)
 */
export function toAbsoluteUrl(u) {
  let s = String(u || '').trim();
  if (!s) return '';
  if (s.startsWith('//')) return `https:${s}`;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('data:')) return '';            // cannot embed base64
  const origin =
    (typeof window !== 'undefined' && window.location && window.location.origin) || '';
  if (!origin) return s;
  return `${origin.replace(/\/+$/, '')}/${s.replace(/^\/+/, '')}`;
}

/**
 * DIRECT product-image extraction for the WhatsApp receipt:
 *   item.image → item.images[0] → item.imageUrl → item.img
 * Relative paths become full URLs via the site origin. The Unsplash
 * fallback is used ONLY when every candidate is empty/invalid.
 */
export function resolveProductImage(item) {
  const src = item && item.product ? item.product : item || {};
  const first = Array.isArray(src.images) ? src.images[0] : '';
  const candidate =
    firstImageValue(src.image) ||
    firstImageValue(first) ||
    firstImageValue(src.imageUrl) ||
    firstImageValue(src.img);
  return toAbsoluteUrl(candidate) || 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=700&q=80&auto=format&fit=crop';
}

/**
 * Normalise receipt text BEFORE encoding: CRLF → `\n`, strip stray control
 * characters (keeping `\n`), trim trailing spaces and collapse blank runs.
 * ONLY strip Base64 `data:image` strings to prevent length errors; keep
 * http/https URLs intact.
 */
export function sanitizeReceiptText(text) {
  return String(text == null ? '' : text)
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    // ONLY strip Base64 data:image strings to prevent length errors
    .replace(/^data:image\/[a-zA-Z+]+;base64,/g, '')
    .replace(/[^\S\n]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildReceipt({ orderId, date, name, phone, street, city, pincode, lines, total }) {
  const DIV = '----------------------------------------';

  const itemLines = lines
    .map((l) => {
      const p = l.product || {};
      const title = String(p.title || p.name || 'Urban Street Oversized Tee').trim();
      // Extract the product's full live image URL (priority: image → img → imageUrl → src → photo → first array element)
      const rawImg = p.image || p.imageUrl || p.src || p.images?.[0] || '';
      let itemImageUrl = '';
      if (rawImg && !rawImg.startsWith('data:image')) {
        itemImageUrl = rawImg.startsWith('http')
          ? rawImg
          : `${window.location.origin}/${rawImg.replace(/^\/+/, '')}`;
      }
      // ONLY strip Base64 data:image strings; keep http/https intact
      if (itemImageUrl.startsWith('data:')) {
        itemImageUrl = '';
      }
      console.log('Final WhatsApp Image URL:', itemImageUrl);
      const sku = p.sku || p.id || 'N/A';
      const size = l.size || '';
      const qty = l.qty || 1;
      const price = (Number(p.price || 0) * qty).toLocaleString('en-IN');

      return (
        `- *${title}*` +
        `\n  SKU Code: ${sku}` +
        `\n  Size: ${size} | Qty: ${qty} | Price: ₹${price}` +
        `\n  ❖ Photo: ${itemImageUrl}`
      );
    })
    .join('\n');
  return [
    DIV,
    '🛍️ *NEW ORDER - ZAREEF*',
    `Order ID: ${orderId}`,
    `Date: ${date}`,
    DIV,
    '👤 *Customer Details:*',
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Address: ${street}, ${city} - ${pincode}`,
    '',
    '❖ *Order Items:*',
    itemLines,
    '',
    `💵 *Total Amount:* ₹${Number(total).toLocaleString('en-IN')}`,
    DIV,
  ].join('\n');
}

/**
 * wa.me deep link with the receipt. The text is sanitised (CRLF → `\n`,
 * control chars stripped) and then strictly `encodeURIComponent`-encoded
 * ONCE before being attached as the `text` query parameter.
 */
export function waLink(receiptText) {
  const encoded = encodeURIComponent(sanitizeReceiptText(receiptText));
  return `https://wa.me/${CLIENT_WHATSAPP_NUMBER}?text=${encoded}`;
}

/** Normalise any customer phone to the 10-digit national number so the
 *  caller can safely prefix 91 (never 9191…): strips spaces/dashes/+, */
export function cleanPhoneNumber(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
  if (d.length > 10 && d.startsWith('0')) d = d.replace(/^0+/, '');
  if (d.length > 10) d = d.slice(-10);
  return d;
}

/** Professional order-confirmation text for the customer. */
export function buildStatusMessage(order) {
  const o = order || {};
  const st = String(o.status || 'Confirmed');
  // Avoid "Processing & Processing": Processing orders get the exact
  // spec line; any other status (Shipped, Delivered…) is stated as-is.
  const statusLine = /process/i.test(st) ? 'Confirmed & Processing.' : `${st}.`;
  return [
    `Hello ${o.name || 'there'}, thank you for ordering from ZAREEF! 👑`,
    `Order ID: ${o.orderId || ''}`,
    `Status: ${statusLine}`,
    `Total Amount: ₹${Number(o.total || 0).toLocaleString('en-IN')}`,
  ].join('\n');
};

/** Direct chat link to the customer: https://wa.me/91<cleanPhone>?text=…
 * Returns '' when no usable phone number exists (button hides itself).
 */
export function customerWaLink(order) {
  const clean = cleanPhoneNumber(order?.phone);
  if (clean.length !== 10) return '';
  const msg = sanitizeReceiptText(buildStatusMessage(order));
  return `https://wa.me/91${clean}?text=${encodeURIComponent(msg)}`;
}