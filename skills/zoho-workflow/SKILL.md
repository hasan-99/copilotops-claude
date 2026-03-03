---
name: zoho-workflow
description: Zoho Invoice and Mail operations - create invoices, send emails, manage contacts. Use when Fawzi mentions invoicing, email, or Zoho.
tags: [zoho, invoice, email, billing, crm]
---

# Zoho Workflow

The Zoho MCP server is connected (HTTP endpoint at `zohomcp.eu`). You have FULL access to Zoho Invoice and Zoho Mail tools.

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
- Read signature HTML from `~/.claude/knowledge/email-signature.html`
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
