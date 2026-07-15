# Landing Page

Static/SSG marketing site — Next.js 16 + Tailwind + Vercel. No database, no auth.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
```

## Ship

```bash
npm run build
vercel --prod
```

## Where things live

- `app/page.tsx` — the landing page itself (replace the hero copy).
- `app/globals.css` — OKLCH design tokens. Source of truth is `.planning/DESIGN.md`.
- `.env.example` — nothing required; copy to `.env.local` only if you add analytics.

This is an MVP skeleton. Build the real sections per `.planning/ROADMAP.md`.
