#!/usr/bin/env bash
# ============================================================
# Qualia Solutions — Full Pop!_OS Bootstrap
# Run once on a fresh Pop!_OS install to get the full dev env
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
CLAUDE_DIR="$HOME/.claude"

echo ""
echo "=================================================="
echo "   Qualia Solutions - Pop!_OS Full Bootstrap       "
echo "=================================================="
echo ""

# ---- System packages ----
echo "[1/14] Installing system packages..."
sudo apt update
sudo apt install -y \
  git gh build-essential curl wget jq htop neovim vim tree pv \
  inotify-tools software-properties-common apt-transport-https \
  ca-certificates gnupg lsb-release unzip zip tar \
  python3 python3-pip python3-venv pipx \
  docker.io docker-compose \
  openssh-client openssh-server ufw bluez bluez-tools \
  network-manager rsync smartmontools hwinfo inxi \
  ffmpeg gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly \
  gstreamer1.0-libav pavucontrol \
  fonts-jetbrains-mono fonts-firacode fonts-noto fonts-noto-color-emoji \
  fonts-font-awesome fonts-dejavu fonts-liberation \
  gnome-tweaks gnome-shell-extensions
echo "  OK system packages"
echo ""

# ---- Node.js ----
echo "[2/14] Installing Node.js 22 LTS..."
if ! command -v node &>/dev/null || [[ "$(node --version)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs
fi
echo "  OK node $(node --version)"
echo ""

# ---- Google Chrome ----
echo "[3/14] Installing Google Chrome..."
if ! command -v google-chrome-stable &>/dev/null; then
  wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg 2>/dev/null || true
  echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list >/dev/null
  sudo apt update && sudo apt install -y google-chrome-stable
fi
echo "  OK chrome"
echo ""

# ---- VS Code ----
echo "[4/14] Installing VS Code..."
if ! command -v code &>/dev/null; then
  wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /tmp/ms.gpg
  sudo install -D -o root -g root -m 644 /tmp/ms.gpg /etc/apt/keyrings/packages.microsoft.gpg
  echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list >/dev/null
  sudo apt update && sudo apt install -y code
  rm -f /tmp/ms.gpg
fi
echo "  OK vscode"
echo ""

# ---- Cursor ----
echo "[5/14] Installing Cursor..."
if [ ! -f /opt/cursor/cursor.appimage ]; then
  echo "  Downloading Cursor AppImage..."
  wget -q -O /tmp/cursor.appimage "https://downloader.cursor.sh/linux/appImage/x64"
  chmod +x /tmp/cursor.appimage
  sudo mkdir -p /opt/cursor
  sudo mv /tmp/cursor.appimage /opt/cursor/cursor.appimage
  mkdir -p ~/.local/share/applications
  cat > ~/.local/share/applications/cursor.desktop << 'EOF'
[Desktop Entry]
Name=Cursor
Exec=/opt/cursor/cursor.appimage --no-sandbox %F
Terminal=false
Type=Application
Icon=cursor
Categories=Development;IDE;
MimeType=text/plain;
EOF
fi
echo "  OK cursor"
echo ""

# ---- Claude Desktop ----
echo "[6/14] Installing Claude Desktop..."
if ! command -v claude-desktop &>/dev/null && ! dpkg -l | grep -q claude-desktop; then
  echo "  Downloading Claude Desktop .deb..."
  wget -q -O /tmp/claude-desktop.deb "https://storage.googleapis.com/anthropic-downloads/claude-desktop/claude-desktop-debian.deb" || {
    echo "  WARN: Could not download Claude Desktop. Install manually from https://claude.ai/download"
  }
  if [ -f /tmp/claude-desktop.deb ]; then
    sudo dpkg -i /tmp/claude-desktop.deb || sudo apt install -f -y
    rm -f /tmp/claude-desktop.deb
  fi
fi
mkdir -p ~/.config/Claude
cat > ~/.config/Claude/claude_desktop_config.json << 'EOF'
{
  "preferences": {
    "localAgentModeTrustedFolders": [
      "/home/qualia/Desktop",
      "/home/qualia"
    ],
    "coworkScheduledTasksEnabled": true,
    "sidebarMode": "task",
    "coworkWebSearchEnabled": true
  }
}
EOF
echo "  OK claude desktop"
echo ""

# ---- Flatpak apps ----
echo "[7/14] Installing Flatpak apps..."
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install -y flathub com.discordapp.Discord 2>/dev/null || true
flatpak install -y flathub com.anydesk.Anydesk 2>/dev/null || true
flatpak install -y flathub com.mitchellh.ghostty 2>/dev/null || echo "  WARN: Ghostty not available via Flatpak — install manually"
echo "  OK flatpak apps"
echo ""

# ---- npm globals ----
echo "[8/14] Installing npm global packages..."
mkdir -p ~/.npm-global
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
npm i -g pnpm typescript typescript-language-server vercel @railway/cli \
  eas-cli expo-cli stripe md-to-pdf firecrawl-cli @openai/codex supabase \
  @anthropic-ai/claude-code
echo "  OK npm globals"
echo ""

# ---- pipx ----
echo "[9/14] Installing pipx packages..."
pipx install poetry 2>/dev/null || true
pipx install modal 2>/dev/null || true
echo "  OK pipx"
echo ""

# ---- Git config ----
echo "[10/14] Configuring git..."
git config --global user.name "qualiasolutions"
git config --global user.email "info@qualiasolutions.net"
git config --global core.editor "cursor --wait"
git config --global init.defaultBranch main
git config --global pull.rebase true
git config --global fetch.prune true
git config --global diff.colorMoved zebra
git config --global merge.conflictstyle diff3
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage "reset HEAD --"
git config --global alias.last "log -1 HEAD"
git config --global alias.amend "commit --amend --no-edit"
git config --global alias.lg "log --oneline --graph --decorate -20"
git config --global alias.aa "add --all"
git config --global alias.cm "commit -m"
cat > ~/.gitignore_global << 'EOF'
.DS_Store
.env
.env.*
!.env.example
!.env.sample
.idea/
.vscode/
*.swp
*.swo
*~
node_modules/
EOF
git config --global core.excludesFile ~/.gitignore_global
echo "  OK git config"
echo ""

# ---- Ghostty config ----
echo "[11/14] Configuring Ghostty terminal..."
mkdir -p ~/.config/ghostty/themes

cat > ~/.config/ghostty/themes/Qualia << 'EOF'
palette = 0=#151d2d
palette = 1=#d94343
palette = 2=#2ecc71
palette = 3=#eab308
palette = 4=#3498db
palette = 5=#8B5CF6
palette = 6=#00D9B3
palette = 7=#b5bfe2
palette = 8=#6b7582
palette = 9=#EC4899
palette = 10=#10B981
palette = 11=#f39c12
palette = 12=#7b9ef0
palette = 13=#f4b8e4
palette = 14=#00FFD1
palette = 15=#fafbfe
background = #0a0a14
foreground = #e6ecf7
cursor-color = #00FFD1
cursor-text = #0a0a14
selection-background = #1a2231
selection-foreground = #fafbfe
EOF

cat > ~/.config/ghostty/config << 'EOF'
theme = Qualia
font-family = JetBrains Mono
font-size = 14
font-thicken = true
adjust-cell-height = 4
window-padding-x = 12
window-padding-y = 8
window-decoration = auto
window-title-font-family = JetBrains Mono
confirm-close-surface = false
window-save-state = always
window-inherit-working-directory = true
window-inherit-font-size = true
cursor-style = bar
cursor-style-blink = false
mouse-hide-while-typing = true
copy-on-select = clipboard
link-url = true
scrollback-limit = 100000
clipboard-paste-protection = false
clipboard-trim-trailing-spaces = true
shell-integration = detect
shell-integration-features = cursor,sudo,title
keybind = ctrl+shift+d=new_split:right
keybind = ctrl+shift+e=new_split:down
keybind = ctrl+shift+h=goto_split:left
keybind = ctrl+shift+l=goto_split:right
keybind = ctrl+shift+j=goto_split:bottom
keybind = ctrl+shift+k=goto_split:top
keybind = ctrl+shift+w=close_surface
keybind = ctrl+shift+t=new_tab
keybind = ctrl+shift+n=new_window
keybind = ctrl+1=goto_tab:1
keybind = ctrl+2=goto_tab:2
keybind = ctrl+3=goto_tab:3
keybind = ctrl+4=goto_tab:4
keybind = ctrl+5=goto_tab:5
keybind = ctrl+equal=increase_font_size:1
keybind = ctrl+minus=decrease_font_size:1
keybind = ctrl+0=reset_font_size
keybind = ctrl+shift+left=resize_split:left,20
keybind = ctrl+shift+right=resize_split:right,20
keybind = ctrl+shift+up=resize_split:up,20
keybind = ctrl+shift+down=resize_split:down,20
gtk-single-instance = true
bold-is-bright = true
EOF
echo "  OK ghostty config"
echo ""

# ---- Bash config ----
echo "[12/14] Updating .bashrc..."
if ! grep -q "Qualia Dev Environment" ~/.bashrc 2>/dev/null; then
  cat >> ~/.bashrc << 'BASHEOF'

# === Qualia Dev Environment ===

# PATH additions
export PATH="$HOME/.local/bin:$PATH"
export PATH="$HOME/.npm-global/bin:$PATH"

# pnpm
export PNPM_HOME="$HOME/.local/share/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac

# ElevenLabs TTS (fill in your key)
export ELEVEN_API_KEY="YOUR_ELEVEN_API_KEY_HERE"

# Cowork mode toggle
alias cowork="~/.claude/scripts/cowork-mode.sh"
BASHEOF
fi
echo "  OK bashrc"
echo ""

# ---- Claude Code config sync ----
echo "[13/14] Syncing Claude Code config..."
bash "$REPO_DIR/team-sync/setup.sh"
echo ""

# ---- Python venv for TTS ----
echo "[14/14] Setting up Claude TTS venv..."
if [ ! -d "$CLAUDE_DIR/venv" ]; then
  python3 -m venv "$CLAUDE_DIR/venv"
fi
"$CLAUDE_DIR/venv/bin/pip" install -q elevenlabs requests httpx pydantic websockets
echo "  OK tts venv"
echo ""

# ---- Docker group ----
sudo usermod -aG docker "$USER" 2>/dev/null || true

# ---- Firewall ----
echo "Enabling firewall..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
echo "  OK firewall"
echo ""

# ---- NVIDIA check ----
echo "Checking NVIDIA..."
if command -v nvidia-smi &>/dev/null; then
  nvidia-smi --query-gpu=name,driver_version --format=csv,noheader
  echo "  OK nvidia"
else
  echo "  WARN: nvidia-smi not found. Install drivers: sudo apt install system76-driver-nvidia"
fi
echo ""

# ---- Done ----
echo "=================================================="
echo "   Bootstrap complete!                             "
echo "=================================================="
echo ""
echo "NEXT STEPS:"
echo ""
echo "  1. Fill in API keys:"
echo "     nano ~/.claude/settings.json"
echo "     (replace all YOUR_*_HERE placeholders)"
echo ""
echo "  2. Fill in ElevenLabs key:"
echo "     nano ~/.bashrc"
echo "     (replace YOUR_ELEVEN_API_KEY_HERE)"
echo ""
echo "  3. Authenticate GitHub:"
echo "     gh auth login"
echo ""
echo "  4. Authenticate Vercel:"
echo "     vercel login"
echo ""
echo "  5. Log out and back in (for Docker group)"
echo ""
echo "  6. Verify everything:"
echo "     claude --version && gh auth status && vercel whoami && nvidia-smi"
echo ""
