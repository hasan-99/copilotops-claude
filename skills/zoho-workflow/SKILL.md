---
name: zoho-workflow
description: "Zoho Invoice + Mail ops via ERP-first routing. Invoices from templates, cover emails, contacts, inbox, payment reminders. Triggers: 'invoice this client', 'send an email', 'check inbox', 'create a Zoho contact', 'payment reminder'."
tags: [zoho, invoice, email, billing, crm]
---

# Zoho Workflow

## Route invoicing through the ERP first

The Qualia ERP at `https://portal.qualiasolutions.net` owns the canonical invoice workflow. **Use it before reaching for raw Zoho MCP tools.**

For any "invoice X" request, the order of preference is:

1. **ERP MCP** (preferred): `mcp__qualia-erp__create_invoice_draft` + `mcp__qualia-erp__create_invoice_cover_email_draft`. These wrap Zoho with the right templates, terms, VAT treatment, and matching cover email. Templates: `monthly_retainer` (Underdog pattern — retainer + SEO + usage credit), `simple_service` (Maison Maud / Armenius pattern — single line), `project_deposit` (50% upfront, requires proposal ref), `project_balance` (final 50%).
2. **ERP UI** (when Fawzi is at his desk): `https://portal.qualiasolutions.net/admin?tab=finance` → "New invoice from template" button.
3. **Raw Zoho Books MCP** (`mcp__claude_ai_Zoho_Books__*`): only for things the ERP doesn't expose yet — voiding, editing existing invoices, recording payments, expenses, contact management.

The full handoff runbook lives in the qualia-erp repo: `docs/finance-runbook.md`. It covers once-per-client setup, the 4 templates, the bulk monthly batch, and common errors.

**Why this matters:** the ERP knows the client → Zoho contact_id mapping, the right tax treatment (Cyprus 19% / non-EU 0%), and the canonical terms templates. Calling Zoho directly bypasses all of that and reintroduces the manual hand-stitching the ERP was built to replace.

## Zoho Invoice

- Create, edit, send, and void invoices
- List and search invoices by client, status, date
- Manage items, taxes, contacts, and expenses
- Mark invoices as sent/paid, send payment reminders
- Generate invoice PDFs and email them to clients
- Create recurring invoices and credit notes
- When Fawzi says "invoice [client]" — create the full invoice, don't just explain how
- Default sender org: Qualia Solutions

## Zoho Mail

- Read inbox, sent, drafts, and folder contents
- Send emails and reply to threads
- Move, label, and organize messages
- Search emails by sender, subject, date
- When Fawzi says "email [someone]" or "check inbox" — do it directly
- Use Fawzi's primary Zoho Mail account

## Email Formatting Rules (MANDATORY)

- Always append Fawzi's signature at the bottom of every email
- Read signature HTML from `C:\Users\hasan\.claude/knowledge/email-signature.html`
- Never use dashes (---) or horizontal separators
- Never use emojis
- Professional, direct tone
- Keep it concise and action-oriented

## General Rules

- Always act, don't just describe. Execute operations directly.
- Fetch the organization ID first if needed (use the list/get org tools)
- If a tool call fails, debug it — check params, retry with fixes

## Trigger Phrases

- "invoice [client]" → Create and send invoice
- "email [someone]" → Compose and send email
- "check inbox" → Read inbox
- "send reminder" → Payment reminder
- "create contact" → New Zoho contact
