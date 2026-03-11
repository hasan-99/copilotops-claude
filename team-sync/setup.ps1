# ============================================================
# Qualia Solutions — Claude Code Config Setup (Windows)
# Run once to install the shared team config
# ============================================================

$ErrorActionPreference = "Stop"

$REPO_URL = "https://github.com/Qualiasolutions/qualia-claude.git"
$REPO_DIR = "$env:USERPROFILE\.claude-config-repo"
$CLAUDE_DIR = "$env:USERPROFILE\.claude"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   Qualia Solutions - Claude Code Team Setup       " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ---- Check prerequisites ----
Write-Host "-> Checking prerequisites..."

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "X Git is not installed. Install from https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}
Write-Host "  OK git" -ForegroundColor Green

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host "X Claude Code CLI not found. Install from https://docs.claude.com" -ForegroundColor Red
    exit 1
}
Write-Host "  OK claude" -ForegroundColor Green
Write-Host ""

# ---- Backup existing config ----
if (Test-Path $CLAUDE_DIR) {
    $BACKUP = "$env:USERPROFILE\.claude-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Host "-> Backing up existing config to $BACKUP..."
    Copy-Item -Path $CLAUDE_DIR -Destination $BACKUP -Recurse
    Write-Host "  OK Backup created" -ForegroundColor Green
    Write-Host ""
}

# ---- Clone repo ----
if (Test-Path $REPO_DIR) {
    Write-Host "-> Updating existing repo..."
    Push-Location $REPO_DIR
    git pull origin main
    Pop-Location
} else {
    Write-Host "-> Cloning shared config..."
    git clone $REPO_URL $REPO_DIR
}
Write-Host "  OK Repo ready" -ForegroundColor Green
Write-Host ""

# ---- Create .claude directory if needed ----
if (-not (Test-Path $CLAUDE_DIR)) {
    New-Item -ItemType Directory -Path $CLAUDE_DIR -Force | Out-Null
}

# ---- Copy shared directories ----
Write-Host "-> Syncing shared directories..."
$SHARED_DIRS = @("rules", "skills", "commands", "agents", "hooks", "get-shit-done", "knowledge", "scripts")

foreach ($dir in $SHARED_DIRS) {
    $source = Join-Path $REPO_DIR $dir
    $dest = Join-Path $CLAUDE_DIR $dir

    if (Test-Path $source) {
        # Remove existing directory and replace with repo version
        if (Test-Path $dest) {
            Remove-Item -Path $dest -Recurse -Force
        }
        Copy-Item -Path $source -Destination $dest -Recurse
        Write-Host "  OK $dir" -ForegroundColor Green
    }
}
Write-Host ""

# ---- Copy shared files ----
Write-Host "-> Syncing shared files..."
$SHARED_FILES = @("CLAUDE.md", ".clauderc", ".gitignore")

foreach ($file in $SHARED_FILES) {
    $source = Join-Path $REPO_DIR $file
    $dest = Join-Path $CLAUDE_DIR $file

    if (Test-Path $source) {
        Copy-Item -Path $source -Destination $dest -Force
        Write-Host "  OK $file" -ForegroundColor Green
    }
}
Write-Host ""

# ---- Create settings.json from template if it doesn't exist ----
$SETTINGS_FILE = Join-Path $CLAUDE_DIR "settings.json"
$SETTINGS_TEMPLATE = Join-Path $REPO_DIR "team-sync\settings.json.template"

if (-not (Test-Path $SETTINGS_FILE)) {
    if (Test-Path $SETTINGS_TEMPLATE) {
        Copy-Item -Path $SETTINGS_TEMPLATE -Destination $SETTINGS_FILE
        Write-Host "-> Created settings.json from template" -ForegroundColor Yellow
        Write-Host "   IMPORTANT: Open $SETTINGS_FILE and fill in your API keys!" -ForegroundColor Yellow
    }
} else {
    Write-Host "-> settings.json already exists (keeping your keys)" -ForegroundColor Green
}

# ---- Create .mcp.json from template if it doesn't exist ----
$MCP_FILE = Join-Path $CLAUDE_DIR ".mcp.json"
$MCP_TEMPLATE = Join-Path $REPO_DIR "team-sync\mcp.json.template"

if (-not (Test-Path $MCP_FILE)) {
    if (Test-Path $MCP_TEMPLATE) {
        Copy-Item -Path $MCP_TEMPLATE -Destination $MCP_FILE
        Write-Host "-> Created .mcp.json from template" -ForegroundColor Yellow
        Write-Host "   IMPORTANT: Open $MCP_FILE and fill in your server URLs!" -ForegroundColor Yellow
    }
} else {
    Write-Host "-> .mcp.json already exists (keeping your config)" -ForegroundColor Green
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "   Setup complete!                                 " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open $SETTINGS_FILE" -ForegroundColor White
Write-Host "     Replace all YOUR_*_HERE placeholders with your real API keys" -ForegroundColor White
Write-Host ""
Write-Host "  2. Open $MCP_FILE" -ForegroundColor White
Write-Host "     Fill in your MCP server URLs" -ForegroundColor White
Write-Host ""
Write-Host "  3. Run 'claude' to verify everything works" -ForegroundColor White
Write-Host ""
