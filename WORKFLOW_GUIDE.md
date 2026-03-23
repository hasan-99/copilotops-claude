# Claude Code Workflow Guide

Your complete guide to custom commands, hooks, and workflows configured for efficient development.

## 🚀 Custom Slash Commands

### `/deep-debug`
**When to use**: You're stuck on a complex bug deep in your project.

**What it does**:
- Systematically analyzes errors and traces execution paths
- Finds root causes (not just symptoms)
- Checks common issues: env vars, APIs, async, state, types
- Implements fixes with clear explanations
- Suggests prevention measures

**Example usage**:
```
/deep-debug

I'm getting "TypeError: Cannot read property 'map' of undefined"
in my React component when fetching data from the API.
```

**Best for**:
- Multi-layered issues
- Unclear error sources
- State management problems
- API integration issues
- Performance problems

---

### `/build-voice-agent`
**When to use**: You want to create an AI voice agent.

**What it does**:
- Walks you through voice agent requirements
- Supports Hume EVI, Twilio, or VAPI platforms
- Creates complete project structure
- Implements conversation loop with tool calling
- Sets up deployment configuration

**Example usage**:
```
/build-voice-agent

I want to build a customer service voice agent that can:
- Answer questions about products
- Book appointments
- Transfer to human agents
```

**Creates**:
- WebSocket/HTTP server
- Agent personality configuration
- Tool/function calling system
- Memory management
- Deployment scripts

---

### `/build-ai-agent`
**When to use**: You need a general AI agent (CLI, API, or autonomous).

**What it does**:
- Creates production-ready AI agents
- Supports CLI tools, API services, background workers, MCP servers
- Implements tool use and function calling
- Adds memory and context management
- Includes testing and deployment

**Example usage**:
```
/build-ai-agent

I need an API service that:
- Analyzes code repositories
- Generates documentation
- Answers questions about the codebase
```

**Creates**:
- Agent core with conversation loop
- Tool implementations with validation
- Memory/context management
- Testing framework
- Docker deployment config

---

### `/build-website`
**When to use**: Building a modern website or web app.

**What it does**:
- Scaffolds Next.js 15 + React 19 + TypeScript + Tailwind
- Adds shadcn/ui component library
- Sets up routing, SEO, analytics
- Implements responsive design
- Configures deployment to Vercel

**Example usage**:
```
/build-website

I want a SaaS landing page with:
- Hero section with CTA
- Features grid
- Pricing table
- User authentication
- Dashboard
```

**Creates**:
- Complete Next.js project structure
- Reusable components (Header, Footer, Hero, Features, etc.)
- Form handling with validation
- SEO optimization
- Vercel deployment config

---

## 🎯 Specialized Agents

### Project Debugger Agent
**Access via**: `/deep-debug` command or Task tool with `project-debugger`

**Specialties**:
- Error tracing across multiple files
- State analysis in complex apps
- Performance profiling
- API/database debugging
- Environment configuration issues

**Use when**:
- Standard debugging isn't working
- Issues span multiple components
- Need systematic investigation
- Want to understand root cause

---

## ⚙️ Automated Hooks

Your workflow is enhanced with automated hooks that run at key moments:

### 🔍 Pre-Commit Hook
**Triggers**: Before every git commit

**Actions**:
- Checks for secrets in code (API keys, passwords)
- Runs linter (if configured)
- Can run tests (optional)
- Blocks commit if checks fail

**Location**: `~/.claude/hooks/scripts/pre-commit-check.js`

---

### ✨ Post-Edit Hook
**Triggers**: After editing files with Claude

**Actions**:
- Auto-formats code (Prettier for JS/TS, Black for Python)
- Organizes imports
- Fixes common style issues

**Location**: `~/.claude/hooks/scripts/post-edit-format.js`

**Supported formatters**:
- JavaScript/TypeScript: Prettier
- Python: Black or autopep8
- Go: gofmt

---

### 📊 Session Start Hook
**Triggers**: When starting Claude Code

**Actions**:
- Displays project info (name, version, type)
- Shows git branch and uncommitted changes
- Checks for environment variables
- Logs session start time

**Location**: `~/.claude/hooks/scripts/session-start.js`

---

## 📁 Directory Structure

```
~/.claude/
├── commands/                    # Custom slash commands
│   ├── deep-debug.md            # Debugging workflow
│   ├── build-voice-agent.md     # Voice agent builder
│   ├── build-ai-agent.md        # AI agent builder
│   └── build-website.md         # Website builder
│
├── agents/                      # Specialized agents
│   └── project-debugger.md      # Debug specialist
│
├── hooks/                       # Automation hooks
│   ├── hooks.json               # Hook configuration
│   ├── scripts/                 # Hook scripts
│   │   ├── pre-commit-check.js
│   │   ├── post-edit-format.js
│   │   └── session-start.js
│   ├── logs/                    # Hook execution logs
│   └── backups/                 # File backups
│
├── settings.json                # Claude Code settings
├── .clauderc                    # Command aliases
└── WORKFLOW_GUIDE.md            # This file
```

---

## 💡 Workflow Best Practices

### For Debugging:
1. Use `/deep-debug` for complex issues
2. Let hooks auto-format your fixes
3. Check hook logs if issues persist: `~/.claude/hooks/logs/`

### For Building Voice Agents:
1. Run `/build-voice-agent`
2. Choose your platform (Hume EVI recommended for emotion)
3. Define personality and capabilities
4. Test locally, then deploy

### For Building AI Agents:
1. Run `/build-ai-agent`
2. Choose agent type (CLI/API/Autonomous/MCP)
3. Define tools and capabilities
4. Add tests and monitoring
5. Deploy to cloud

### For Building Websites:
1. Run `/build-website`
2. Specify site type and features
3. Customize design and components
4. Add auth/database if needed
5. Deploy to Vercel with one command

---

## 🔧 Configuration Files

### settings.json
```json
{
  "contextFiles": [
    "CLAUDE.md",      // Project-specific instructions
    "README.md",      // Project documentation
    ".clauderc",      // Command aliases
    "package.json",   // Dependencies and scripts
    "tsconfig.json"   // TypeScript config
  ]
}
```

### hooks.json
Located at: `~/.claude/hooks/hooks.json`

**Enabled hooks**:
- `pre-commit`: Lint and validate before commits
- `post-edit`: Auto-format after edits
- `session-start`: Display project info on start
- `error-detected`: Log errors for analysis
- `project-switch`: Save context when switching projects

**Disabled hooks** (can enable if needed):
- `pre-tool-call`: Log before tool execution
- `post-tool-call`: Validate tool results
- `post-commit`: Actions after commits

---

## 📝 Quick Reference

| Task | Command | Agent |
|------|---------|-------|
| Debug complex issue | `/deep-debug` | project-debugger |
| Build voice agent | `/build-voice-agent` | N/A |
| Build AI agent | `/build-ai-agent` | N/A |
| Build website | `/build-website` | N/A |
| Check logs | Read `~/.claude/hooks/logs/` | N/A |

---

## 🎓 Tips

1. **Use descriptive prompts**: The more context you give, the better the output
2. **Let hooks work**: They auto-format and check your code
3. **Check logs**: If hooks fail, check `~/.claude/hooks/logs/`
4. **Customize**: Edit command files in `~/.claude/commands/` to adjust workflows
5. **Iterate**: Commands are starting points - refine the output as needed

---

## 🐛 Troubleshooting

**Commands not showing up?**
- Check files exist in `~/.claude/commands/`
- Ensure `.md` extension
- Restart Claude Code

**Hooks not running?**
- Check `hooks.json` has `"enabled": true`
- Verify scripts are executable: `chmod +x ~/.claude/hooks/scripts/*.js`
- Check hook logs in `~/.claude/hooks/logs/`

**Formatting not working?**
- Install formatters: `npm install -D prettier` or `pip install black`
- Check `package.json` for lint script
- Verify hook is enabled in `hooks.json`

---

## 📚 Additional Resources

- **Claude Code Docs**: https://docs.claude.com/claude-code
- **Hook Scripts**: `~/.claude/hooks/scripts/`
- **Command Templates**: `~/.claude/commands/`
- **Session Logs**: `~/.claude/hooks/logs/`

---

**Last Updated**: 2025-01-05

Happy coding! 🚀
