---
description: Apply professional design system for websites, apps, UI/UX, components, and business documents
argument-hint: "[website|app|dashboard|landing-page|component|document] [description or URL]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Design and build professionally styled interfaces, components, and documents using a comprehensive design system. Uses the `professional-document-design` skill for consistent visual hierarchy, spacing, color tokens, and modern design patterns.

**Supported contexts:**
- **Websites & Landing Pages** — Hero sections, feature grids, pricing tables, testimonials, CTAs, footers
- **Web Apps & Dashboards** — Sidebar nav, stat cards, data tables, charts, activity feeds, filters
- **UI Components** — Buttons, forms, cards, modals, navigation, tables, toasts, dropdowns
- **Mobile & Responsive** — Bottom nav, touch targets, responsive breakpoints, mobile-first layouts
- **Business Documents** — Contracts, proposals, SOWs, NDAs, invoices, reports (docx/PDF output)

**What it does:**
- Applies design tokens: colors (light/dark mode), typography scale, 8px spacing grid
- Implements component patterns with proper states (hover, focus, active, disabled, loading, error)
- Ensures WCAG AA accessibility (contrast, keyboard nav, screen reader, touch targets)
- Uses responsive breakpoints (640px → 1536px+) with mobile-first approach
- Structures layouts using CSS Grid/Flexbox with proper max-widths
- Outputs as HTML/React/JSX for interfaces, or .docx/.pdf for documents
</objective>

<process>
1. Read the `professional-document-design` skill from `skills/professional-document-design/SKILL.md`
2. Determine the design context from $ARGUMENTS:
   - **Interface/component**: Identify what's being built (page, component, full app)
   - **Document**: Identify document type (contract, proposal, invoice, etc.)
3. If redesigning existing work, read/screenshot it and identify improvements
4. If creating from scratch:
   - Ask for key details (purpose, audience, features, brand preferences)
   - Select appropriate layout pattern from the skill
   - Choose color palette (or use defaults with primary accent)
5. Build with the design system:
   - Apply color tokens, typography scale, spacing grid
   - Implement proper component patterns with all interaction states
   - Ensure responsive behavior at all breakpoints
   - Add accessibility features (contrast, focus indicators, ARIA)
6. Run through the design checklist (visual, interactive, responsive, performance)
7. Output the appropriate format:
   - HTML/React/JSX for web interfaces
   - .docx or .pdf for business documents
   - Code snippets for individual components
</process>
