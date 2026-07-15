# PRODUCT — {Project Name}

> **Required.** The "who and why" every Qualia agent reads before designing or building anything.
> `/qualia-new` generates this from 5 questions. Update as the product clarifies.

## Register

**One of:** `brand` · `product`

- **brand** — design IS the product (marketing, landing, campaign, portfolio). Distinctiveness is the bar.
- **product** — design SERVES the product (app, admin, dashboard, tool). Earned familiarity is the bar.

A project may have BOTH (e.g., marketing site + app). When that's true, list both, and note which surfaces fall under each.

```
register: product
secondary: brand (only for /marketing/* routes)
```

## Users (specific, not personas)

Real humans with real jobs who will use this. Not "small business owners" — Sarah, who runs a 3-person bookkeeping practice in Limassol and pays for QuickBooks because she trusts it. Three users, named, with the workflow in mind.

```
1. {Name} — {role + scenario}. {What they're trying to do when they open this}.
2. ...
3. ...
```

## Brand voice

How the product sounds in writing. UI strings, error messages, marketing copy. Three adjectives, then one sentence of "voice in motion."

```
Voice: {three adjectives — e.g., "direct, confident, dry"}

Voice in motion: {one paragraph showing the voice in actual sentences. What an
error message sounds like. What a confirmation sounds like. What the empty state
sounds like. Concrete, not adjectives.}
```

## Anti-references (mandatory, 3-5)

Sites the project should NOT look like. Anti-references pin down what the design is reacting against — more useful than positive references.

```
- {URL or descriptor} — {what it gets wrong for our use case}
- {URL or descriptor} — ...
- {URL or descriptor} — ...
```

For Brand register, these are usually saturated aesthetic lanes (see `qualia-design/design-brand.md`).
For Product register, these are usually patterns we don't want to inherit (e.g., "Salesforce Lightning — too dense, too many panels").

## Positive references (optional, ≤3)

Sites that demonstrate qualities we want to inherit. Less important than anti-references.

```
- {URL or app name} — {specific quality, e.g., "Linear's keyboard fluency", "Stripe's empty state copy", "Vercel's color restraint"}
```

## Strategic principles

3-5 statements that resolve future arguments. Not feature ideas — design/UX principles that compound.

```
- {Principle}. {One-line rationale.}
- {Principle}. {One-line rationale.}
- {Principle}. {One-line rationale.}
```

Examples:
- **Density before delight.** Users live in this app 6+ hours/day. Density wins over flourish.
- **Power users are the primary persona.** Beginners get onboarding. The app optimizes for power.
- **Speed of glance, not depth of click.** Information visible without interaction beats information one click away.

## Constraints

```
Framework:        {Next.js 16 / React 19 / Vite / Astro / etc}
Component library: {shadcn-ui · custom · radix · arco · ...}
Performance budget: {LCP < 2.5s, INP < 200ms, CLS < 0.1, etc}
Accessibility:    WCAG 2.2 AA minimum
Browsers:         {evergreen / IE11 / mobile-first / ...}
i18n:             {languages supported, RTL needed?}
```

## Differentiation (one sentence)

What someone will remember about this product 24 hours after using it for the first time. If you can't write this in one sentence, the product hasn't decided what it is yet.

```
{One sentence. What's the memory hook?}
```
