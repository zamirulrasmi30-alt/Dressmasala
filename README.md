# ♛ ZAREEF — Clothing Store (React + Vite + GAS + Sheets)

Complete homepage rebuilt from the reference image
(`home page/WhatsApp Image 2026-10-13 at 6.27.42 PM.jpeg` — JARIFF-style hero),
rebranded to **ZAREEF**, fully responsive, with a live Google Sheets backend.

## Reference → Build mapping

| Reference element | Implementation |
|---|---|
| Logo crown + JARIFF → | `Navbar.jsx` brand lockup renamed **ZAREEF / CLOTHING STORE** |
| Menu bar | `HOME | COLLECTIONS | KNOW US ▾ | ADMIN DASHBOARD` in `Navbar.jsx` |
| Icons search / account / bag | SVG icon buttons, bag shows live cart count |
| Eyebrow `WEAR YOUR VIBE` + crown + giant serif + `CLOTHING STORE` | `Hero.jsx` slide 1, identical hierarchy |
| Tagline `Premium quality…` + `SHOP NOW →` outline button | Same copy + `.btn` outline style |
| Circular side arrows + 3 bottom dots | Working slider, 3 slides, 6s autoplay |
| Warm brown/gold palette | CSS variables `--bg-dark #2b2118`, `--gold`, Playfair/Cinzel serif |
| (homepage completion) product banners, categories, special offer | `Sections.jsx` + `Extras.jsx` |

## Run it

```cmd
cd "C:\Users\user\Desktop\dresss masala"
"C:\Program Files\nodejs\npm.cmd" install
"C:\Program Files\nodejs\npm.cmd" run dev
```

Open http://localhost:5173

> `npm.ps1` is blocked by Windows ExecutionPolicy on this machine — use `npm.cmd` as above.

## Connect the backend (2 min)

1. Create a Google Sheet with tab **Products**: `id | name | category | price | mrp | image | rating | badge | description | stock`
2. Paste `gas/Code.gs` into https://script.google.com → Deploy → Web app (`Anyone`).
3. Copy the `/exec` URL → `src/services/api.js` → `GAS_ENDPOINT` (or `.env`: `VITE_GAS_ENDPOINT=...`).
4. Reload — the note under *Featured Products* flips to `● Live from Google Sheets`.

Without the URL the site runs on the built-in fallback catalog, so it never breaks.

## Structure

```
src/
  App.jsx                 shell + cart + search + GAS load
  data/products.js        fallback catalog, categories, hero slides
  services/api.js         fetchProducts / CRUD / orders / subscribers / inr()
  components/
    Navbar.jsx/.css       HOME | COLLECTIONS | KNOW US ▾ | ADMIN DASHBOARD
    Sections.jsx          Marquee, T-Shirt Colors swatch cards, PromoBanners
    FeaturedProducts.jsx  live GAS grid + type pills + color filter
    ProductMedia.jsx      multi-image card carousel (dots + hover + swipe)
    Drawers.jsx           slide-out Cart (size + qty) + Wishlist
    CheckoutModal.jsx     address/payment form → WhatsApp receipt + GAS order
    KnowUs.jsx            About Us / Contact Us / Location (#about #contact #location)
    AdminDashboard.jsx    dark dashboard: overview, Manage Dresses (CRUD+color), orders, subscribers
    Hero.jsx/.css         exact reference hero slider
    Sections.jsx          Marquee, Categories, PromoBanners
    FeaturedProducts.jsx  live GAS grid + filters
    Extras.jsx            SpecialOffer countdown, Perks, Newsletter, Footer, Search
    Sections.css          shared section styles (responsive)
gas/Code.gs               Apps Script doGet/doPost + sheet schema
```
