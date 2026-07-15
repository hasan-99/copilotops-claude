# Deployment Map
> Per-project deploy configs. Updated: 2026-03-26

## Vercel Projects
| Project | Domain | Deploy Command | Notes |
|---------|--------|---------------|-------|
| qualiafinal | qualiasolutions.net | `vercel --prod` | Company site |
| aquador | aquador.vercel.app | `vercel --prod` | |
| vero | veromodels.com | `vercel --prod` | Tier 1 |
| aibossbrainz | aibossbrainz.vercel.app | `vercel --prod` | Tier 1 |
| maud | maud.vercel.app | `vercel --prod` | |
| mpm | mpm.vercel.app | `vercel --prod` | |
| inrvo | innrvo.com | `vercel --prod` | Being refactored |
| under | ai.underdogsales.com | `vercel --prod` | Retell AI voice |
| sofiatesting | sofiatesting.vercel.app | `vercel --prod` | Most complex agent |
| qualia ERP | qualia-erp.vercel.app | `vercel --prod` | Internal |
| marco | — | `vercel --prod` | |
| Alkemy | — | `vercel --prod` | |
| pastrikos-panels | — | `vercel --prod` | New (2026-03-24) |

## Cloudflare Workers
| Project | Worker URL | Deploy Command |
|---------|-----------|---------------|
| armenius | armenius-webhook.yellow-mountain-8da2.workers.dev | `wrangler deploy` |

## Special Cases
- glluztech: custom domain glluztech.com (NOT glluztech.vercel.app — 404s)
- armenius widget: qualia-widgets.vercel.app (separate from webhook worker)

## Post-Deploy Checklist
1. HTTP 200: `curl -s -o /dev/null -w "%{http_code}" <url>`
2. Auth flow works
3. No console errors
4. API latency < 500ms
5. UptimeRobot: https://stats.uptimerobot.com/bKudHy1pLs
