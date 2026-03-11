# ============================================================
# Qualia Solutions — Claude Code Config Update (Windows)
# Run this anytime to pull the latest shared config
# ============================================================

$ErrorActionPreference = "Stop"

$REPO_DIR = "$env:USERPROFILE\.claude-config-repo"
$CLAUDE_DIR = "$env:USERPROFILE\.claude"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   Qualia Solutions - Config Update                " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ---- Check repo exists ----
if (-not (Test-Path $REPO_DIR)) {
    Write-Host "X Config repo not found at $REPO_DIR" -ForegroundColor Red
    Write-Host "  Run setup.ps1 first to do the initial install."
    exit 1
}

# ---- Pull latest changes ----
Write-Host "-> Pulling latest config..."
Push-Location $REPO_DIR
git pull origin main
Pop-Location
Write-Host "  OK Repo updated" -ForegroundColor Green
Write-Host ""

# ---- Sync shared directories ----
Write-Host "-> Syncing shared directories..."
$SHARED_DIRS = @("rules", "skills", "commands", "agents", "hooks", "get-shit-done", "knowledge", "scripts")

foreach ($dir in $SHARED_DIRS) {
    $source = Join-Path $REPO_DIR $dir
    $dest = Join-Path $CLAUDE_DIR $dir

    if (Test-Path $source) {
        if (Test-Path $dest) {
            Remove-Item -Path $dest -Recurse -Force
        }
        Copy-Item -Path $source -Destination $dest -Recurse
        Write-Host "  OK $dir" -ForegroundColor Green
    }
}
Write-Host ""

# ---- Update shared files ----
Write-Host "-> Updating shared files..."
$SHARED_FILES = @("CLAUDE.md", "qualia-context.md", "learned-patterns.md", ".clauderc", ".gitignore")

foreach ($file in $SHARED_FILES) {
    $source = Join-Path $REPO_DIR $file
    $dest = Join-Path $CLAUDE_DIR $file

    if (Test-Path $source) {
        if (Test-Path $dest) {
            $srcHash = (Get-FileHash $source -Algorithm MD5).Hash
            $dstHash = (Get-FileHash $dest -Algorithm MD5).Hash
            if ($srcHash -ne $dstHash) {
                Copy-Item -Path $source -Destination $dest -Force
                Write-Host "  OK $file -> updated" -ForegroundColor Green
            } else {
                Write-Host "  . $file -> already up to date" -ForegroundColor Gray
            }
        } else {
            Copy-Item -Path $source -Destination $dest -Force
            Write-Host "  OK $file -> created" -ForegroundColor Green
        }
    }
}
Write-Host ""

# ---- Check if settings template has new keys ----
Write-Host "-> Checking for new settings..."
$SETTINGS_TEMPLATE = Join-Path $REPO_DIR "team-sync\settings.json.template"
$SETTINGS_FILE = Join-Path $CLAUDE_DIR "settings.json"

if ((Test-Path $SETTINGS_TEMPLATE) -and (Test-Path $SETTINGS_FILE)) {
    $templateKeys = (Get-Content $SETTINGS_TEMPLATE -Raw | Select-String -Pattern '"[A-Z_]+"' -AllMatches).Matches.Value | Sort-Object -Unique
    $currentKeys = (Get-Content $SETTINGS_FILE -Raw | Select-String -Pattern '"[A-Z_]+"' -AllMatches).Matches.Value | Sort-Object -Unique

    $newKeys = $templateKeys | Where-Object { $currentKeys -notcontains $_ }
    if ($newKeys) {
        Write-Host "  !! New settings found in template that you may need to add:" -ForegroundColor Yellow
        foreach ($key in $newKeys) {
            Write-Host "    $key" -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "  Compare your settings.json with the latest template:" -ForegroundColor White
        Write-Host "  diff $SETTINGS_FILE $SETTINGS_TEMPLATE" -ForegroundColor White
    } else {
        Write-Host "  . Settings keys are in sync" -ForegroundColor Gray
    }
} else {
    Write-Host "  . Skipped (template or settings not found)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "   Config updated!                                 " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
