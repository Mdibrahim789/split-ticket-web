# SplitTicket BD — Web App (v0.3 — Planner mode)

Bangladesh Railway split-ticket finder — web version of the
`TonmoyNaimur/split-ticket-finder` Chrome extension
(fork: `Mdibrahim789/split-ticket-finder`).

## Phase 1 status
- ✅ Search form + local Smart Fill (EN/Banglish, no API key needed)
- ✅ Scan flow with live Seat Matrix (demo data, clearly labelled)
- ✅ Best-combo ranking — `findRoutes()` ported from the extension
- ✅ Visual route timeline, route cards, total fare, e-ticket buy links
- ✅ Passenger filter + no-ticket gap control (0–5)
- ✅ Phase 2: live seat data via the Train Split Finder extension (v0.4+).
  The extension captures the user's own e-ticket session on
  eticket.railway.gov.bd, saves it inside the browser only, and runs the
  scan in its background when this app asks (window.postMessage bridge,
  `src/lib/bridge.js`). The token never reaches any server; the app only
  receives seat counts. Without the extension the app runs in demo mode.

## Run locally
```bash
npm install
npm run dev      # development
npm run build    # production build -> dist/
npm run preview  # preview the build
```

## Deploy (Vercel / Cloudflare Pages)
Build command: `npm run build` • Output directory: `dist`

## Structure
- `src/lib/algorithm.js` — split-route finder (ported)
- `src/lib/parsers.js` — date/class parsers + Smart Fill (ported/adapted)
- `src/lib/demoData.js` — demo route + seats (replace in Phase 2)
- `src/App.jsx` — UI

> Demo data only — seat numbers are NOT real. Not an official
> Bangladesh Railway app.

## Planner mode (default, web-only)
Live seat data needs a logged-in e-ticket session token, which a website
cannot obtain — so the default Planner mode works without any extension:
- Real station/train/class lists from the Railway's public handshake data
  (`src/lib/railwayData.js`, fetched 2026-10-23: 263 stations, 160 trains)
- Editable stop lists + user-saved routes (`src/lib/routes.js`)
- `src/lib/planner.js` builds an ordered checklist of station pairs to
  verify on the official site; marking pairs available/unavailable
  assembles confirmed split combos automatically.
The Scan tab keeps the demo mode and the optional extension bridge.
