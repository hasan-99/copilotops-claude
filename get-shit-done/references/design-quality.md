<design_quality>

## Design Quality Standards for Frontend Execution

When building frontend components (.tsx, .jsx, .css, .scss, styled-components, Tailwind classes), apply these standards **during implementation**, not as a separate pass.

### Build-Time Standards (apply while coding)

**From `/frontend-design`:**
- Distinctive fonts (not Inter/Arial/system defaults)
- Cohesive color palette with sharp accents
- Layered backgrounds, subtle gradients
- Avoid: card grids, generic heroes, blue-purple gradients

**From `/normalize`:**
- Consistent spacing (8px grid or project's spacing scale)
- Consistent border-radius, shadow, and color tokens across components
- Typography hierarchy (h1-h6, body, caption) using project's type scale

**From `/harden`:**
- Text overflow handling (truncate or wrap, never break layout)
- Empty states for lists, tables, data displays
- Loading states for async content
- Error states with clear recovery actions
- Long content resilience (test with 2x expected text length)

**From `/clarify`:**
- Button labels describe actions ("Save changes" not "Submit")
- Error messages explain what went wrong AND how to fix it
- Form labels are descriptive, not just field names
- Placeholder text is example content, not instructions

### Per-Task Checklist (mental, not written)

For each frontend task, before committing ask:
1. Does it look distinctive or generic?
2. Are spacing/colors consistent with surrounding components?
3. What happens with no data? Too much data? An error?
4. Is the copy clear to a first-time user?
5. Are interactive elements (hover, focus, active, disabled) styled?

### Detection

A plan involves frontend work if ANY of these are true:
- Plan files include `.tsx`, `.jsx`, `.css`, `.scss` in `files_modified`
- Plan objective mentions: UI, page, component, layout, dashboard, form, modal, navigation, landing
- Plan tags include: `frontend`, `ui`, `design`, `components`, `pages`

</design_quality>
