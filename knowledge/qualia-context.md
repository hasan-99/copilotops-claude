# Qualia Solutions
> One-man company (Fawzi Goussous), Cyprus. Websites, AI agents, voice agents, AI automation.

## Project Inventory

### Websites (13) — `~/Projects/Live-Projects/`
| Project | Status | Supabase | Hosting | Notes |
|---------|--------|----------|---------|-------|
| qualiafinal | ACTIVE | — | Vercel | Company site |
| aquador | MAINTENANCE | `hznpuxplqgszbacxzbhv` | Vercel | |
| glluztech | MAINTENANCE | — | Vercel | Legacy Pages Router — needs migration |
| inrvo | MAINTENANCE | — | Vercel | CSP headers configured |
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

### Voice (2) — `~/Projects/voice/`
| Project | Status | Provider | Hosting | Supabase |
|---------|--------|----------|---------|----------|
| armenius | MAINTENANCE | ElevenLabs | Cloudflare Workers | — |
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

## Alerts
- Hammah: SERVICE_ROLE_KEY exposed in .env.local
- Timo: Empty API keys (won't work)
- glluztech: Legacy Pages Router
