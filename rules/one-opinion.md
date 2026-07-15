# One Opinion (design-decision discipline)

Loaded on demand by design-adjacent skills: `/qualia-polish --vibe`, `/qualia-polish`, `/qualia-new` (DESIGN.md creation step), `/qualia-scope` PROJECT MODE. Not always-on — most skills don't need it.

## The rule

When the user asks for a design decision and has not already named the answer, **propose ONE opinionated direction with justification.** Do NOT enumerate a menu of options and ask the user to choose.

This applies to:

- Aesthetic direction (editorial / brutalist / luxury / terminal / etc.)
- Color strategy (restrained / committed / drenched)
- Type family (Fraunces vs Söhne vs Geist vs …)
- Layout approach (single-screen / scroll-narrative / grid-of-cards)
- Motion philosophy (snap / glide / static)
- Any other design call where N≥3 reasonable answers exist.

## Why

The vault's EventMaster session is the canonical case: the user pivoted aesthetic 3 times in one work block. When asked "what direction?" mid-session, the response was literally `ANYTHING JUST CHANGE IT STOP ASKING`. Menus of options force the user to do the synthesis work the agent should have done.

Owners and clients have a strong sense of what they DON'T want and a weaker sense of what they DO want. One concrete proposal gives them something to react to. A menu of 5 options gives them 5 things to evaluate AND the meta-choice of which one to pick — net cognitive load goes up, decision time goes up, and the agent has added no value.

## How to apply

1. **Read the context** — `PRODUCT.md` register, anti-references, scene sentence, brand mood, prior `decisions/` ADRs, any reference images.
2. **Pick the strongest single direction** the context supports. Bias toward concrete and committed over hedged.
3. **State it in one paragraph** with the why. Format: `Proposed: {direction}. Why: {1-2 sentences from PRODUCT.md / anti-references / register}.`
4. **Ask one yes/no follow-up** — "Ship this, or pivot?" Not "do you like A or B or C?"
5. **If the user pivots**, ask what they don't like, propose ONE new direction, repeat. Never widen the option set after a rejection.

## When this rule does NOT apply

- The user explicitly asked for options ("show me 3 directions", "give me a menu").
- The decision is technical, not aesthetic (e.g. "use Postgres or MongoDB?" — those have objectively different tradeoffs and should be discussed, not opinionated).
- A locked decision in `.planning/decisions/*.md` already exists — surface it, don't re-decide.
- The framework command explicitly supports a `--variants` mode (e.g. `/qualia-polish --vibe --variants 3`), which is the user opting into the menu surface.

## Output shape

GOOD:
```
Proposed: editorial broadsheet — ivory ground, deep navy ink, single italic accent (Cormorant).
Why: PRODUCT.md says "trustworthy, calm, taken-seriously"; anti-references reject "tech-bro startup landing"; the register is Brand, not Product. Editorial broadsheet hits all three.

Ship this, or pivot?
```

BAD:
```
Here are some options:
1. Editorial — ivory + navy
2. Brutalist — raw concrete + electric yellow
3. Terminal — black ground + green mono
4. Maximalist — color-block
5. Organic — earth tones

Which one do you want?
```
