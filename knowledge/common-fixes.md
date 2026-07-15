# Common Fixes
> Recurring bugs and their solutions. Updated: 2026-03-23

## Build Failures
- **Module not found**: Check case sensitivity (Linux is case-sensitive, macOS isn't)
- **Memory issues**: `vercel --build-env NODE_OPTIONS="--max-old-space-size=4096"`
- **Missing deps**: `rm -rf node_modules && npm install`
- **Generated types stale**: `npx supabase gen types typescript --linked > types/database.ts`

## Deployment
- **Works locally, fails on Vercel**: Check Node version, env vars, case sensitivity
- **Missing env vars**: `vercel env ls` to check, `vercel env add` to fix
- **NEXT_PUBLIC_ vars**: Must be set at BUILD time, not just runtime
- **White screen**: Check for `window`/`document` in server components
- **500 on API**: Check env vars exist on Vercel, check Supabase URL not localhost

## Supabase
- **RLS blocking silently**: Returns empty array, not error. Check policies.
- **FK returns array**: Use `normalizeFKResponse()` helper
- **Connection pool exhausted**: Reduce `max_connections`, use connection pooler

## Next.js
- **Hydration mismatch**: Wrap dynamic content in `useEffect`, no `Date.now()` in SSR
- **Missing 'use client'**: Add directive to components using hooks
- **Stale cache**: `revalidatePath()` after mutations + invalidate SWR

---

### flagcdn.com 404s on non-standard widths
**ID:** d4cd54e1
**Date:** 2026-05-12
**Project:** sakani
**Context:** Country picker in /developer/login phone+OTP form — width*2 srcset hit 48 (unsupported), all flags broke

https://flagcdn.com/w{N}/{iso}.png returns 404 unless N is in [20, 40, 80, 160, 320, 640, 1280, 2560, 5120]. Snapping the requested width to the nearest supported value is required. Also: any embedding app's CSP img-src directive must include https://flagcdn.com. Why we use flagcdn instead of emoji: regional-indicator flag emoji do not render on Windows or many Linux distros — they fall back to letter pairs ('JO' instead of the Jordan flag). flagcdn PNGs render universally and are ~300 bytes per flag at the CDN edge.


---

### Vercel env var with trailing newline breaks fetch()
**ID:** f9a932da
**Date:** 2026-05-12
**Project:** sakani
**Context:** M19 admin app could not reach Railway API; symptom looked like CORS but was URL mangling

If a Vercel env var like NEXT_PUBLIC_API_URL has a trailing \n (often from pasting a value with a soft return), every fetch using it builds a URL like 'https://api.host/api/v1\n/endpoint' which 404s. There's no error in build logs and the value displays cleanly in the Vercel dashboard. Diagnosis: in browser devtools, inspect the Network tab — the actual request URL will show the escaped \n. Fix: 'vercel env rm <VAR> production' then re-add via 'vercel env add' (CLI strips whitespace) or paste-without-newline in dashboard. Sakani hit this on NEXT_PUBLIC_API_URL during M19 build — every API call from admin → server returned 404.


---

### Contract evidence filename collision + unspawnable npx in contract checks
**ID:** 04706378
**Date:** 2026-06-11
**Project:** kids-story (Lulloria)
**Context:** M4 Values Engine Phase 2 build — evidence-collection script + vitest contract check, 2026-06-11

Two contract-runner traps hit during a Qualia phase build. (1) COLLISION: never write a phase's evidence artifact to .planning/evidence/phase-{N}-contract-run.json — that exact path is RESERVED for the contract-runner's own output. When /qualia-verify runs the contract, the runner overwrites the file with its run results, destroying the builder's evidence and flipping every T1 grep-match check (e.g. value_tag_column_exists) to FAIL. Fix: name evidence artifacts distinctly, e.g. phase-{N}-values-evidence.json, and point the contract's grep-match paths there. (2) UNSPAWNABLE COMMAND: contract command-exit checks that use 'npx <tool>' fail on Windows with 'spawnSync npx ... ENOENT' — npx resolves to npx.cmd and the runner spawns without shell resolution. Fix: use the node-direct form 'node ./node_modules/<pkg>/<bin>.mjs <args>' (e.g. node ./node_modules/vitest/vitest.mjs run <file>). Also: after hand-editing a plan AND its contract, recompute and update the contract's source_plan_hash (node bin/plan-contract.js hash <plan>) or harness-eval flags 'contract drifted from plan' (plan_contract 0/20, trust-score FAIL).


---

### expo-audio: NativeSharedObjectNotFoundException on screen exit = double-release of useAudioPlayer
**ID:** 967c67c8
**Date:** 2026-06-25
**Project:** innrvo-app
**Context:** iOS player-exit crash; diagnosed by surfacing error.stack on-screen via ErrorBoundary because native Sentry was dark in Expo Go

Symptom: crash on unmount/exit (often into an ErrorBoundary) — 'FunctionCallException: Calling the remove function has failed -> NativeSharedObjectNotFoundException: Unable to find the native shared object'. Root cause: expo-audio's useAudioPlayer(source) AUTO-RELEASES the player when the component unmounts (per docs). If your own cleanup ALSO calls player.remove() (e.g. a release() in an unmount useEffect), the native SharedObject is freed twice -> exception. Fix: NEVER call .remove() on a useAudioPlayer-managed player — pause() instead and let the hook dispose it on unmount. Only createAudioPlayer() instances need manual .remove(); wrap those in try/catch too since the native object can be released independently during teardown. Bonus: removing the manual remove() also unbreaks retry()-style flows that reuse the same player via player.replace(). Verified working in innrvo-app (commit 424cd59).

