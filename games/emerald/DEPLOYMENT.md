# Deployment

Target: `https://madeby.re/games/emerald/`

1. Back up the current document root.
2. Upload the **contents** of this folder to the Emerald · MadeBy document root.
3. Keep `.htaccess` at the root so SPA routes resolve to `index.html`.
4. Confirm these URLs return 200:
   - `/`
   - `/styles.css?v=0.3.0`
   - `/app.js?v=0.3.0`
   - `/assets/data/map-manifest.json`
   - `/assets/maps/hero-16x9/311-route-120.webp`
5. Confirm browser CORS access to `https://emerald-api.madeby.re/api/hoenn-public?action=world` remains allowed for Emerald · MadeBy.
6. Test LIVE with real events. An empty world must show the honest quiet state, not demo content.
7. Test `/play`, `/you`, and one real `/trainer/<public-id>` route.

No backend migration is included in this package. It consumes the existing audited public API boundary.
