# Security Deep Audit Checklist

IMPORTANT: Use the project's actual source directories (detected in Phase 0), NOT hardcoded src/.

## Secrets and Credentials
- [ ] No API keys/tokens/passwords hardcoded in source files
- [ ] .env files in .gitignore
- [ ] No secrets in client-side bundles (check NEXT_PUBLIC_ prefix carefully — only truly public values)
- [ ] service_role key NEVER in client-side code or components
- [ ] No secrets in git history
- [ ] Environment variables validated at startup (fail fast if missing)
- [ ] No secrets in error messages or logs sent to client

## Input Validation
- [ ] All user input validated with Zod or similar before processing
- [ ] No dangerouslySetInnerHTML without DOMPurify sanitization
- [ ] URL parameters validated and sanitized before use (especially in redirects — open redirect risk)
- [ ] File uploads validated (MIME type, extension, size, content sniffing)
- [ ] No eval(), new Function(), or template literal injection
- [ ] SQL queries use parameterized queries (Supabase client does this by default)
- [ ] Regular expressions not vulnerable to ReDoS (avoid nested quantifiers)
- [ ] No user input used in dynamic import paths (code injection)

## Authentication and Authorization
- [ ] All API routes check authentication before processing
- [ ] Server actions verify auth (getUser() / auth()) before any mutation
- [ ] Role-based access checks on sensitive operations (admin routes, data deletion)
- [ ] Session handling follows best practices (HttpOnly cookies, secure flag)
- [ ] Password reset flow does not leak user existence (same response for valid/invalid emails)
- [ ] Rate limiting on auth endpoints (login, register, forgot password)
- [ ] No auth state stored in localStorage (use HttpOnly cookies)

## HTTP Security
- [ ] Content-Security-Policy header set in next.config or middleware
- [ ] Strict-Transport-Security header set (HSTS)
- [ ] X-Frame-Options set to DENY or SAMEORIGIN
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy configured (strict-origin-when-cross-origin)
- [ ] CORS not set to wildcard in production (specific origins only)
- [ ] Cookies use HttpOnly, Secure, SameSite flags
- [ ] CSRF protection on state-changing endpoints

## Next.js Specific
- [ ] next.config has security headers configured
- [ ] No sensitive data in static pages or generateStaticParams
- [ ] API routes validate HTTP methods (reject unexpected methods)
- [ ] Server actions cannot be called with arbitrary arguments (validate with Zod)
- [ ] Middleware handles auth for protected route groups
- [ ] No server-only code leaking to client bundle (use server-only package)
- [ ] X-Forwarded-For / Origin headers validated in middleware (not blindly trusted)

## Dependencies
- [ ] npm audit / pnpm audit shows no high/critical vulnerabilities
- [ ] Dependencies pinned via lockfile (pnpm-lock.yaml / package-lock.json)
- [ ] No deprecated packages with known vulnerabilities
- [ ] Supply chain risk assessed for new dependencies (check package popularity, maintenance)
- [ ] No unnecessary dependencies that increase attack surface

## Patterns to Search For

Search in the project's actual source directories (app/, lib/, components/, etc.):

- Hardcoded secrets: search for sk_live, sk_test, api_key, apikey, secret_key, password= in .ts and .tsx files
- Dangerous HTML: search for dangerouslySetInnerHTML in .tsx and .jsx files
- Eval usage: search for eval( and new Function( in .ts and .tsx files
- Service role on client side: search for service_role and SUPABASE_SERVICE in .tsx and .ts files, excluding server/api/actions directories
- Unprotected API routes: find route.ts files missing auth/session/getUser/getSession/createClient
- Open redirect patterns: search for redirect(, router.push(, window.location in .ts and .tsx files involving param/query/search/url
