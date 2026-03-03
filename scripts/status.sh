#!/bin/bash
# GSD Status Dashboard - Quick project state overview
# Usage: status.sh [project_path]

set -e

PROJECT_DIR="${1:-.}"
cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Header
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  GSD STATUS: $(basename "$PWD")${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"

# Check if GSD project
if [ ! -d ".planning" ]; then
    echo -e "\n${YELLOW}⚠ No .planning/ directory - not a GSD project${NC}"
    echo -e "${DIM}Run /gsd:new-project to initialize${NC}\n"
    exit 0
fi

# Current Phase from STATE.md
echo -e "\n${CYAN}▸ CURRENT POSITION${NC}"
if [ -f ".planning/STATE.md" ]; then
    # Extract current phase line
    PHASE_LINE=$(grep -E "^(current_phase|## Current|Phase:)" .planning/STATE.md 2>/dev/null | head -1 || echo "")
    if [ -n "$PHASE_LINE" ]; then
        echo -e "  $PHASE_LINE"
    fi

    # Extract status
    STATUS_LINE=$(grep -E "^(status:|Status:)" .planning/STATE.md 2>/dev/null | head -1 || echo "")
    if [ -n "$STATUS_LINE" ]; then
        echo -e "  $STATUS_LINE"
    fi
else
    echo -e "  ${YELLOW}No STATE.md found${NC}"
fi

# Phase Overview from ROADMAP.md
echo -e "\n${CYAN}▸ PHASES${NC}"
if [ -f ".planning/ROADMAP.md" ]; then
    # Count phases and show completion
    TOTAL_PHASES=$(grep -cE "^## Phase [0-9]" .planning/ROADMAP.md 2>/dev/null || echo "0")
    COMPLETE_PHASES=$(grep -cE "\[x\]|✓|complete" .planning/ROADMAP.md 2>/dev/null || echo "0")
    echo -e "  Progress: ${GREEN}$COMPLETE_PHASES${NC}/${TOTAL_PHASES} phases"

    # List phases
    grep -E "^## Phase [0-9]" .planning/ROADMAP.md 2>/dev/null | head -10 | while read -r line; do
        echo -e "  ${DIM}$line${NC}"
    done
else
    echo -e "  ${YELLOW}No ROADMAP.md found${NC}"
fi

# Plans in current phase
echo -e "\n${CYAN}▸ PLANS${NC}"
if [ -d ".planning/phases" ]; then
    # Find most recent phase directory
    LATEST_PHASE=$(ls -d .planning/phases/*/ 2>/dev/null | sort -V | tail -1)
    if [ -n "$LATEST_PHASE" ]; then
        PHASE_NAME=$(basename "$LATEST_PHASE")
        TOTAL_PLANS=$(ls -1 "$LATEST_PHASE"*-PLAN.md 2>/dev/null | wc -l | tr -d ' ')
        COMPLETE_PLANS=$(ls -1 "$LATEST_PHASE"*-SUMMARY.md 2>/dev/null | wc -l | tr -d ' ')
        echo -e "  ${BOLD}$PHASE_NAME${NC}: ${GREEN}$COMPLETE_PLANS${NC}/${TOTAL_PLANS} plans complete"

        # List incomplete plans
        for plan in "$LATEST_PHASE"*-PLAN.md; do
            if [ -f "$plan" ]; then
                PLAN_NAME=$(basename "$plan" -PLAN.md)
                SUMMARY="${plan/-PLAN.md/-SUMMARY.md}"
                if [ -f "$SUMMARY" ]; then
                    echo -e "  ${GREEN}✓${NC} $PLAN_NAME"
                else
                    echo -e "  ${YELLOW}○${NC} $PLAN_NAME ${DIM}(pending)${NC}"
                fi
            fi
        done 2>/dev/null
    fi
else
    echo -e "  ${YELLOW}No phases directory${NC}"
fi

# Blockers from STATE.md
echo -e "\n${CYAN}▸ BLOCKERS${NC}"
if [ -f ".planning/STATE.md" ]; then
    BLOCKERS=$(sed -n '/## Blockers/,/^##/p' .planning/STATE.md 2>/dev/null | grep -E "^-" | head -5)
    if [ -n "$BLOCKERS" ]; then
        echo -e "${RED}$BLOCKERS${NC}"
    else
        echo -e "  ${GREEN}None${NC}"
    fi
else
    echo -e "  ${DIM}Unknown${NC}"
fi

# Git status (brief)
echo -e "\n${CYAN}▸ GIT${NC}"
if git rev-parse --git-dir > /dev/null 2>&1; then
    BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
    CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    COMMITS_AHEAD=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "?")
    echo -e "  Branch: ${BOLD}$BRANCH${NC}"
    echo -e "  Uncommitted: $CHANGES files"
    [ "$COMMITS_AHEAD" != "?" ] && echo -e "  Ahead of remote: $COMMITS_AHEAD commits"
else
    echo -e "  ${YELLOW}Not a git repo${NC}"
fi

# Suggested next action
echo -e "\n${CYAN}▸ NEXT ACTION${NC}"
if [ -f ".planning/STATE.md" ]; then
    # Simple heuristic based on state
    if grep -qE "needs.*(plan|planning)" .planning/STATE.md 2>/dev/null; then
        echo -e "  ${BOLD}/gsd:plan-phase${NC}"
    elif grep -qE "needs.*(exec|execution)" .planning/STATE.md 2>/dev/null; then
        echo -e "  ${BOLD}/gsd:execute-phase${NC}"
    elif grep -qE "needs.*(verify|verification)" .planning/STATE.md 2>/dev/null; then
        echo -e "  ${BOLD}/gsd:verify-work${NC}"
    else
        echo -e "  ${BOLD}/gsd:progress${NC} ${DIM}(check state)${NC}"
    fi
else
    echo -e "  ${BOLD}/gsd:new-project${NC}"
fi

echo -e "\n${DIM}─────────────────────────────────────────────────────────────${NC}\n"
