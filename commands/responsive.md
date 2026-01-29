---
model: claude-opus-4-5-20251101
---

Make it work on every screen. I analyze, find issues, and fix them.

## What I Do

1. **Audit** - Find what breaks at each screen size
2. **Fix layouts** - Overflow, cramped content, bad stacking
3. **Fix typography** - Text too small, lines too long
4. **Fix touch** - Targets too small, spacing too tight
5. **Test edges** - Landscape phones, tablets, ultrawides

## I Check At

- 320px (small phone)
- 375px (iPhone)
- 768px (tablet)
- 1024px (laptop)
- 1440px (desktop)
- 1920px+ (large/ultrawide)

## Common Fixes

- Fixed widths → Fluid widths
- Tiny text → Clamp for fluid scaling
- Overflow → Find and constrain
- Side-by-side → Stack on mobile
- Tiny buttons → 44px minimum touch targets

## Output

I give you:
1. List of issues found (with severity)
2. Specific code fixes
3. Explanation of why each matters

---

Fix responsiveness for: $ARGUMENTS
