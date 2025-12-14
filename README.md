# Clash of the Titans – Static Site Skeleton

This is a clean, production-friendly static skeleton for the Clash of the Titans race series. It includes all sections you asked for and a structure you can wire to WooCommerce, Stripe Checkout, or your main site.

## Structure
```
clash-site/
├── index.html
├── styles.css
├── script.js
├── events/
│   ├── round-1.html
│   └── round-2.html
└── assets/
    ├── data/
    ├── img/
    │   ├── media/
    │   └── sponsors/
    │       └── sample-sponsor.svg
    └── pdf/
```

## What to customize first
1. **Classes**: Edit the class cards in `index.html` and replace rules/payouts links with your PDFs under `assets/pdf`.
2. **Registration**: Link the “Add to Cart” buttons to WooCommerce product URLs or Stripe Checkout sessions.
3. **Schedule**: Update dates and tracks. Each event has a dedicated page in `/events` – duplicate `round-1.html` as needed.
4. **Points**: Replace the sample tables in the Points section. If you later want CSV import/automation, we can wire a small script.
5. **Past Races**: Drop photos/videos and link your YouTube/Vimeo. Add ladders/results PDFs under `assets/pdf`.
6. **Merch**: Point these to your existing store URLs.
7. **Sponsors**: Replace `assets/img/sponsors/sample-sponsor.svg` with real logos and update `index.html`.

## Deploy
- Upload the contents of this folder to your subdomain hosting for `clash.nitrousoutlet.com`.
- Ensure `index.html` is at the web root of that subdomain’s document root.

## Notes
- No build step required. Everything is HTML/CSS/JS and fast.
- Lighthouse-friendly defaults with semantic HTML and accessible tab panels.
- Fonts loaded from Google Fonts (Inter + Archivo).
