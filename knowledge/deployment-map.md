# Deployment Map
> Per-project deploy configs. Updated: 2026-03-23

## Vercel Projects
| Project | Domain | Deploy Command | Notes |
|---------|--------|---------------|-------|
| qualiafinal | qualiasolutions.net | `vercel --prod` | Company site |
| aquador | aquador.vercel.app | `vercel --prod` | Moayadalqam org |
| vero | vero.vercel.app | `vercel --prod` | Tier 1 |
| aibossbrainz | aibossbrainz.vercel.app | `vercel --prod` | Tier 1 |
| maud | maud.vercel.app | `vercel --prod` | |
| mpm | mpm.vercel.app | `vercel --prod` | |
| inrvo | inrvo.vercel.app | `vercel --prod` | CSP headers |
| under | underdogsales.vercel.app | `vercel --prod` | Retell AI voice |
| sofiatesting | sofiatesting.vercel.app | `vercel --prod` | Most complex agent |
| qualia ERP | portal.qualiasolutions.net | auto-deploy from master | Internal |

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
