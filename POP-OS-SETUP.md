# Qualia Pop!_OS Setup

Replicate the full dev environment on a fresh Pop!_OS install (Lenovo LOQ, NVIDIA RTX 4080).

Pop!_OS is Ubuntu-based, so uses `apt` + `flatpak`. NVIDIA drivers come pre-installed with the NVIDIA ISO.

---

## 0. Post-Install First Steps

```bash
# Update everything
sudo apt update && sudo apt upgrade -y

# Verify NVIDIA drivers (should be pre-installed on Pop!_OS NVIDIA ISO)
nvidia-smi
# If not installed:
# sudo apt install system76-driver-nvidia

# Set up Flathub (Pop!_OS ships with Flatpak)
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
```

## 1. System Packages (apt)

```bash
# Core dev tools
sudo apt install -y git gh build-essential curl wget jq htop neovim vim tree \
  pv inotify-tools software-properties-common apt-transport-https ca-certificates \
  gnupg lsb-release unzip zip tar

# Python
sudo apt install -y python3 python3-pip python3-venv pipx

# Docker
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER

# Networking & system
sudo apt install -y openssh-client openssh-server ufw bluez bluez-tools \
  network-manager rsync smartmontools hdparm lsscsi ethtool hwinfo inxi

# Media / codecs
sudo apt install -y ffmpeg gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly \
  gstreamer1.0-libav pavucontrol

# Fonts
sudo apt install -y fonts-jetbrains-mono fonts-firacode fonts-noto \
  fonts-noto-color-emoji fonts-font-awesome fonts-dejavu fonts-liberation
```

## 2. Node.js (via NodeSource - latest LTS)

```bash
# Install Node.js 22.x LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version
npm --version
```

## 3. Google Chrome

```bash
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update && sudo apt install -y google-chrome-stable
```

## 4. VS Code

```bash
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -D -o root -g root -m 644 packages.microsoft.gpg /etc/apt/keyrings/packages.microsoft.gpg
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list
sudo apt update && sudo apt install -y code
rm packages.microsoft.gpg
```

## 5. Cursor

```bash
# Download AppImage from https://www.cursor.com/downloads
# Or use the direct link:
wget -O ~/Downloads/cursor.appimage "https://downloader.cursor.sh/linux/appImage/x64"
chmod +x ~/Downloads/cursor.appimage

# Move to applications
sudo mkdir -p /opt/cursor
sudo mv ~/Downloads/cursor.appimage /opt/cursor/cursor.appimage

# Create desktop entry
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
```

## 6. Claude Desktop

```bash
# Download .deb from https://claude.ai/download
# Or direct:
wget -O /tmp/claude-desktop.deb "https://storage.googleapis.com/anthropic-downloads/claude-desktop/claude-desktop-debian.deb"
sudo dpkg -i /tmp/claude-desktop.deb
sudo apt install -f -y

# Configure Claude Desktop
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
```

## 7. Claude Code CLI

```bash
npm i -g @anthropic-ai/claude-code
claude --version
```

## 8. Ghostty Terminal

```bash
# Ghostty doesn't have official .deb yet — build from source or use Flatpak
# Option A: Flatpak
flatpak install -y flathub com.mitchellh.ghostty

# Option B: Build from source (needs Zig)
# See https://ghostty.org/docs/install/build

# Create config
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
```

## 9. Flatpak Apps

```bash
flatpak install -y flathub com.discordapp.Discord
flatpak install -y flathub com.anydesk.Anydesk
flatpak install -y flathub org.libreoffice.LibreOffice
```

## 10. npm Global Packages

```bash
# Set npm global directory (no sudo needed)
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'

# Install globals
npm i -g pnpm typescript typescript-language-server vercel @railway/cli \
  eas-cli expo-cli stripe md-to-pdf firecrawl-cli @openai/codex supabase
```

## 11. pipx Packages

```bash
pipx install poetry
pipx install modal
```

## 12. Git Config

```bash
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

# Global gitignore
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

# Authenticate GitHub CLI
gh auth login
```

## 13. Bash Config

```bash
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

source ~/.bashrc
```

## 14. Claude Code Config (Skills, Hooks, Rules, etc.)

This syncs all 74 skills, hooks, agents, rules, and commands from the repo:

```bash
bash ~/Projects/qualia-claude/team-sync/setup.sh
```

After setup, fill in API keys in `~/.claude/settings.json`.

## 15. Python venv for Claude TTS

```bash
python3 -m venv ~/.claude/venv
~/.claude/venv/bin/pip install elevenlabs requests httpx pydantic websockets
```

## 16. Docker Setup

```bash
# Start Docker
sudo systemctl enable --now docker

# Verify (may need to log out/in for group membership)
docker run hello-world
```

## 17. Firewall

```bash
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
```

## 18. NVIDIA Verification

```bash
# Check driver
nvidia-smi

# Check CUDA (if needed)
nvcc --version 2>/dev/null || echo "CUDA toolkit not installed (install with: sudo apt install nvidia-cuda-toolkit)"

# Check Vulkan
vulkaninfo --summary 2>/dev/null || echo "Install vulkan-tools: sudo apt install vulkan-tools"
```

## 19. GNOME Tweaks (Pop!_OS uses COSMIC but supports GNOME extensions)

```bash
# Pop!_OS 22.04 uses GNOME — install tweaks
sudo apt install -y gnome-tweaks gnome-shell-extensions

# For Pop!_OS 24.04+ with COSMIC desktop, skip GNOME extensions
# COSMIC has its own settings panel
```

---

## Quick Install (copy-paste block)

Run sections 1-10 in one shot:

```bash
# System packages
sudo apt update && sudo apt install -y git gh build-essential curl wget jq htop neovim vim tree pv inotify-tools python3 python3-pip python3-venv pipx docker.io docker-compose openssh-client ufw ffmpeg pavucontrol fonts-jetbrains-mono fonts-firacode fonts-noto fonts-noto-color-emoji

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs

# Chrome
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update && sudo apt install -y google-chrome-stable

# VS Code
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /tmp/ms.gpg
sudo install -D -o root -g root -m 644 /tmp/ms.gpg /etc/apt/keyrings/packages.microsoft.gpg
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list
sudo apt update && sudo apt install -y code

# npm globals
mkdir -p ~/.npm-global && npm config set prefix '~/.npm-global'
npm i -g pnpm typescript typescript-language-server vercel @railway/cli eas-cli firecrawl-cli @openai/codex supabase @anthropic-ai/claude-code

# pipx
pipx install poetry && pipx install modal

# Claude TTS venv
python3 -m venv ~/.claude/venv && ~/.claude/venv/bin/pip install elevenlabs requests httpx pydantic websockets

# Docker
sudo systemctl enable --now docker && sudo usermod -aG docker $USER

# Claude config sync
bash ~/Projects/qualia-claude/team-sync/setup.sh
```

---

## Migrating from Arch Linux

If coming from the Arch setup (ARCH-SETUP.md), the main differences are:
- `pacman` / `yay` -> `apt` / `flatpak`
- AUR packages -> .deb downloads or Flatpak
- `systemctl --user enable claude-cowork.service` -> not needed on Pop!_OS (use manually)
- Ghostty is in AUR on Arch but needs Flatpak or source build on Pop!_OS
- Pop!_OS NVIDIA ISO handles drivers automatically — no manual driver install needed
- Pop!_OS uses COSMIC desktop (24.04+) instead of GNOME — some GNOME extensions don't apply
