# Qualia Arch Linux Setup

Replicate the full dev environment on a fresh EndeavourOS/Arch install with GNOME.

---

## 1. System Packages (pacman)

```bash
# Core dev tools
sudo pacman -S --needed git github-cli base-devel nodejs npm docker jq htop neovim vim eza fastfetch figlet starship tldr pv gum inotify-tools

# Shell & terminal
sudo pacman -S --needed ghostty zsh bash-completion nano nano-syntax-highlighting

# Fonts
sudo pacman -S --needed ttf-jetbrains-mono-nerd ttf-firacode-nerd ttf-opensans ttf-dejavu ttf-liberation ttf-bitstream-vera noto-fonts noto-fonts-emoji otf-font-awesome cantarell-fonts

# GNOME desktop
sudo pacman -S --needed gnome-shell gnome-control-center gnome-tweaks gnome-terminal gnome-text-editor gnome-calculator gnome-clocks gnome-console gnome-disk-utility gnome-keyring gnome-system-monitor gnome-weather gnome-usage gnome-power-manager gnome-nettool gnome-software gnome-browser-connector gnome-themes-extra gnome-shell-extensions gdm nautilus loupe evince file-roller sushi showtime meld

# GNOME extensions (pacman)
sudo pacman -S --needed gnome-shell-extension-desktop-icons-ng gpaste

# Wayland / display
sudo pacman -S --needed grim slurp cliphist swww waypaper rofi wofi wlogout swaync waybar qt6-wayland qt6ct nwg-look brightnessctl

# Audio/video
sudo pacman -S --needed pipewire-alsa pipewire-jack pipewire-pulse wireplumber gst-libav gst-plugin-pipewire gst-plugins-bad gst-plugins-ugly pavucontrol ffmpegthumbnailer

# Networking
sudo pacman -S --needed networkmanager networkmanager-openvpn networkmanager-openconnect network-manager-applet nm-connection-editor iwd openssh firewalld bluez bluez-utils

# Filesystem
sudo pacman -S --needed btrfs-progs dosfstools e2fsprogs exfatprogs f2fs-tools jfsutils ntfs-3g xfsprogs nilfs-utils mtools

# System utils
sudo pacman -S --needed power-profiles-daemon polkit-gnome rsync reflector flatpak plocate pkgfile zram-generator keyd ydotool usbutils hdparm smartmontools ethtool lsscsi dmidecode hwinfo inxi duf glances libdvdcss

# Python
sudo pacman -S --needed python python-pip python-pipx python-requests python-defusedxml python-evdev python-jinja python-packaging python-pyqt6

# Libreoffice
sudo pacman -S --needed libreoffice-fresh
```

## 2. AUR Packages (yay)

```bash
# Install yay first if not present
sudo pacman -S --needed yay

# AUR packages
yay -S --needed \
  google-chrome \
  visual-studio-code-bin \
  cursor-appimage \
  claude-desktop-bin \
  claude-cowork-service \
  discord \
  rustdesk \
  bibata-cursor-theme \
  tela-icon-theme \
  arc-gtk-theme-eos \
  input-remapper-git \
  nautilus-open-any-terminal \
  gnome-shell-extension-blur-my-shell \
  tty-clock \
  waypaper \
  wlogout \
  antigravity
```

## 3. Flatpak

```bash
flatpak install -y flathub com.anydesk.Anydesk
```

## 4. npm Global Packages

```bash
# Set npm global directory (no sudo needed)
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'

# Install globals
npm i -g pnpm typescript typescript-language-server vercel @railway/cli eas-cli expo-cli stripe md-to-pdf firecrawl-cli @openai/codex
```

## 5. pipx Packages

```bash
pipx install poetry
pipx install modal
pipx install azure-cli
```

## 6. Claude Code CLI

```bash
# Install via npm
npm i -g @anthropic-ai/claude-code

# Or if already available via .local/bin, verify:
claude --version
```

## 7. Supabase CLI

```bash
# Install via npm or standalone
npm i -g supabase
# Verify
supabase --version
```

## 8. Python venv for Claude TTS

```bash
python -m venv ~/.claude/venv
~/.claude/venv/bin/pip install elevenlabs requests httpx pydantic websockets
```

## 9. Ghostty Config

```bash
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

## 10. Git Config

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
```

## 11. Bash Config

Add to `~/.bashrc`:

```bash
cat >> ~/.bashrc << 'BASHEOF'

# Add ~/.local/bin to PATH
export PATH="$HOME/.local/bin:$PATH"

# pnpm
export PNPM_HOME="$HOME/.local/share/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac

# npm global
export PATH="$HOME/.npm-global/bin:$PATH"

# Source .env if present
if [ -f "$HOME/.env" ]; then
  set -a
  source "$HOME/.env"
  set +a
fi

# Cowork mode toggle
alias cowork="~/.claude/scripts/cowork-mode.sh"
BASHEOF
```

## 12. Qualia Claude Config

This sets up all the Claude Code skills, agents, hooks, commands, and settings:

```bash
bash <(curl -s https://raw.githubusercontent.com/Qualiasolutions/qualia-claude/main/team-sync/setup.sh)
```

After setup, edit `~/.claude/settings.json` and fill in your API keys for:
- `ZOHO_MCP_KEY`
- `FIRECRAWL_API_KEY`
- `SENTRY_ACCESS_TOKEN`
- `SUPABASE_ACCESS_TOKEN`
- `ELEVEN_API_KEY` (in `~/.bashrc`)

## 13. GNOME Extensions

Enable after install:

```bash
gnome-extensions enable dash-to-dock@micxgx.gmail.com
gnome-extensions enable blur-my-shell@aunetx
gnome-extensions enable ding@rastersoft.com
gnome-extensions enable user-theme@gnome-shell-extensions.gcampax.github.com
gnome-extensions enable places-menu@gnome-shell-extensions.gcampax.github.com
gnome-extensions enable status-icons@gnome-shell-extensions.gcampax.github.com
gnome-extensions enable system-monitor@gnome-shell-extensions.gcampax.github.com
gnome-extensions enable window-list@gnome-shell-extensions.gcampax.github.com
gnome-extensions enable launch-new-instance@gnome-shell-extensions.gcampax.github.com
```

**Dash to Dock** must be installed from [extensions.gnome.org](https://extensions.gnome.org/extension/307/dash-to-dock/) or via the GNOME Extensions app.

## 14. Systemd Services

```bash
# System services
sudo systemctl enable --now NetworkManager bluetooth firewalld gdm power-profiles-daemon

# User services
systemctl --user enable --now claude-cowork.service ydotoold.service

# Docker (enable on demand, not auto-start)
sudo systemctl enable docker
```

## 15. SoupaWhisper (Voice Dictation)

```bash
mkdir -p ~/tools
cd ~/tools
git clone <soupawhisper-repo-url> soupawhisper
cd soupawhisper
poetry install

# Create systemd user service
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/soupawhisper.service << 'EOF'
[Unit]
Description=SoupaWhisper Voice Dictation
After=graphical-session.target

[Service]
Type=simple
Environment=WAYLAND_DISPLAY=wayland-0
Environment=XDG_RUNTIME_DIR=/run/user/1000
Environment=PYTHONUNBUFFERED=1
ExecStart=%h/.cache/pypoetry/virtualenvs/soupawhisper-swH49pW6-py3.14/bin/python %h/tools/soupawhisper/dictate.py
Restart=on-failure
RestartSec=3
MemoryMax=1536M

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now soupawhisper.service
```

## 16. Set Default Terminal to Ghostty

```bash
# For nautilus right-click "Open Terminal"
gsettings set com.github.amezin.ddterm.shell "ghostty"
# Or via nautilus-open-any-terminal
gsettings set com.github.stunkymonkey.nautilus-open-any-terminal terminal ghostty
```

## 17. Claude Desktop Config

```bash
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

---

## Quick Install (copy-paste block)

Run sections 1-4 in one shot:

```bash
# Pacman essentials
sudo pacman -S --needed git github-cli base-devel nodejs npm docker jq htop neovim ghostty ttf-jetbrains-mono-nerd ttf-firacode-nerd noto-fonts noto-fonts-emoji gnome-tweaks gnome-shell-extensions pipewire-alsa pipewire-pulse wireplumber networkmanager firewalld python python-pip python-pipx eza fastfetch pv gum zram-generator keyd ydotool brightnessctl flatpak rofi swaync cliphist swww

# AUR
yay -S --needed google-chrome visual-studio-code-bin cursor-appimage claude-desktop-bin claude-cowork-service discord bibata-cursor-theme tela-icon-theme gnome-shell-extension-blur-my-shell nautilus-open-any-terminal input-remapper-git

# npm globals
mkdir -p ~/.npm-global && npm config set prefix '~/.npm-global'
npm i -g pnpm typescript typescript-language-server vercel @railway/cli eas-cli firecrawl-cli @openai/codex supabase

# pipx
pipx install poetry && pipx install modal

# Claude TTS venv
python -m venv ~/.claude/venv && ~/.claude/venv/bin/pip install elevenlabs requests httpx pydantic websockets

# Qualia Claude config
bash <(curl -s https://raw.githubusercontent.com/Qualiasolutions/qualia-claude/main/team-sync/setup.sh)
```
