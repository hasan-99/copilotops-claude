---
name: docs-lookup
description: Fetch up-to-date library and framework documentation on demand. Replaces Context7 MCP with zero context overhead. Activates automatically when working with external libraries.
tags: [documentation, libraries, frameworks, reference]
---

# Docs Lookup (Replaces Context7 MCP)

When you need library/framework documentation, fetch it on demand instead of loading MCP tools every session.

## How to Fetch Docs

Use these methods in order of preference:

### 1. LLMs.txt (Best for major frameworks)

Many frameworks publish LLM-optimized docs. Fetch directly:

```
WebFetch: https://supabase.com/llms/cli.txt        — Supabase CLI
WebFetch: https://nextjs.org/llms.txt               — Next.js
WebFetch: https://ui.shadcn.com/llms.txt            — shadcn/ui
WebFetch: https://tailwindcss.com/llms.txt          — Tailwind CSS
WebFetch: https://vercel.com/llms.txt               — Vercel
WebFetch: https://docs.stripe.com/llms.txt          — Stripe
```

### 2. WebSearch (Best for specific questions)

```
WebSearch: "Next.js 16 server actions authentication 2026"
WebSearch: "supabase realtime subscription React hook"
WebSearch: "VAPI assistant webhook configuration"
```

### 3. Official Docs via WebFetch

```
WebFetch: https://react.dev/reference/react/use
WebFetch: https://supabase.com/docs/guides/auth
WebFetch: https://docs.vapi.ai/assistants
```

### 4. Package README (npm)

```
WebFetch: https://www.npmjs.com/package/[package-name]
```

## When to Activate

This skill triggers when you:
- Write code using external libraries or frameworks
- Need to check API signatures or method parameters
- See unfamiliar library patterns in existing code
- Need version-specific behavior (breaking changes, new APIs)
- Are about to suggest an API call and aren't 100% sure of the signature

## IMPORTANT

- DO NOT hallucinate API signatures. If unsure, look it up first.
- Prefer llms.txt endpoints — they're concise and LLM-optimized
- Use WebSearch for the latest (training data may be stale)
- Fetch BEFORE writing code, not after getting errors

## Fawzi's Stack Quick Reference

| Tech | Docs |
|------|------|
| Next.js | `nextjs.org/llms.txt` |
| React | `react.dev/reference` |
| Supabase | `supabase.com/llms/cli.txt` |
| Tailwind | `tailwindcss.com/llms.txt` |
| shadcn/ui | `ui.shadcn.com/llms.txt` |
| Vercel | `vercel.com/llms.txt` |
| VAPI | `docs.vapi.ai` |
| ElevenLabs | `elevenlabs.io/docs` |
| Telnyx | `developers.telnyx.com` |
