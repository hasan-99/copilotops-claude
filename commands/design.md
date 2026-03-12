---
description: Apply professional document design styling to business documents
argument-hint: "[document type: contract|proposal|invoice|report|sow|nda]"
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
Create or restyle a business document with professional formatting, clean layout, proper spacing, and corporate aesthetics. Uses the `professional-document-design` skill for consistent visual hierarchy.

**Supported document types:** contracts, agreements, proposals, SOWs, NDAs, invoices, reports, letters, memos.

**What it does:**
- Applies minimalist corporate styling (spacing, typography, colors)
- Structures content with proper heading hierarchy
- Adds headers/footers with page numbering
- Creates signature blocks where needed
- Uses professional color palette (#1a1a1a, #333, #2563eb accent)
- Outputs as .docx or .pdf
</objective>

<process>
1. Read the `professional-document-design` skill from `skills/professional-document-design/SKILL.md`
2. Determine document type from $ARGUMENTS (or ask the user)
3. If an existing file is provided, read it and apply the design system
4. If creating from scratch:
   - Ask for key details (parties, scope, terms, etc.)
   - Structure using the standard section order for the document type
5. Apply all spacing rules, typography hierarchy, and visual elements from the skill
6. Run through the output checklist before delivering
7. Save as .docx (or .pdf if requested)
</process>
