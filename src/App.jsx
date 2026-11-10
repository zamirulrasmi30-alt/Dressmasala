// ------------------------------------------------------------------
// ZAREEF �?" App shell with hash routing:
//   site  (default)  �+' Navbar �+' Hero �+' Marquee �+' Categories �+'
//                       FeaturedProducts (live from GAS) �+' PromoBanners �+'
//                       AboutUs -> ContactUs -> Location ->
//   #/admin          �+' dark Admin Dashboard (overview / products /
//                       orders / subscribers) synced via GAS_ENDPOINT.
// ------------------------------------------------------------------
import React, { useCallback, useEffect, useState } from 'react';
import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import { Marquee, Categories } from './components/Sections.jsx';
import FeaturedProducts from './components/FeaturedProducts.jsx';
import { Footer, SearchOverlay, WhatsAppFab } from './components/Extras.jsx';
import { AboutUs, ContactUs, Location } from './components/KnowUs.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import AdminLogin from './components/AdminLogin.jsx';
import ShirtCustomizer from './components/ShirtCustomizer.jsx';
import { isAuthenticated, logoutAdmin } from './services/auth.js';
import { CartDrawer, WishlistDrawer } from './components/Drawers.jsx';
import CheckoutModal from './components/CheckoutModal.jsx';
import {
  buildReceipt,
  genOrderId,
  receiptDate,
  validateCheckout,
  waLink,
  DEFAULT_SIZE,
} from './services/order.js';
import {
  createProduct,
  deleteOrder,
  deleteProduct,
  fetchOrders,
  fetchProducts,
  fetchSubscribers,
  placeOrder,
  updateProduct,
} from './services/api.js';
import { FALLBACK_PRODUCTS } from './data/products.js';

const isAdminRoute = () => window.location.hash.startsWith('#/admin');

export default function App() {
  const [route, setRoute] = useState(isAdminRoute() ? 'admin' : 'site');

  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [orders, setOrders] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [source, setSource] = useState('fallback');
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState('');
  // Shared T-Shirt color filter: color cards �+" product grid.
  const [colorFilter, setColorFilter] = useState('All');

  // Wishlist (liked product ids) �?" persisted across visits.
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('dm_wishlist') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('dm_wishlist', JSON.stringify(wishlist));
    } catch {
      /* ignore */
    }
  }, [wishlist]);

  // Drawer visibility.
  const [cartOpen, setCartOpen] = useState(false);
  const [wishOpen, setWishOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = cartOpen || wishOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [cartOpen, wishOpen]);

  // ---- data loading (products + orders + subscribers) ----
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, o, s] = await Promise.all([
        fetchProducts(),
        fetchOrders(),
        fetchSubscribers(),
      ]);
      setProducts(p.products);
      setOrders(o.orders);
      setSubscribers(s.subscribers);
      setSource(p.source === 'gas' || o.source === 'gas' ? 'gas' : 'fallback');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [p, o, s] = await Promise.all([
        fetchProducts(),
        fetchOrders(),
        fetchSubscribers(),
      ]);
      if (!alive) return;
      setProducts(p.products);
      // Catalog invariant: flag duplicate product IDs (receipts rely on them).
      const seen = new Set();
      const dupes = p.products.filter((x) => seen.has(x.id) || !seen.add(x.id));
      if (dupes.length) {
        console.warn(
          '[ZAREEF] Duplicate product IDs detected:',
          dupes.map((x) => x.id)
        );
      }
      setOrders(o.orders);
      setSubscribers(s.subscribers);
      setSource(p.source === 'gas' || o.source === 'gas' ? 'gas' : 'fallback');
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ---- hash routing: #/admin �-" site anchors (#home, #about, �?�) ----
  // Returning from admin silently re-syncs the catalog in the background
  // (no loading flash) so new/edited/deleted dresses are instantly live.
  useEffect(() => {
    const onHash = () => {
      const admin = isAdminRoute();
      let leavingAdmin = false;
      setRoute((prev) => {
        leavingAdmin = prev === 'admin' && !admin;
        if (prev !== (admin ? 'admin' : 'site')) {
          // Scroll to section when hash is #customized, otherwise scroll to top
          if (window.location.hash === '#customized') {
            const customizedSection = document.getElementById('customized');
            if (customizedSection) {
              customizedSection.scrollIntoView({ behavior: 'smooth' });
            }
          } else {
            window.scrollTo(0, 0);
          }
        }
        return admin ? 'admin' : 'site';
      });
      if (leavingAdmin) {
        fetchProducts().then(({ products: rows, source: src }) => {
          setProducts(rows);
          if (src === 'gas') setSource('gas');
        });
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Ctrl/Cmd+K opens search (storefront only).
  useEffect(() => {
    const fn = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!isAdminRoute()) setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  /* ---- admin CRUD (optimistic UI + GAS sync inside api.js) ---- */

  const handleCreate = async (data) => {
    const { product, source } = await createProduct(data);
    setProducts((prev) => [product, ...prev]);
    return source;
  };

  const handleUpdate = async (id, data) => {
    const { product, source } = await updateProduct(id, data);
    // Instant shared-state merge: admin table AND the storefront
    // Collections grid re-render from the same array — no reload needed.
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...product } : p)));
    return source;
  };

  const handleDelete = async (id) => {
    await deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Clear an order (completed delivery): delete from Sheet/local cache
  // FIRST (inside deleteOrder), then drop it from shared state so the
  // admin list AND overview metrics recompute without it.
  const handleOrderDelete = async (orderId) => {
    await deleteOrder(orderId);
    setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
    return true;
  };

  const exitAdmin = () => {
    window.location.hash = '#home';
  };

  // ---- admin auth gate (persists via localStorage flag) ----
  const [authed, setAuthed] = useState(() => isAuthenticated());

  const handleLogout = () => {
    logoutAdmin();
    setAuthed(false);
    exitAdmin();
  };

  const addToBag = (p, size = DEFAULT_SIZE) => {
    setCart((c) => [...c, { id: p.id, size }]);
    setToast(`${p.name} (${size}) added to bag �T>`);
    window.clearTimeout(addToBag._t);
    addToBag._t = window.setTimeout(() => setToast(''), 2200);
  };

  /* ---- wishlist (heart toggles �-" navbar badge �-" drawer) ---- */

  const toggleWishlist = (p) => {
    // Pure toggle: liked derives from the current render's state and the
    // toast fires OUTSIDE the setWishlist updater (setState calls inside
    // another updater are an anti-pattern and double-fire in StrictMode).
    const liked = wishlist.includes(p.id);
    setWishlist(liked ? wishlist.filter((id) => id !== p.id) : [...wishlist, p.id]);
    setToast(liked ? `${p.name} removed from wishlist` : `${p.name} saved to wishlist \u2665`);
    window.clearTimeout(toggleWishlist._t);
    toggleWishlist._t = window.setTimeout(() => setToast(''), 2200);
  };

  // Keep the wishlist honest with the live catalog: a GAS refetch or an
  // admin delete can retire a product id — pruning orphans guarantees the
  // navbar badge (wishlist.length) always matches the items the wishlist
  // drawer can actually show (no more "Nothing liked yet" under a badge).
  const productIds = React.useMemo(() => new Set(products.map((p) => String(p.id))), [products]);
  useEffect(() => {
    if (!productIds.size) return; // catalog not loaded yet — never wipe
    setWishlist((w) => {
      const clean = w.filter((id) => productIds.has(String(id)));
      return clean.length === w.length ? w : clean;
    });
  }, [productIds]);

  /* ---- cart drawer: grouped lines, qty, checkout ---- */

  /* ---- cart lines keyed by product + size ---- */

  const lines = React.useMemo(() => {
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const map = new Map();
    cart.forEach(({ id, size }) => {
      if (!byId[id]) return;
      const key = `${id}__${size}`;
      if (!map.has(key)) map.set(key, { product: byId[id], size, qty: 0 });
      map.get(key).qty += 1;
    });
    return [...map.values()];
  }, [cart, products]);

  const wishItems = React.useMemo(() => {
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    return wishlist.map((id) => byId[id]).filter(Boolean);
  }, [wishlist, products]);

  const incQty = (id, size) => setCart((c) => [...c, { id, size }]);
  const decQty = (id, size) => {
    setCart((c) => {
      const i = c.findIndex((x) => x.id === id && x.size === size);
      return i === -1 ? c : [...c.slice(0, i), ...c.slice(i + 1)];
    });
  };
  const removeLine = (id, size) =>
    setCart((c) => c.filter((x) => !(x.id === id && x.size === size)));
  // Move a line's quantity to another size (merges if target exists).
  const changeSize = (id, oldSize, newSize) => {
    if (oldSize === newSize) return;
    setCart((c) =>
      c.map((x) => (x.id === id && x.size === oldSize ? { ...x, size: newSize } : x))
    );
  };

  // WhatsApp checkout: validate �+' receipt + GAS sync + instant admin update.
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  // Direct-buy lines (ORDER NOW) override the bag at checkout; null = use bag.
  const [directLines, setDirectLines] = useState(null);
  const checkoutLines = directLines ?? lines;
  const checkoutTotal =
    checkoutLines.reduce((s, l) => s + l.product.price * l.qty, 0) +
    (checkoutLines.reduce((s, l) => s + l.product.price * l.qty, 0) >= 999 || checkoutLines.length === 0 ? 0 : 79);

  // ORDER NOW: single item/size straight to the checkout modal (bag untouched).
  const handleOrderNow = (p, size) => {
    setDirectLines([{ product: p, size, qty: 1 }]);
    setCheckoutOpen(true);
  };

  const closeCheckout = () => {
    setCheckoutOpen(false);
    setDirectLines(null);
  };

  const handleConfirmOrder = async (form) => {
    const err = validateCheckout(form);
    if (err) throw new Error(err);
    // "Your bag is empty" check is bypassed when ordering directly via ORDER NOW/BUY NOW
    // (directLines takes precedence over cart lines).
    // if (!checkoutLines.length) throw new Error('Your bag is empty.');
    const broken = checkoutLines.find((l) => !l?.product?.id || !l?.product?.name);
    if (broken) {
      throw new Error('Bag contains an unknown item �?" please remove and re-add it.');
    }

    const total = checkoutTotal;
    const orderId = genOrderId(orders.map((o) => o.orderId));
    const date = new Date().toISOString();
    const address = `${form.street.trim()}, ${form.city.trim()} - ${form.pincode.trim()}`;
    const record = {
      orderId,
      date,
      items: checkoutLines
        .map(
          (l) =>
            `${l.product.name}${l.product.color ? ` (${l.product.color})` : ''} x${l.qty} [${l.size}]`
        )
        .join(', '),
      total,
      name: form.name.trim(),
      phone: form.phone.trim(),
      address,
      status: 'Processing',
    };

    // 1) Instant UI: admin metrics/tables/date-filter update immediately.
    setOrders((prev) => [record, ...prev]);
    // 2) Clear only what was ordered (direct-buy leaves the bag intact).
    if (directLines) {
      setDirectLines(null);
    } else {
      setCart([]);
    }
    setCartOpen(false);
    // 3) Persist to GAS (local fallback inside) + reconcile.
    placeOrder(record)
      .then(() => fetchOrders())
      .then(({ orders: rows }) => {
        setOrders((prev) => {
          const ids = new Set(rows.map((o) => o.orderId));
          const missing = prev.filter((o) => !ids.has(o.orderId));
          return [...missing, ...rows];
        });
      })
      .catch(() => {
        /* local record already in state */
      });

    // 4) WhatsApp receipt + redirect link for the success view.
    const receipt = buildReceipt({
      orderId,
      date: receiptDate(),
      name: record.name,
      phone: record.phone,
      street: form.street.trim(),
      city: form.city.trim(),
      pincode: form.pincode.trim(),
      lines: checkoutLines,
      total,
    });
    return { orderId, link: waLink(receipt) };
  };

  /* ---- admin view (login gate first �-" dashboard never opens directly) ---- */
  if (route === 'admin' && !authed) {
    return <AdminLogin onLogin={() => setAuthed(true)} onBack={exitAdmin} />;
  }

  if (route === 'admin') {
    return (
      <AdminDashboard
        products={products}
        orders={orders}
        subscribers={subscribers}
        source={source}
        loading={loading}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onDeleteOrder={handleOrderDelete}
        onRefresh={loadAll}
        onExit={exitAdmin}
        onLogout={handleLogout}
      />
    );
  }

  /* ---- storefront ---- */
  return (
    <>
      <Navbar
        cartCount={cart.length}
        wishlistCount={wishlist.length}
        onSearch={() => setSearchOpen(true)}
        onCart={() => setCartOpen(true)}
        onWishlist={() => setWishOpen(true)}
      />

      <main>
        <Hero />
        <Marquee />
        <Categories
          products={products}
          activeColor={colorFilter}
          onSelect={setColorFilter}
        />
        <FeaturedProducts
          products={products}
          source={source}
          loading={loading}
          onAdd={addToBag}
          onOrderNow={handleOrderNow}
          colorFilter={colorFilter}
          onResetColor={() => setColorFilter('All')}
          wishlist={wishlist}
          onToggleWishlist={toggleWishlist}
        />
        <AboutUs />
        <ContactUs />
        <Location />
        <ShirtCustomizer id="customized" />
      </main>

      <Footer />

      {/* Site-wide floating WhatsApp chat button (all pages/sections) */}
      <WhatsAppFab />

      {searchOpen && (
        <SearchOverlay
          products={products}
          onClose={() => setSearchOpen(false)}
          onAdd={(p) => {
            addToBag(p);
            setSearchOpen(false);
          }}
        />
      )}

      <CartDrawer
        open={cartOpen}
        lines={lines}
        onClose={() => setCartOpen(false)}
        onInc={incQty}
        onDec={decQty}
        onRemove={removeLine}
        onSize={changeSize}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />
      <CheckoutModal
        open={checkoutOpen}
        lines={checkoutLines}
        total={checkoutTotal}
        onClose={closeCheckout}
        onConfirm={handleConfirmOrder}
      />
      <WishlistDrawer
        open={wishOpen}
        items={wishItems}
        onClose={() => setWishOpen(false)}
        onMoveToBag={(p) => {
          addToBag(p);
          setWishOpen(false);
          setCartOpen(true);
        }}
        onRemove={(id) => setWishlist((w) => w.filter((x) => x !== id))}
        onBrowse={() => {
          setWishOpen(false);
          document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1d1712',
            color: '#fff',
            padding: '13px 24px',
            borderRadius: 999,
            fontSize: '.88rem',
            letterSpacing: '.04em',
            zIndex: 80,
            boxShadow: '0 16px 40px rgba(0,0,0,.3)',
          }}
        >
          {toast} Bag ({cart.length})
        </div>
      )}

      {/* Hash navigation: smooth scroll to sections */}
      <script
        dangerouslySetInnerHTML={{__html: `
          window.addEventListener('hashchange', function() {
            if (window.location.hash === '#customized') {
              var element = document.getElementById('customized');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }
          });
        `}}
      />
    </>
  );
}