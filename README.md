# monitor_yields

France–Germany yield monitor and simplified probability-of-default dashboard.

## What is included

- A Next.js/Vercel dashboard for French OAT and German Bund yields at 2Y, 5Y, and 10Y.
- Server-side data fetching from Banque de France and Deutsche Bundesbank.
- OAT–Bund spread calculations and flat-hazard spread-implied PD estimates.
- Hoverable charts with date-specific values for every plotted series.
- Recovery-rate sensitivity and public 5Y CDS comparison when the Boursorama pages are available.
- The original research notebook and handoff notes in `source/`.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The public Banque de France CSV export is used first. If it is unavailable, configure the optional authenticated fallback before starting the app:

```bash
WEBSTAT_API_KEY=your_key_here npm run dev
```

`WEBSTAT_API_KEY` is server-only and must not be prefixed with `NEXT_PUBLIC_`.

## Deploy to Vercel

Import this repository into Vercel with the project root set to the repository root. Vercel will detect the Next.js app automatically. Add `WEBSTAT_API_KEY` only if the public Banque de France export is unavailable.

The first version fetches current data on demand and uses a short CDN cache. It does not persist a local database. The CDS panel is a separately sourced comparison and may be unavailable for older years because the public chart history is limited.

## Research caveat

The OAT–Bund spread is a market-implied credit-risk proxy, not a literal forecast of physical sovereign default. The PD calculation is a simplified constant-hazard approximation and should be used for relative monitoring only.
