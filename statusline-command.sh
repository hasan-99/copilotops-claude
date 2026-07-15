#!/bin/bash
# Qualia statusline — teal-branded, compact, informative
# Layout: ◆ dir  branch [status] │ phase │ model ━━━━ 23%

input=$(cat)

USED_PCT=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
MODEL=$(echo "$input" | jq -r '.model.display_name')
CWD=$(echo "$input" | jq -r '.workspace.current_dir')

[ -z "$USED_PCT" ] && exit 0

USED_INT=$(printf '%.0f' "$USED_PCT")

# Directory shortening (last 2 segments max)
DIR="$CWD"
DIR="${DIR/#$HOME/\~}"
DEPTH=$(echo "$DIR" | tr -cd '/' | wc -c)
if [ "$DEPTH" -gt 2 ]; then
  DIR=$(echo "$DIR" | rev | cut -d'/' -f1-2 | rev)
  DIR="…/$DIR"
fi

# ── Colors ──
T='\033[38;2;0;188;175m'         # teal
TB='\033[38;2;45;226;210m'       # teal bright
TD='\033[38;2;0;120;112m'        # teal dim
W='\033[38;2;220;225;230m'       # white
G='\033[38;2;70;78;88m'          # gray
GR='\033[38;2;52;211;153m'       # green
Y='\033[38;2;234;179;8m'         # yellow
R='\033[38;2;239;68;68m'         # red
P='\033[38;2;189;147;249m'       # purple
X='\033[0m'                      # reset

# Context bar color
if [ "$USED_INT" -ge 70 ]; then CB="$R"
elif [ "$USED_INT" -ge 50 ]; then CB="$Y"
else CB="$T"; fi

# ── Project + phase detection ──
PROJECT=""
PHASE=""

if [ -f "$CWD/.planning/STATE.md" ]; then
  PROJECT=$(grep -m1 "^Project:" "$CWD/.planning/STATE.md" 2>/dev/null | sed 's/^Project: *//')
  # Get phase number only (e.g. "3 of 6") — not the full description
  PHASE_RAW=$(grep -m1 "^Phase:" "$CWD/.planning/STATE.md" 2>/dev/null | sed 's/^Phase: *//')
  if [ -n "$PHASE_RAW" ]; then
    # Extract "N of M" pattern or just take first 12 chars
    PHASE_SHORT=$(echo "$PHASE_RAW" | grep -oP '^\d+ of \d+' 2>/dev/null)
    [ -z "$PHASE_SHORT" ] && PHASE_SHORT=$(echo "$PHASE_RAW" | head -c 12)
    PHASE="$PHASE_SHORT"
  fi
fi

[ -z "$PROJECT" ] && [ -f "$CWD/package.json" ] && PROJECT=$(node -e "try{console.log(require('$CWD/package.json').name||'')}catch(e){}" 2>/dev/null)

# Git branch
BRANCH=$(git -C "$CWD" --no-optional-locks branch --show-current 2>/dev/null)
GIT_STATUS=""
if [ -n "$BRANCH" ]; then
  GIT_RAW=$(git -C "$CWD" --no-optional-locks status --porcelain 2>/dev/null | head -20)
  if [ -n "$GIT_RAW" ]; then
    M=$(echo "$GIT_RAW" | grep -c '^ M\|^MM\|^AM')
    S=$(echo "$GIT_RAW" | grep -c '^[MARCD] ')
    U=$(echo "$GIT_RAW" | grep -c '^??')
    [ "$M" -gt 0 ] && GIT_STATUS+="!${M}"
    [ "$S" -gt 0 ] && GIT_STATUS+="+${S}"
    [ "$U" -gt 0 ] && GIT_STATUS+="?${U}"
  fi
fi

# ── Context bar ──
BAR_W=10
FILLED=$(( USED_INT * BAR_W / 100 ))
[ "$FILLED" -gt "$BAR_W" ] && FILLED=$BAR_W
EMPTY=$(( BAR_W - FILLED ))
BAR=""; for ((i=0; i<FILLED; i++)); do BAR+="━"; done
EBAR=""; for ((i=0; i<EMPTY; i++)); do EBAR+="─"; done

# ── Build statusline ──
OUT=""

# ◆ brand mark
OUT+="${TB}◆${X} "

# Directory (teal)
OUT+="${T}${DIR}${X}"

# Git branch (purple, compact)
if [ -n "$BRANCH" ]; then
  OUT+=" ${P}${BRANCH}${X}"
  [ -n "$GIT_STATUS" ] && OUT+="${Y}[${GIT_STATUS}]${X}"
fi

# Separator
OUT+=" ${G}│${X} "

# Qualia mode + phase (teal, the important bit)
if [ -n "$PROJECT" ]; then
  OUT+="${TB}${PROJECT}${X}"
  [ -n "$PHASE" ] && OUT+=" ${TD}p${PHASE}${X}"
elif [ -n "$PHASE" ]; then
  OUT+="${T}p${PHASE}${X}"
fi

# If neither project nor phase, show "ad-hoc"
[ -z "$PROJECT" ] && [ -z "$PHASE" ] && OUT+="${TD}ad-hoc${X}"

# Separator + model (compact)
OUT+=" ${G}│${X} ${G}${MODEL}${X}"

# Context bar
OUT+=" ${CB}${BAR}${G}${EBAR}${X} ${CB}${USED_INT}%%${X}"

printf "$OUT"
