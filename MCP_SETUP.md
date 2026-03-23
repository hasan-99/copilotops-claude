# MCP Server Setup & Security Guide

Configuration and security best practices for Model Context Protocol servers.

---

## Current Configuration

### Active MCP Servers

| Server | Purpose | Status |
|--------|---------|--------|
| `filesystem` | Local file operations | Active |
| `context7` | Documentation search | Active |
| `playwright` | Browser automation | Active |
| `supabase` | Database operations | Active |
| `n8n-mcp` | Workflow automation | Active |
| `vapi` | Voice AI integration | Active |
| `telnyx-api` | Telecom integration | Active |
| `elevenlabs` | Audio synthesis | Active |

---

## Server Details

### Filesystem
```json
{
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@anthropic-ai/mcp-filesystem", "/home/qualiasolutions"]
  }
}
```
**Security:** Restricts access to home directory only.

---

### Context7
```json
{
  "context7": {
    "command": "npx",
    "args": ["-y", "@anthropic-ai/mcp-context7"]
  }
}
```
**Purpose:** Search and retrieve up-to-date library documentation.

---

### Playwright
```json
{
  "playwright": {
    "command": "npx",
    "args": ["-y", "@anthropic-ai/mcp-playwright"]
  }
}
```
**Purpose:** Browser automation and web testing.

---

### Supabase
```json
{
  "supabase": {
    "command": "npx",
    "args": ["-y", "@anthropic-ai/mcp-supabase"],
    "env": {
      "SUPABASE_URL": "${SUPABASE_URL}",
      "SUPABASE_KEY": "${SUPABASE_KEY}"
    }
  }
}
```
**Security:** Store credentials in `.env.claude` only.

---

## Security Best Practices

### 1. Credential Storage

**DO:**
```bash
# Store in .env.claude
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_KEY="your-key-here"
```

**DON'T:**
```json
// Never put credentials directly in settings.json
"env": {
  "SUPABASE_KEY": "eyJhbGciOiJIUzI1NiIs..."  // BAD!
}
```

### 2. File Permissions
```bash
chmod 600 ~/.claude/.env.claude
chmod 600 ~/.claude/settings.json
chmod 600 ~/.claude/.credentials.json
```

### 3. Environment Variable Reference
Use variable interpolation in settings.json:
```json
"env": {
  "API_KEY": "${API_KEY}"  // References .env.claude
}
```

### 4. Read-Only Mode
For production safety, consider read-only configurations:
```json
"env": {
  "SUPABASE_READ_ONLY": "true"
}
```

---

## Adding New MCP Servers

### Step 1: Install the Server
```bash
npx -y @anthropic-ai/mcp-<server-name>
```

### Step 2: Add to settings.json
```json
{
  "mcpServers": {
    "new-server": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-new-server"],
      "env": {
        "API_KEY": "${NEW_SERVER_API_KEY}"
      }
    }
  }
}
```

### Step 3: Add Credentials to .env.claude
```bash
echo 'NEW_SERVER_API_KEY="your-key"' >> ~/.claude/.env.claude
```

### Step 4: Restart Claude Code
```bash
source ~/.claude/.env.claude && claude
```

---

## Troubleshooting

### Server Not Starting
1. Check if package is installed: `npx -y @anthropic-ai/mcp-<name> --help`
2. Verify environment variables are set
3. Check Claude Code logs: `~/.claude/debug/`

### Authentication Errors
1. Verify credentials in `.env.claude`
2. Check file permissions
3. Ensure variables are exported: `source ~/.env.claude`

### Connection Timeouts
1. Check network connectivity
2. Verify API endpoint is accessible
3. Consider adding timeout configuration

---

## Credential Rotation

### Schedule
- API keys: Every 90 days
- OAuth tokens: Automatic refresh
- Service role keys: Every 90 days

### Rotation Process
1. Generate new key in service dashboard
2. Update `.env.claude`
3. Test connectivity
4. Revoke old key

---

## Monitoring

### Health Checks
MCP servers should respond to basic requests within 5 seconds.

### Log Locations
- MCP errors: `~/.claude/debug/`
- Connection issues: Check terminal output

---

## Permissions Matrix

| Server | Read | Write | Execute |
|--------|------|-------|---------|
| filesystem | ✓ | ✓ | - |
| supabase | ✓ | ✓ | - |
| playwright | - | - | ✓ |
| context7 | ✓ | - | - |

---

## Quick Commands

```bash
# Start Claude with MCP servers
source ~/.claude/.env.claude && claude

# List active servers
cat ~/.claude/settings.json | jq '.mcpServers | keys'

# Test specific server
npx -y @anthropic-ai/mcp-supabase --help
```
