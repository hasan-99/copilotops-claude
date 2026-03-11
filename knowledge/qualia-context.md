# Qualia Solutions
> One-man company (Fawzi Goussous), Cyprus. Websites, AI agents, voice agents, AI automation.

## Project Inventory

### Websites (13) — `~/Projects/live/`
| Project | Status | Supabase | Hosting | Notes |
|---------|--------|----------|---------|-------|
| qualiafinal | ACTIVE | — | Vercel | Company site |
| aquador | MAINTENANCE | `hznpuxplqgszbacxzbhv` | Vercel | |
| glluztech | MAINTENANCE | — | Vercel (qualia-glluztech team) | Legacy Pages Router, custom domain glluztech.com, `glluztech.vercel.app` 404s but glluztech.com works |
| inrvo | REFACTORING | — | Vercel | CSP headers configured, currently being refactored |
| aandnglobal | DORMANT | — | — | |
| urban | DORMANT | — | — | |
| znso | DORMANT | — | — | |
| luxcars | DORMANT | — | — | Luxury aesthetic |
| maud | MAINTENANCE | `vspyxscitcuwnrhchskl` | Vercel | |
| vero | ACTIVE | `zskfdlqyzhkzefafqkpx` | Vercel | Tier 1, MCP |
| aibossbrainz | ACTIVE | `esymbjpzjjkffpfqukxw` | Vercel | Tier 1, MCP |
| mpm | MAINTENANCE | `llherorsfgbdyqkrrlpc` | Vercel | |
| Zaid | DORMANT | `uoqiwidqlsoamtugioik` | — | |

### AI Agents (7) — `~/Projects/aiagents/`
| Project | Activity | Supabase | AI Provider | Status |
|---------|----------|----------|-------------|--------|
| axidex | BUILT | planned | OpenAI | Stripe integrated, needs launch |
| dababneh | DEV | `toovladeybmlyzblqtbl` | — | |
| faris | DEV | `lrgwxcqqnhxvvrruepcv` | — | |
| Hammah | DEV | `ctcikdcjhxxqogwvtzrc` | Gemini 2.0 Flash | Arabic/English, SERVICE_ROLE_KEY exposed |
| sofiatesting | LIVE | `vceeheaxcrhmpqueudqx` | Dual AI | WhatsApp + Web, most complex |
| timo | DEV | `qgaqvkmqterlljbegniu` | OpenRouter | MVP, missing API keys |
| sigatalachana | DEV | — | Claude Opus 4.5 | Python agent (NOT web) |

### Voice (2) — `~/Projects/live/`
| Project | Status | Provider | Hosting | Supabase |
|---------|--------|----------|---------|----------|
| armenius | MAINTENANCE | ElevenLabs | Cloudflare Workers (webhook) + Vercel (widget) | — |
| under | ACTIVE | Retell AI | Vercel | `vvppyijxpgeeijiozlve` |

### ERP (ACTIVE) — `~/Projects/websites/qualia/`
Internal project management. Next.js 16, Gemini AI, VAPI, Supabase. Domain: qualia-erp.vercel.app.
Tech debt: 2,900-line actions.ts needs splitting.

## Deploy Commands
```bash
vercel --prod                              # Standard deploy
supabase db push --project-ref <ref>       # Migrations
wrangler deploy                            # Armenius only
```

## Key URLs
- Armenius webhook: `https://armenius-webhook.yellow-mountain-8da2.workers.dev` (old `armenius.fawzi-goussous.workers.dev` is dead)
- Armenius widget: `https://qualia-widgets.vercel.app`
- glluztech: custom domain `https://glluztech.com` (NOT `glluztech.vercel.app` — that 404s)

## Alerts
- Hammah: SERVICE_ROLE_KEY exposed in .env.local
- Timo: Empty API keys (won't work)
- glluztech: Legacy Pages Router, Vercel project may be under `qualia-glluztech` team
- under: HTTP 500 — needs investigation
