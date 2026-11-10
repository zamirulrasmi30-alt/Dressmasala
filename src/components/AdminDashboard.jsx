// Admin Dashboard — luxury analytics UI (Shopify/Stripe style).
// Glassmorphism panels, metallic metrics, trend pills, SVG iconography.
// Sidebar: Overview | Manage Dresses | Orders | Back to Website.
// - Overview: revenue / active orders / inventory metric cards,
//   7-day revenue bars, low-stock alerts, recent orders.
// - Products: full CRUD (title, price, MRP, category, image URL or file
//   upload, description, badge) synced through GAS_ENDPOINT. Stock is not
//   editable — every product is made to order (always in stock).
// - Orders: live table from the GAS backend (fallback local).
import React, { useMemo, useState } from 'react';
import { COLOR_OPTIONS, COLOR_FILTERS, TYPE_OPTIONS, getImages, firstImage, PLACEHOLDER_IMG } from '../data/products.js';
import { MADE_TO_ORDER_STOCK, computeOverview, fileToDataUrl, inr, validateProduct } from '../services/api.js';
import { customerWaLink } from '../services/order.js';
import './Admin.css';

const TABS = [
  { id: 'overview', label: 'Dashboard Overview' },
  { id: 'products', label: 'Manage Dresses' },
  { id: 'orders', label: 'Orders' },
];

// Minimal stroke icons in soft gold — sidebar + metric cards.
const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};
const TAB_ICONS = {
  overview: (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  products: (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V6a3 3 0 016 0v2" />
    </svg>
  ),
  orders: (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
      <path d="M3.5 8.5L12 13l8.5-4.5M12 13v8" />
    </svg>
  ),
};
const METRIC_ICONS = {
  revenue: (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  ),
  orders: (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
      <path d="M3.5 8.5L12 13l8.5-4.5M12 13v8" />
    </svg>
  ),
  inventory: (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M20.6 13.4L11 3.8A2 2 0 009.6 3.2H4a1 1 0 00-1 1v5.6c0 .5.2 1 .6 1.4l9.6 9.6a2 2 0 002.8 0l4.6-4.6a2 2 0 000-2.8z" />
      <circle cx="7.5" cy="7.5" r="1.4" />
    </svg>
  ),
};

// Date-range selector: Today / Yesterday / Last 7 Days / All + custom
// From–To calendar inputs. Rendered above Overview metrics and Orders.
function DateFilterBar({ preset, from, to, onPreset, onFrom, onTo }) {
  const presets = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'Last 7 Days' },
    { id: 'all', label: 'All' },
  ];
  return (
    <div className="ad-datebar" role="group" aria-label="Filter by date">
      <span className="ad-date-ico" aria-hidden>
        📅
      </span>
      {presets.map((p) => (
        <button
          key={p.id}
          className={`ad-chip${preset === p.id ? ' active' : ''}`}
          onClick={() => onPreset(p.id)}
        >
          {p.label}
        </button>
      ))}
      <span className="ad-date-sep" aria-hidden />
      <label className="ad-date-field">
        Custom Date
        <span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => onFrom(e.target.value)}
            aria-label="From date"
          />
          <em>→</em>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => onTo(e.target.value)}
            aria-label="To date"
          />
        </span>
      </label>
    </div>
  );
}

const EMPTY_FORM = {
  name: '',
  price: '',
  mrp: '',
  category: '',
  color: '',
  sku: '',
  images: ['', '', ''],
  description: '',
  // No stock field — products are always in stock (made to order).
  badge: '',
  rating: '4.5',
};

// ---------- Date filtering ----------
// Sheets locale is DD/MM/YYYY, but GAS may also return ISO strings —
// orderDayKey() normalises every supported shape to a local YYYY-MM-DD
// key so exact-date and range comparisons are simple string compares.
const toDayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

const orderDayKey = (o) => {
  const v = o?.date;
  if (!v) return '';
  if (typeof v === 'string') {
    // DD/MM/YYYY or DD-MM-YYYY (Sheets locale; also tolerates 2-digit year).
    const dmy = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (dmy) {
      let [, d, mo, y] = dmy;
      if (y.length === 2) y = '20' + y;
      return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  // Everything else (ISO strings incl. UTC) → parse to a Date and bucket
  // by LOCAL day, exactly like the Today/Yesterday/7-days presets and the
  // revenue chart buckets. Slicing the raw ISO string would use the UTC
  // calendar date and could miss late-night (IST) orders on the Today
  // filter and mis-plot them a day early in the chart.
  const t = new Date(v).getTime();
  if (Number.isNaN(t)) return '';
  return toDayKey(new Date(t));
};

const fmtDay = (key) => {
  const m = String(key).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return key;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString(
    'en-IN',
    { day: 'numeric', month: 'short' }
  );
};

export default function AdminDashboard({
  products,
  orders,
  subscribers,
  source,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onDeleteOrder = () => {},
  onRefresh,
  onExit,
  onLogout = () => {},
}) {
  const [tab, setTab] = useState('overview');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // product or null
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [sideOpen, setSideOpen] = useState(false);

  // Date filter: preset id + inclusive YYYY-MM-DD bounds. 'all' = no filter.
  const [preset, setPreset] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const applyPreset = (p) => {
    const now = new Date();
    setPreset(p);
    if (p === 'today') {
      const k = toDayKey(now);
      setFrom(k);
      setTo(k);
    } else if (p === 'yesterday') {
      const k = toDayKey(new Date(now.getTime() - 86400000));
      setFrom(k);
      setTo(k);
    } else if (p === 'week') {
      setFrom(toDayKey(new Date(now.getTime() - 6 * 86400000)));
      setTo(toDayKey(now));
    } else {
      setFrom('');
      setTo('');
    }
  };

  // Orders visible under the active date filter (auto-swaps flipped bounds).
  const visibleOrders = useMemo(() => {
    if (preset === 'all' || !from || !to) return orders;
    const [a, b] = from <= to ? [from, to] : [to, from];
    return orders.filter((o) => {
      const k = orderDayKey(o);
      return k && k >= a && k <= b;
    });
  }, [orders, preset, from, to]);

  const rangeLabel =
    preset === 'all' ? '' : from === to ? fmtDay(from) : `${fmtDay(from)} – ${fmtDay(to)}`;

  const stats = useMemo(
    () => computeOverview(products, orders, subscribers),
    [products, orders, subscribers]
  );

  // Week-over-week trends (last 7 days vs the 7 before) for the
  // glowing pills beside Revenue and Orders.
  const trends = useMemo(() => {
    const now = Date.now();
    const W = 7 * 86400000;
    const inRange = (o, from, to) => {
      const t = new Date(o.date).getTime();
      return !Number.isNaN(t) && t >= from && t < to;
    };
    const cur = orders.filter((o) => inRange(o, now - W, now));
    const prev = orders.filter((o) => inRange(o, now - 2 * W, now - W));
    const revenue = (arr) => arr.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const pct = (c, p) => {
      if (p > 0) return ((c - p) / p) * 100;
      return c > 0 ? 100 : NaN;
    };
    return { revPct: pct(revenue(cur), revenue(prev)), ordPct: pct(cur.length, prev.length) };
  }, [orders]);

  const trendPill = (pctValue) => {
    if (!Number.isFinite(pctValue)) {
      return <span className="trend flat">· steady</span>;
    }
    const up = pctValue >= 0;
    return (
      <span className={`trend ${up ? 'up' : 'down'}`}>
        {up ? '▲' : '▼'} {Math.abs(pctValue).toFixed(1)}% this week
      </span>
    );
  };

  // Metrics follow the date filter: revenue / active / totals recompute
  // from visibleOrders while inventory stays global. When there are NO
  // real orders, every order metric defaults STRICTLY to 0 — ₹0 revenue,
  // 0 orders, 0 active — nothing can inherit or invent a fallback number.
  const viewStats = useMemo(() => {
    const base =
      preset === 'all' ? stats : computeOverview(products, visibleOrders, subscribers);
    if (!base.totalOrders) {
      return { ...base, revenue: 0, totalOrders: 0, activeOrders: 0 };
    }
    return base;
  }, [preset, stats, products, visibleOrders, subscribers]);

  const flash = (msg) => {
    setNotice(msg);
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(() => setNotice(''), 2600);
  };

  // Chart follows the ACTIVE period: Today/Yesterday → 1 bar, Last 7 Days
  // (and All) → the trailing 7 days, Custom range → one bar per day in the
  // range (capped at 31 days before falling back to the 7-day view). Every
  // bar's total is summed live from real orders — no static values.
  const chartDays = useMemo(() => {
    if (preset !== 'all' && from && to) {
      const [a, b] = from <= to ? [from, to] : [to, from];
      const start = new Date(`${a}T00:00:00`);
      const end = new Date(`${b}T00:00:00`);
      const span = Math.round((end - start) / 86400000) + 1;
      if (span >= 1 && span <= 31) {
        const days = [];
        const d = new Date(start);
        while (d <= end) {
          days.push(toDayKey(d));
          d.setDate(d.getDate() + 1);
        }
        return days;
      }
    }
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push(toDayKey(d));
    }
    return list;
  }, [preset, from, to]);

  const bars = useMemo(() => {
    const buckets = new Map(chartDays.map((k) => [k, { key: k, label: fmtDay(k), total: 0 }]));
    orders.forEach((o) => {
      const b = buckets.get(orderDayKey(o));
      if (b) b.total += Number(o.total) || 0;
    });
    const arr = chartDays.map((k) => buckets.get(k));
    const max = Math.max(1, ...arr.map((d) => d.total));
    return arr.map((d) => ({ ...d, h: Math.round((d.total / max) * 100) }));
  }, [chartDays, orders]);

  const chartTitle =
    preset === 'all' || !from || !to
      ? 'last 7 days'
      : from === to
        ? fmtDay(from)
        : `${fmtDay(from)} – ${fmtDay(to)}`;

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      `${p.name} ${p.category} ${p.id} ${p.sku || ''} ${p.color || ''}`.toLowerCase().includes(q)
    );
  }, [products, query]);

  // Exact SKU lookup (e.g. ZAR-WHT-01) → instant result popup card.
  const skuHit = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return null;
    return products.find((p) => String(p.sku || '').toUpperCase() === q) || null;
  }, [products, query]);

  /* ---------- form handlers ---------- */

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErr('');
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name, price: String(p.price), mrp: String(p.mrp ?? ''),
      category: p.category, color: p.color ?? '', sku: p.sku ?? '',
      images: [...getImages(p), '', '', ''].slice(0, 3),
      description: p.description ?? '',
      badge: p.badge ?? '', rating: String(p.rating ?? 4.5),
    });
    setFormErr('');
    setShowForm(true);
  };

  const setImageAt = (i, val) =>
    setForm((f) => {
      const cur = Array.isArray(f.images) ? f.images : ['', '', ''];
      // Ensure array always has 3 slots so indices 0,1,2 are safe
      const padded = [...cur, '', ''].slice(0, 3);
      return { ...f, images: [0, 1, 2].map((j) => (j === i ? val : padded[j] || '')) };
    });

  // Single-slot upload: each image tile owns its file input, so clicking
  // a box uploads/replaces that EXACT view (Main / Detail / Logo-Tag).
  const onFileSlot = async (i, e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await fileToDataUrl(file);
      setImageAt(i, url);
      flash(`View ${i + 1} image attached.`);
    } catch (err) {
      setFormErr(err.message);
    }
  };

  const submitForm = async (e) => {
    e.preventDefault();
    const err = validateProduct(form);
    if (err) {
      setFormErr(err);
      return;
    }
    setBusy(true);
    try {
      // Explicit 3-view payload: trimmed per-slot array PLUS the
      // comma-joined transport string, so View 2/3 can never be stripped
      // between the form, the api layer and GAS — whichever shape the
      // backend stores, all 3 views survive the round trip.
      const views = [0, 1, 2].map((i) => String(form.images?.[i] || '').trim());
      const payload = {
        ...form,
        images: views.filter(Boolean),
        image: views.filter(Boolean).join(','),
      };
      if (editing) {
        const src = await onUpdate(editing.id, payload);
        flash(
          src === 'fallback'
            ? `“${form.name}” saved locally — will sync to Sheets when GAS reconnects.`
            : `“${form.name}” updated ♛`
        );
      } else {
        const src = await onCreate(payload);
        flash(
          src === 'fallback'
            ? `“${form.name}” saved locally — will sync to Sheets when GAS reconnects.`
            : `“${form.name}” added to catalog ♛`
        );
      }
      setShowForm(false);
    } catch (ex) {
      setFormErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  const askDelete = async (p) => {
    if (!window.confirm(`Delete “${p.name}” permanently?`)) return;
    await onDelete(p.id);
    flash(`“${p.name}” deleted.`);
  };

  // Complete & delete an order — clears a finished delivery from the
  // Orders tab (Sheets) and the offline cache in one confirm.
  const askDeleteOrder = async (o) => {
    if (
      !window.confirm(
        `Mark order ${o.orderId} as COMPLETE and delete it permanently?\n\nThis also removes it from the Google Sheets Orders tab — metrics and revenue will recompute without it.`
      )
    )
      return;
    setBusy(true);
    try {
      await onDeleteOrder(o.orderId);
      flash(`Order ${o.orderId} completed & cleared.`);
    } catch (ex) {
      flash(`Could not clear ${o.orderId} — ${ex.message}`);
    } finally {
      setBusy(false);
    }
  };

  const goTab = (id) => {
    setTab(id);
    setSideOpen(false);
  };

  /* ---------- render ---------- */

  return (
    <div className="admin">
      <div className="ad-ambient" aria-hidden="true" />
      {sideOpen && <div className="ad-scrim" onClick={() => setSideOpen(false)} />}

      {/* Sidebar */}
      <aside className={`ad-side ${sideOpen ? 'open' : ''}`} aria-label="Admin navigation">
        <div className="ad-brand">
          ♛ ZAREEF<small>ADMIN</small>
        </div>
        <p className="ad-nav-label">Manage</p>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`ad-link ${tab === t.id ? 'active' : ''}`}
            onClick={() => goTab(t.id)}
          >
            <span className="ico">{TAB_ICONS[t.id]}</span> {t.label}
          </button>
        ))}
        <button className="ad-link back" onClick={onExit}>
          ← Back to Website
        </button>
        <p className="ad-src">
          <span className={`ad-dot ${source === 'gas' ? 'live' : ''}`} />
          {source === 'gas' ? 'Live · Google Sheets' : 'Local mode · connect GAS'}
        </p>
      </aside>

      {/* Main */}
      <div className="ad-main">
        <div className="ad-top">
          <button className="ad-hamburger" aria-label="Open menu" onClick={() => setSideOpen(true)}>
            ☰
          </button>
          <div>
            <h1>
              {tab === 'overview' && 'Dashboard Overview'}
              {tab === 'products' && 'Manage Dresses'}
              {tab === 'orders' && 'Orders'}
            </h1>
            <p>
              {loading
                ? 'Syncing with Google Sheets…'
                : `${products.length} products · ${orders.length} orders`}
            </p>
          </div>
          <div className="ad-search">
            {(tab === 'products' || tab === 'orders') && (
              <input
                placeholder={tab === 'products' ? 'Search products or SKU…' : 'Search orders…'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search"
              />
            )}
            <button className="ad-btn ghost" onClick={onRefresh}>
              ⟳ Refresh
            </button>
            <button className="ad-btn danger" onClick={onLogout} title="Log out and return home">
              ⏻ Logout
            </button>
            {tab === 'products' && (
              <button className="ad-btn" onClick={openAdd}>
                + Add Product
              </button>
            )}
          </div>
        </div>

        {/* Date filter — drives Overview metrics + Orders list */}
        {(tab === 'overview' || tab === 'orders') && (
          <DateFilterBar
            preset={preset}
            from={from}
            to={to}
            onPreset={applyPreset}
            onFrom={(v) => {
              setFrom(v);
              setPreset('custom');
            }}
            onTo={(v) => {
              setTo(v);
              setPreset('custom');
            }}
          />
        )}

        {/* ===== OVERVIEW ===== */}
        {tab === 'overview' && (
          <>
            <div className="ad-cards">
              <div className="ad-card">
                <span>Total Revenue</span>
                <strong>{inr(viewStats.revenue)}</strong>
                <div className="trend-row">
                  {preset === 'all' ? (
                    trendPill(trends.revPct)
                  ) : (
                    <span className="trend gold">◷ {rangeLabel}</span>
                  )}
                  <em>
                    {viewStats.totalOrders} order{viewStats.totalOrders === 1 ? '' : 's'}
                    {preset === 'all' ? ' lifetime' : ' in period'}
                  </em>
                </div>
                <span className="ad-metric-ico">{METRIC_ICONS.revenue}</span>
              </div>
              <div className="ad-card">
                <span>Active Orders</span>
                <strong>{viewStats.activeOrders}</strong>
                <div className="trend-row">
                  {preset === 'all' ? (
                    trendPill(trends.ordPct)
                  ) : (
                    <span className="trend gold">◷ {rangeLabel}</span>
                  )}
                  <em>processing / shipped</em>
                </div>
                <span className="ad-metric-ico">{METRIC_ICONS.orders}</span>
              </div>
              <div className="ad-card">
                <span>Inventory</span>
                <strong>{stats.productCount}</strong>
                <em>
                  {stats.madeToOrder === stats.productCount && stats.productCount > 0
                    ? 'Every piece made to order ♛'
                    : `${stats.units} units in stock`}
                </em>
                <span className="ad-metric-ico">{METRIC_ICONS.inventory}</span>
              </div>
            </div>

            <div className="ad-panels">
              <div className="ad-panel">
                <h3>Revenue — {chartTitle}</h3>
                <div className="ad-bars">
                  {bars.map((b) => (
                    <div className="ad-bar" key={b.key} title={`${b.label}: ${inr(b.total)}`}>
                      <i style={{ height: `${Math.max(4, b.h)}%` }} />
                      <small>{b.label}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ad-panel">
                <h3>⚠ Low stock (≤ 5)</h3>
                {stats.lowStock.length === 0 ? (
                  <p style={{ color: 'var(--ad-muted)', fontSize: '.88rem' }}>
                    All stocked up — nothing running low. ♛
                  </p>
                ) : (
                  <ul className="ad-low">
                    {stats.lowStock.slice(0, 5).map((p) => (
                      <li key={p.id}>
                        <img src={firstImage(p)} alt="" />
                        <span>
                          <strong>{p.name}</strong>
                          <br />
                          <small style={{ color: 'var(--ad-muted)' }}>{p.category}</small>
                        </span>
                        <span className="stock-pill">{p.stock} left</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="ad-table-wrap">
              <div className="ad-table-scroll">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Recent orders</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOrders.slice(0, 5).map((o) => (
                      <tr key={o.orderId}>
                        <td>
                          <strong>{o.orderId}</strong>
                          <br />
                          <small style={{ color: 'var(--ad-muted)' }}>{o.items}</small>
                        </td>
                        <td>{o.name}</td>
                        <td>{inr(o.total)}</td>
                        <td>
                          <span className={`status-pill ${o.status}`}>{o.status}</span>
                        </td>
                      </tr>
                    ))}
                    {visibleOrders.length === 0 && (
                      <tr>
                        <td colSpan={4} className="ad-empty">
                          No orders received on this date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ===== PRODUCTS ===== */}
        {tab === 'products' && (
          <>
            {/* Instant SKU result popup: image, name, price, stock */}
            {skuHit && (
              <div className="sku-hit" role="status">
                <img src={firstImage(skuHit)} alt="" />
                <div className="sku-hit-info">
                  <strong>{skuHit.name}</strong>
                  <small>
                    {skuHit.sku} · {inr(skuHit.price)} ·{' '}
                    <span className={Number(skuHit.stock) <= 5 ? 'low' : ''}>
                      {Number(skuHit.stock) >= MADE_TO_ORDER_STOCK
                        ? 'Made to order'
                        : `${skuHit.stock} in stock`}
                    </span>
                  </small>
                </div>
                <div className="row-actions">
                  <button
                    onClick={() => {
                      openEdit(skuHit);
                      setQuery('');
                    }}
                  >
                    Edit
                  </button>
                  <button className="del" onClick={() => setQuery('')}>
                    Clear
                  </button>
                </div>
              </div>
            )}
            <div className="ad-table-wrap">
            <div className="ad-table-scroll">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Color</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="ad-prod">
                          <img src={firstImage(p)} alt="" loading="lazy" />
                          <span>
                            <strong>{p.name}</strong>
                            <small>
                              {p.id}
                              {p.sku ? ` · ${p.sku}` : ''}
                            </small>
                          </span>
                        </div>
                      </td>
                      <td>{p.category}</td>
                      <td>
                        {(() => {
                          const hex =
                            COLOR_FILTERS.find(
                              (c) => c.title.toLowerCase() === String(p.color || '').toLowerCase()
                            )?.hex || '#666';
                          return p.color ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              <span
                                style={{
                                  width: 16, height: 16, borderRadius: '50%',
                                  background: hex, border: '1px solid rgba(255,255,255,.4)',
                                  display: 'inline-block',
                                }}
                              />
                              {p.color}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--ad-muted)' }}>—</span>
                          );
                        })()}
                      </td>
                      <td>
                        {inr(p.price)}{' '}
                        <small style={{ color: 'var(--ad-muted)' }}>
                          <s>{inr(p.mrp)}</s>
                        </small>
                      </td>
                      <td>
                        {Number(p.stock) >= MADE_TO_ORDER_STOCK ? (
                          <span style={{ color: 'var(--ad-muted)', fontSize: '.8rem', whiteSpace: 'nowrap' }}>
                            Made to order ♛
                          </span>
                        ) : (
                          p.stock
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button onClick={() => openEdit(p)}>Edit</button>
                          <button className="del" onClick={() => askDelete(p)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="ad-empty">
                        No products match “{query}”.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}

        {/* ===== ORDERS ===== */}
        {tab === 'orders' && (
          <div className="ad-table-wrap">
            <div className="ad-table-scroll">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Notify</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders
                    .filter((o) =>
                      `${o.orderId} ${o.name} ${o.phone}`.toLowerCase().includes(query.toLowerCase())
                    )
                    .map((o) => (
                      <tr key={o.orderId}>
                        <td>
                          <strong>{o.orderId}</strong>
                          <br />
                          <small style={{ color: 'var(--ad-muted)' }}>{o.items}</small>
                        </td>
                        <td>{new Date(o.date).toLocaleDateString('en-IN')}</td>
                        <td>
                          {o.name}
                          <br />
                          <small style={{ color: 'var(--ad-muted)' }}>{o.phone}</small>
                        </td>
                        <td>{inr(o.total)}</td>
                        <td>
                          <span className={`status-pill ${o.status}`}>{o.status}</span>
                        </td>
                        <td>
                          {(() => {
                            const link = customerWaLink(o);
                            return link ? (
                              <button
                                className="wa-btn"
                                title={`Notify ${o.name} on WhatsApp`}
                                onClick={() => window.open(link, '_blank', 'noopener')}
                              >
                                💬 Notify
                              </button>
                            ) : (
                              <span style={{ color: 'var(--ad-muted)', fontSize: '.8rem' }}>
                                No phone
                              </span>
                            );
                          })()}
                        </td>
                        <td>
                          <button
                            className="ad-del-order"
                            title="Complete & delete this order (removes it from Sheets)"
                            disabled={busy}
                            onClick={() => askDeleteOrder(o)}
                          >
                            ✓ Complete &amp; Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  {visibleOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="ad-empty">
                        No orders received on this date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Product add/edit modal */}
      {showForm && (
        <div className="ad-modal-back" onClick={() => !busy && setShowForm(false)}>
          <div className="ad-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={editing ? 'Edit product' : 'Add product'}>
            <h2>{editing ? 'Edit Product' : 'Add New Product'}</h2>
            <p>Synced to Google Sheets via GAS_ENDPOINT{source === 'gas' ? ' (live)' : ' (local mode — connect GAS to sync)'}.</p>
            {formErr && <p className="ad-form-err">{formErr}</p>}
            <form onSubmit={submitForm}>
              <div className="ad-form-grid">
                <div className="ad-field full">
                  <label htmlFor="pf-title">Title *</label>
                  <input
                    id="pf-title"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Banarasi Silk Saree"
                  />
                </div>
                <div className="ad-field">
                  <label htmlFor="pf-price">Price (₹) *</label>
                  <input
                    id="pf-price"
                    type="number"
                    min="1"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="999"
                  />
                </div>
                <div className="ad-field">
                  <label htmlFor="pf-mrp">MRP (₹)</label>
                  <input
                    id="pf-mrp"
                    type="number"
                    min="0"
                    value={form.mrp}
                    onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                    placeholder="1499"
                  />
                </div>
                <div className="ad-field">
                  <label htmlFor="pf-cat">Type / Category *</label>
                  <select
                    id="pf-cat"
                    value={TYPE_OPTIONS.includes(form.category) ? form.category : ''}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    required
                  >
                    <option value="">— Select type —</option>
                    <option value="T-Shirt">T-Shirt (Standard Fit)</option>
                    <option value="Oversized">Oversized</option>
                  </select>
                </div>
                <div className="ad-field">
                  <label>Stock</label>
                  <p
                    style={{
                      margin: '10px 0 0', padding: '13px 15px',
                      border: '1px dashed var(--ad-line)', borderRadius: 10,
                      fontSize: '.85rem', color: 'var(--ad-muted)',
                    }}
                  >
                    Made to order — always in stock ♛
                  </p>
                </div>
                <div className="ad-field">
                  <label htmlFor="pf-color">Color *</label>
                  <select
                    id="pf-color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    required
                  >
                    <option value="">— Select color —</option>
                    {COLOR_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ad-field full">
                  <label>Images * — click a box to upload (Main, Design Detail, Logo / Tag)</label>
                  <div className="ad-img-tiles">
                    {['Main Image (1st View) *', 'Design Detail (2nd View)', 'Logo / Tag (3rd View)'].map(
                      (label, i) => {
                        const filled = (form.images[i] || '').trim();
                        return (
                          <div key={label} className="ad-img-slot">
                            <label
                              className="ad-img-tile"
                              title={`Click to upload ${label.replace(/ \*$/, '').toLowerCase()} image`}
                            >
                              {filled ? (
                                <img
                                  className="ad-img-preview"
                                  src={form.images[i]}
                                  alt={`Preview view ${i + 1}`}
                                  onError={(e) => {
                                    // Preview-only swap — loop-guarded.
                                    if (!e.currentTarget.src.includes('photo-1521572267360')) {
                                      e.currentTarget.src = PLACEHOLDER_IMG;
                                    }
                                  }}
                                />
                              ) : (
                                <span className="ad-img-plus" aria-hidden>
                                  +
                                </span>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => onFileSlot(i, e)}
                                aria-label={`Upload ${label.replace(/ \*$/, '')} image`}
                              />
                            </label>
                            <span className="ad-img-caption">{label}</span>
                            {filled ? (
                              <button
                                type="button"
                                className="ad-btn ghost ad-img-remove"
                                onClick={() => setImageAt(i, '')}
                              >
                                Remove view {i + 1}
                              </button>
                            ) : null}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
                <div className="ad-field full">
                  <label htmlFor="pf-desc">Description</label>
                  <textarea
                    id="pf-desc"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Fabric, fit, care…"
                  />
                </div>
                <div className="ad-field">
                  <label htmlFor="pf-badge">Badge</label>
                  <input
                    id="pf-badge"
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                    placeholder="New / Best Seller…"
                  />
                </div>
                <div className="ad-field">
                  <label htmlFor="pf-rating">Rating</label>
                  <input
                    id="pf-rating"
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: e.target.value })}
                  />
                </div>
                <div className="ad-field">
                  <label htmlFor="pf-sku">SKU (auto if empty)</label>
                  <input
                    id="pf-sku"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                    placeholder="e.g. ZAR-RED-03"
                  />
                </div>
              </div>
              <div className="ad-modal-actions">
                <button
                  type="button"
                  className="ad-btn ghost"
                  disabled={busy}
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="ad-btn" disabled={busy}>
                  {busy ? 'Saving…' : editing ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notice && <div className="ad-toast" role="status">{notice}</div>}
    </div>
  );
}
