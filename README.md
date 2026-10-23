# SplitTicket BD — Web App (Phase 1 MVP)

Bangladesh Railway split-ticket finder — web version of the
`TonmoyNaimur/split-ticket-finder` Chrome extension
(fork: `Mdibrahim789/split-ticket-finder`).

## Phase 1 status
- ✅ Search form + local Smart Fill (EN/Banglish, no API key needed)
- ✅ Scan flow with live Seat Matrix (demo data, clearly labelled)
- ✅ Best-combo ranking — `findRoutes()` ported from the extension
- ✅ Visual route timeline, route cards, total fare, e-ticket buy links
- ✅ Passenger filter + no-ticket gap control (0–5)
- ⏳ Phase 2: live seat data via extension bridge (the Shohoz API needs an
  e-ticket session token, so a standalone site cannot fetch it directly)

## Run locally
```bash
npm install
npm run dev      # development
npm run build    # production build -> dist/
npm run preview  # preview the build
```

## Deploy (Cloudflare Pages)
Build command: `npm run build` • Output directory: `dist`

## Structure
- `src/lib/algorithm.js` — split-route finder (ported)
- `src/lib/parsers.js` — date/class parsers + Smart Fill (ported/adapted)
- `src/lib/demoData.js` — demo route + seats (replace in Phase 2)
- `src/App.jsx` — UI

> Demo data only — seat numbers are NOT real. Not an official
> Bangladesh Railway app.
