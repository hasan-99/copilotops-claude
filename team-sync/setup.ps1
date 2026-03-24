# ============================================================
# Qualia Solutions — Claude Code Setup (Windows)
# Run: .\team-sync\setup.ps1
# ============================================================

$ErrorActionPreference = "Stop"

$REPO_URL = "https://github.com/Qualiasolutions/qualia-claude.git"
$CLAUDE_DIR = "$env:USERPROFILE\.claude"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (Test-Path "$ScriptDir\..\CLAUDE.md") { $REPO_DIR = (Resolve-Path "$ScriptDir\..").Path } else { $REPO_DIR = "$env:USERPROFILE\.claude-config-repo" }

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   Qualia Solutions - Claude Code Setup (Windows)  " -ForegroundColor Cyan
Write-Host "   Intelligence Framework v2.0                     " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ---- Who are you? ----
Write-Host "Who are you?"
Write-Host ""
Write-Host "  1) Fawzi Goussous   - Founder (admin)"
Write-Host "  2) Moayad Alqam     - Developer (manager)"
Write-Host "  3) Hasan            - Developer (employee)"
Write-Host "  4) Someone else     - New team member"
Write-Host ""
$choice = Read-Host "Enter number (1-4)"

switch ($choice) {
    "1" { $UserName = "Fawzi Goussous"; $UserRole = "owner"; $PortalEmail = "info@qualiasolutions.net"; $PortalRole = "admin" }
    "2" { $UserName = "Moayad Alqam"; $UserRole = "employee"; $PortalEmail = "moayad@qualiasolutions.net"; $PortalRole = "manager" }
    "3" { $UserName = "Hasan"; $UserRole = "employee"; $PortalEmail = "hasan@qualiasolutions.net"; $PortalRole = "employee" }
    "4" {
        $UserName = Read-Host "Enter your full name"
        $PortalEmail = Read-Host "Enter your Qualia email"
        $UserRole = "employee"
        $PortalRole = "employee"
    }
    default { Write-Host "Invalid choice."; exit 1 }
}

Write-Host ""
Write-Host "-> Setting up for $UserName ($PortalRole)" -ForegroundColor Yellow
Write-Host ""

# ---- Prerequisites ----
Write-Host "-> Checking prerequisites..."
if (Get-Command git -ErrorAction SilentlyContinue) { Write-Host "  OK git" -ForegroundColor Green } else { Write-Host "  X git not found" -ForegroundColor Red; exit 1 }
if (Get-Command node -ErrorAction SilentlyContinue) { Write-Host "  OK node" -ForegroundColor Green } else { Write-Host "  WARN: node not found" -ForegroundColor Yellow }
if (Get-Command claude -ErrorAction SilentlyContinue) { Write-Host "  OK claude" -ForegroundColor Green } else { Write-Host "  WARN: claude not found — npm i -g @anthropic-ai/claude-code" -ForegroundColor Yellow }
Write-Host ""

# ---- Backup ----
if (Test-Path "$CLAUDE_DIR\settings.json") {
    $backup = "$env:USERPROFILE\.claude-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Host "-> Backing up to $backup..."
    Copy-Item -Recurse $CLAUDE_DIR $backup
    Write-Host "  OK" -ForegroundColor Green
    Write-Host ""
}

# ---- Clone/update repo ----
if ($REPO_DIR -eq "$env:USERPROFILE\.claude-config-repo") {
    if (Test-Path $REPO_DIR) {
        Push-Location $REPO_DIR; git pull origin main 2>$null; Pop-Location
    } else {
        git clone $REPO_URL $REPO_DIR
    }
    Write-Host "-> Repo ready" -ForegroundColor Green
    Write-Host ""
}

# ---- Install framework ----
New-Item -ItemType Directory -Force -Path $CLAUDE_DIR | Out-Null
New-Item -ItemType Directory -Force -Path "$CLAUDE_DIR\agent-memory" | Out-Null

Write-Host "-> Installing intelligence framework..."
$dirs = @("rules", "skills", "commands", "agents", "hooks", "get-shit-done", "knowledge", "scripts", "config")
foreach ($dir in $dirs) {
    $src = Join-Path $REPO_DIR $dir
    $dest = Join-Path $CLAUDE_DIR $dir
    if (Test-Path $src) {
        if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
        Copy-Item -Recurse $src $dest
        Write-Host "  OK $dir" -ForegroundColor Green
    }
}
Write-Host ""

# ---- Role-based CLAUDE.md ----
Write-Host "-> Installing $PortalRole profile..."
$roleFile = Join-Path $REPO_DIR "team-sync\roles\$UserRole.md"
if (Test-Path $roleFile) {
    $content = Get-Content $roleFile -Raw
    $content = $content -replace '\{\{EMPLOYEE_NAME\}\}', $UserName
    $content = $content -replace '\{\{PORTAL_EMAIL\}\}', $PortalEmail
    $content = $content -replace '\{\{PORTAL_ROLE\}\}', $PortalRole
    $content = $content -replace '\{\{PORTAL_ROLE_UPPER\}\}', $PortalRole.ToUpper()
    $content | Set-Content (Join-Path $CLAUDE_DIR "CLAUDE.md") -Encoding UTF8
    Write-Host "  OK CLAUDE.md ($UserRole)" -ForegroundColor Green
} else {
    Copy-Item (Join-Path $REPO_DIR "CLAUDE.md") (Join-Path $CLAUDE_DIR "CLAUDE.md")
    Write-Host "  OK CLAUDE.md (default)" -ForegroundColor Green
}
Write-Host ""

# ---- MEMORY.md ----
$memoryDir = Join-Path $CLAUDE_DIR "projects\-home-$env:USERNAME--claude\memory"
New-Item -ItemType Directory -Force -Path $memoryDir | Out-Null
$memoryTemplate = Join-Path $REPO_DIR "team-sync\MEMORY.md.template"
if ((-not (Test-Path (Join-Path $memoryDir "MEMORY.md"))) -and (Test-Path $memoryTemplate)) {
    Copy-Item $memoryTemplate (Join-Path $memoryDir "MEMORY.md")
    Write-Host "-> MEMORY.md installed" -ForegroundColor Green
} else {
    Write-Host "-> MEMORY.md exists (keeping yours)" -ForegroundColor Green
}

# ---- Settings.json ----
$settingsFile = Join-Path $CLAUDE_DIR "settings.json"
if (-not (Test-Path $settingsFile)) {
    $template = Join-Path $REPO_DIR "team-sync\settings.json.template"
    if (Test-Path $template) {
        $content = Get-Content $template -Raw
        $content = $content -replace '\{\{HOME\}\}', $env:USERPROFILE
        $content | Set-Content $settingsFile -Encoding UTF8
        Write-Host "-> settings.json created" -ForegroundColor Green
    }
} else {
    Write-Host "-> settings.json exists (keeping yours)" -ForegroundColor Green
}

# ---- Session digest ----
$digestFile = Join-Path $CLAUDE_DIR "knowledge\session-digest.md"
if (-not (Test-Path $digestFile)) {
    New-Item -ItemType Directory -Force -Path (Join-Path $CLAUDE_DIR "knowledge") | Out-Null
    @"
# Session Digest — Rolling Log
> Auto-updated by save-session-state.sh. Last 20 sessions across all projects.

"@ | Set-Content $digestFile -Encoding UTF8
    Write-Host "-> session-digest.md initialized" -ForegroundColor Green
}

# ---- .env.claude ----
$envClaude = Join-Path $CLAUDE_DIR ".env.claude"
if (-not (Test-Path $envClaude)) {
    @"
# Qualia Solutions — Claude Code Environment Variables
# Add your API keys below. This file is loaded via CLAUDE_ENV_FILE.

# Portal integration (for session tracking)
# CLAUDE_PORTAL_API_KEY=

# MCP server tokens (uncomment and fill if needed)
# VAPI_TOKEN=
# TELNYX_API_KEY=
# ELEVENLABS_API_KEY=
# FIRECRAWL_API_KEY=
"@ | Set-Content $envClaude -Encoding UTF8
    Write-Host "-> .env.claude created (edit to add your keys)" -ForegroundColor Yellow
} else {
    Write-Host "-> .env.claude exists (keeping yours)" -ForegroundColor Green
}

# ---- MCP Servers ----
Write-Host ""
Write-Host "-> Configuring MCP servers..."
$localSettings = Join-Path $CLAUDE_DIR "settings.local.json"

$mcpConfig = @{
    mcpServers = @{
        context7 = @{ command = "npx"; args = @("-y", "@context7/mcp-server") }
        playwright = @{ command = "npx"; args = @("-y", "@playwright/mcp@latest") }
    }
}
Write-Host "  OK context7 (docs lookup)" -ForegroundColor Green
Write-Host "  OK playwright (browser)" -ForegroundColor Green

$hasSupabase = Read-Host "  Supabase access token? (y/n)"
if ($hasSupabase -eq "y") {
    $token = Read-Host "  SUPABASE_ACCESS_TOKEN"
    $mcpConfig.mcpServers["supabase"] = @{
        command = "npx"
        args = @("-y", "@anthropic/supabase-mcp-server")
        env = @{ SUPABASE_ACCESS_TOKEN = $token }
    }
    Write-Host "  OK supabase" -ForegroundColor Green
}

$mcpConfig | ConvertTo-Json -Depth 10 | Set-Content $localSettings -Encoding UTF8
Write-Host "  OK settings.local.json" -ForegroundColor Green
Write-Host ""

# ---- Summary ----
$skillCount = (Get-ChildItem (Join-Path $CLAUDE_DIR "skills") -Directory -ErrorAction SilentlyContinue).Count
$agentCount = (Get-ChildItem (Join-Path $CLAUDE_DIR "agents") -File -ErrorAction SilentlyContinue).Count

Write-Host "==================================================" -ForegroundColor Green
Write-Host "   Setup complete: $UserName ($PortalRole)" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Installed: $skillCount skills, $agentCount agents"
Write-Host "Role: $PortalRole (portal: $PortalEmail)"
Write-Host ""

if ($UserRole -eq "owner") {
    Write-Host "OWNER: Full authority."
} else {
    Write-Host "STAFF: Full tools. Claude guides on when to check with Fawzi."
    Write-Host ""
    Write-Host "Start: https://portal.qualiasolutions.net/framework"
}
Write-Host ""
Write-Host "Run 'claude' to start working."
Write-Host ""
