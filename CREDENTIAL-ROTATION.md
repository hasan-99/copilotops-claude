# URGENT: Credential Rotation Required

**Generated:** 2026-01-29

All credentials in `.env.claude` are exposed in history files. Rotate them NOW.

## Rotation Checklist

### Priority 1: Payment/Production APIs

- [ ] **Supabase** - https://supabase.com/dashboard/account/tokens
  - Current: `sbp_baf0a900f62614b9bfb679cf36aa424216d93477`
  - Action: Revoke and regenerate access token

- [ ] **Vercel** - https://vercel.com/account/tokens
  - Current: `qCXg2wk6aEIkLhCyMnd7qYYr`
  - Action: Delete token and create new one

- [ ] **GitHub** - https://github.com/settings/tokens
  - Current: `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`
  - Action: Delete PAT and create new one with same scopes

- [ ] **Telnyx** - https://portal.telnyx.com/#/app/api-keys
  - Current: `KEY019B70E4A58E1769C2DA47777F2E56AB_ovsEddxS3RGtIdaS0drpwZ`
  - Action: Regenerate API key

### Priority 2: Voice/AI APIs

- [ ] **ElevenLabs** - https://elevenlabs.io/app/settings/api-keys
  - Current: `sk_ecec13354e4b35b41f589300361fd0b7c4cf14761d83fc82`
  - Action: Regenerate API key

- [ ] **VAPI** - https://dashboard.vapi.ai/settings
  - Current: `d616dd43-3770-452a-9337-526f392dc480`
  - Action: Regenerate API key

- [ ] **Langsmith** - https://smith.langchain.com/settings
  - Current: `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`
  - Action: Regenerate API key

### Priority 3: Automation

- [ ] **N8N** - Your n8n instance settings (https://tasos8.app.n8n.cloud)
  - Current: JWT token exposed
  - Action: Regenerate API key in n8n settings

### Also Found in History (Lower Priority)

- [ ] **Postman** - https://web.postman.co/settings/me/api-keys
- [ ] **Cerebras** - Cerebras dashboard
- [ ] **OpenRouter** - https://openrouter.ai/keys

## After Rotation

1. Update `~/.claude/.env.claude` with new keys
2. Delete this file: `rm ~/.claude/CREDENTIAL-ROTATION.md`
3. Verify: `source ~/.claude/.env.claude && echo "Keys loaded"`

## Prevention

The cleanup script now rotates history.jsonl when it exceeds 5MB, preventing long-term credential exposure in logs.
