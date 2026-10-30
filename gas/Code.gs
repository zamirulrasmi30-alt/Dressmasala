/**
 * ZAREEF — Google Apps Script backend
 * Database: Google Sheets. Frontend: React (src/services/api.js).
 *
 * SHEET SETUP (one spreadsheet, these tabs — headers in row 1):
 *
 *   Tab "Products":    id | name | category | price | mrp | image | rating | badge | description | color | stock | image2 | image3 | sku
 *     (append-only columns: image2/image3/sku auto-extend older sheets)
 *     (category holds the Type: "T-Shirt" or "Oversized" — drives the storefront pills.
 *      Color must be one of: Maroon, Red, Black, White, Blue — drives the storefront filters.
 *      image = Main view, image2 = Design Detail, image3 = Logo/Tag. An `images` array
 *      [url1, url2, url3] is also accepted on write and split across the 3 columns.)
 *   Tab "Orders":      orderId | date | items | total | name | phone | status | address | payment
 *     (address/payment appended — older sheets without them keep working)
 *   Tab "Subscribers": email | date
 *   Tab "Messages":    name | email | message | date   (contact form, auto-created)
 *
 * DEPLOY:
 *   1. Paste this file into https://script.google.com (one project, Code.gs).
 *   2. Deploy -> New deployment -> Web app -> Execute as: Me, Access: Anyone.
 *   3. Copy the /exec URL -> paste into src/services/api.js GAS_ENDPOINT
 *      (or set VITE_GAS_ENDPOINT in a .env file).
 *   4. Open the storefront once, then re-open the Sheet: missing tabs are
 *      auto-created with headers on first use.
 *
 * API:
 *   GET  ?action=products     -> { products: [...] }
 *   GET  ?action=orders       -> { orders: [...] }
 *   GET  ?action=subscribers  -> { subscribers: [...] }
 *   POST { action:'subscribe', email }
 *   POST { action:'contact', name, email, message }
 *   POST { action:'order', items, total, name, phone, status? } -> { ok, orderId }
 *   POST { action:'product_add', product:{...} }                -> { ok, product }
 *   POST { action:'product_update', id, product:{...} }         -> { ok, product }
 *   POST { action:'product_delete', id }                       -> { ok:true }
 */

var SHEET_PRODUCTS = 'Products';
var SHEET_ORDERS = 'Orders';
var SHEET_SUBSCRIBERS = 'Subscribers';
var SHEET_MESSAGES = 'Messages';

var PRODUCT_HEADERS = ['id', 'name', 'category', 'price', 'mrp', 'image', 'rating', 'badge', 'description', 'color', 'stock', 'image2', 'image3', 'sku'];
var ORDER_HEADERS = ['orderId', 'date', 'items', 'total', 'name', 'phone', 'status', 'address', 'payment'];
var SUBSCRIBER_HEADERS = ['email', 'date'];
var MESSAGE_HEADERS = ['name', 'email', 'message', 'date'];

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/* ---------------- GET: products / orders / subscribers ---------------- */

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'products';
    if (action === 'products') return jsonOut({ products: readProducts() });
    if (action === 'orders') return jsonOut({ orders: readAll_(SHEET_ORDERS, ORDER_HEADERS) });
    if (action === 'subscribers') return jsonOut({ subscribers: readAll_(SHEET_SUBSCRIBERS, SUBSCRIBER_HEADERS) });
    return jsonOut({ ok: true, action: action, hint: 'Use ?action=products|orders|subscribers' });
  } catch (err) {
    return jsonOut({ error: String(err), products: [], orders: [], subscribers: [] });
  }
}

/* ---------------- POST: subscribe / contact / order / product CRUD ---------------- */

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (body.action === 'subscribe' && body.email) {
      saveSubscriber_(String(body.email));
      return jsonOut({ ok: true, message: 'Subscribed' });
    }

    if (body.action === 'contact' && body.email) {
      var msh = getSheet_(SHEET_MESSAGES, MESSAGE_HEADERS);
      msh.appendRow([String(body.name || ''), String(body.email), String(body.message || ''), new Date()]);
      return jsonOut({ ok: true, message: 'Message received' });
    }

    if (body.action === 'order') {
      var id = body.orderId || ('DM-ORD-' + new Date().getTime().toString(36).toUpperCase());
      var osh = getSheet_(SHEET_ORDERS, ORDER_HEADERS);
      osh.appendRow([
        id,
        body.date ? new Date(body.date) : new Date(),
        String(body.items || ''),
        Number(body.total || 0),
        String(body.name || ''),
        String(body.phone || ''),
        String(body.status || 'Processing'),
        String(body.address || ''),
        String(body.paymentMode || body.payment || ''),
      ]);
      return jsonOut({ ok: true, orderId: id });
    }

    if (body.action === 'product_add' && body.product) {
      var added = upsertProduct_(null, body.product);
      return jsonOut({ ok: true, product: added });
    }

    if (body.action === 'product_update' && body.id) {
      var updated = upsertProduct_(String(body.id), body.product || {});
      return jsonOut({ ok: true, product: updated });
    }

    if (body.action === 'product_delete' && body.id) {
      deleteProduct_(String(body.id));
      return jsonOut({ ok: true });
    }

    return jsonOut({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

/* ---------------- sheet helpers ---------------- */

// Returns the tab, creating it with headers when missing.
function getSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
  }
  return sh;
}

// Reads a whole tab (minus header) into an array of objects.
function readAll_(name, headers) {
  var sh = getSheet_(name, headers);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  return values.slice(1).map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) {
      obj[h] = row[i];
    });
    // Serialise Dates so JSON stays clean.
    Object.keys(obj).forEach(function (k) {
      if (Object.prototype.toString.call(obj[k]) === '[object Date]') {
        obj[k] = obj[k].toISOString();
      }
    });
    return obj;
  });
}

function readProducts() {
  return readAll_(SHEET_PRODUCTS, PRODUCT_HEADERS);
}

function normaliseProduct_(id, p) {
  var price = Number(p.price || 999);
  // Gallery: accept `images` array [main, detail, logo], the 3 columns,
  // or a comma-joined string (data URLs matched whole — see splitJoined_).
  var imgs = [];
  if (p.images && p.images.length !== undefined) {
    for (var k = 0; k < p.images.length && imgs.length < 3; k++) {
      if (p.images[k]) imgs.push(String(p.images[k]));
    }
  }
  ['image', 'image2', 'image3'].forEach(function (key) {
    if (imgs.length < 3 && p[key]) {
      splitJoined_(p[key]).forEach(function (u) {
        if (imgs.length < 3) imgs.push(u);
      });
    }
  });
  return {
    id: String(id || p.id || ('DM-' + new Date().getTime().toString(36).toUpperCase())),
    sku: String(
      p.sku ||
        ('ZAR-' +
          String(p.color || 'GEN').slice(0, 3).toUpperCase() +
          '-' +
          new Date().getTime().toString(36).toUpperCase().slice(-4))
    ),
    name: String(p.name || 'New Arrival'),
    category: String(p.category || 'New In'),
    price: price,
    mrp: Number(p.mrp || price),
    image: String(imgs[0] || ''),
    rating: Number(p.rating || 4.5),
    badge: String(p.badge || ''),
    description: String(p.description || ''),
    color: String(p.color || ''),
    stock: Number(p.stock === undefined ? 10 : p.stock),
    image2: String(imgs[1] || ''),
    image3: String(imgs[2] || ''),
  };
}

// Google Sheets rejects any cell over 50,000 characters. A huge field
// (e.g. an uncompressed base64 image) would make setValues/appendRow
// throw and the ENTIRE product row would fail to save. Clamp every
// cell so one oversized value can never abort the whole write.
// The client (fileToDataUrl) already compresses uploads to fit under
// this budget — this is the last-resort server guard.
var MAX_CELL_CHARS = 49999;
function clampCell_(v) {
  var s = String(v === null || v === undefined ? '' : v);
  return s.length > MAX_CELL_CHARS ? s.slice(0, MAX_CELL_CHARS) : s;
}

// Insert (id=null) or update a product row; returns the stored object.
function upsertProduct_(id, p) {
  var sh = getSheet_(SHEET_PRODUCTS, PRODUCT_HEADERS);
  var values = sh.getDataRange().getValues();
  var targetId = id || String((p && p.id) || '');
  if (!targetId) {
    targetId = 'DM-' + new Date().getTime().toString(36).toUpperCase();
  }
  var stored = normaliseProduct_(targetId, p || {});
  var row = [stored.id, stored.name, stored.category, stored.price, stored.mrp,
             stored.image, stored.rating, stored.badge, stored.description, stored.color, stored.stock,
             stored.image2, stored.image3, stored.sku].map(clampCell_);

  // Find existing row by id (column A).
  for (var r = 2; r <= values.length; r++) {
    if (String(values[r - 1][0]) === String(targetId)) {
      sh.getRange(r, 1, 1, PRODUCT_HEADERS.length).setValues([row]);
      return stored;
    }
  }
  sh.appendRow(row);
  return stored;
}

// Splits a comma-joined image string WITHOUT breaking data URLs
// (whose `;base64,` prefix contains a comma). Base64 payloads never
// contain commas, so the data-URL branch matches them whole.
function splitJoined_(str) {
  var t = String(str || '').replace(/^\s+|\s+$/g, '');
  if (!t) return [];
  if (t.charAt(0) === '[') {
    try {
      var arr = JSON.parse(t);
      if (arr && arr.length !== undefined) {
        return arr.map(function (s) { return String(s || ''); })
          .filter(function (s) { return s.replace(/^\s+|\s+$/g, '') !== ''; })
          .slice(0, 3);
      }
    } catch (e) { /* fall through */ }
  }
  var out = t.match(/data:image\/[a-zA-Z+]+;base64,[^,]+|[^,]+/g) || [];
  return out
    .map(function (s) { return s.replace(/^\s+|\s+$/g, ''); })
    .filter(function (s) { return s !== ''; })
    .slice(0, 3);
}

function deleteProduct_(id) {
  var sh = getSheet_(SHEET_PRODUCTS, PRODUCT_HEADERS);
  var values = sh.getDataRange().getValues();
  for (var r = values.length; r >= 2; r--) {
    if (String(values[r - 1][0]) === String(id)) {
      sh.deleteRow(r);
    }
  }
}

function saveSubscriber_(email) {
  var sh = getSheet_(SHEET_SUBSCRIBERS, SUBSCRIBER_HEADERS);
  sh.appendRow([email, new Date()]);
}
