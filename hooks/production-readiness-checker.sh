#!/bin/bash
# Production Readiness Checker
# Comprehensive checklist to run before any production deploy
# Can be invoked standalone: bash production-readiness-checker.sh
# Or wired as a skill/command in Claude Code

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0
SKIP=0

check() {
    local status="$1" label="$2" detail="${3:-}"
    case "$status" in
        pass) printf "${GREEN}  ✓ ${label}${NC}"; PASS=$((PASS+1)) ;;
        fail) printf "${RED}  ✗ ${label}${NC}"; FAIL=$((FAIL+1)) ;;
        warn) printf "${YELLOW}  ⚠ ${label}${NC}"; WARN=$((WARN+1)) ;;
        skip) printf "${DIM}  ○ ${label} (skipped)${NC}"; SKIP=$((SKIP+1)) ;;
    esac
    [ -n "$detail" ] && printf " ${DIM}— ${detail}${NC}"
    echo ""
}

printf "\n${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${NC}\n"
printf "${BOLD}${CYAN}║      PRODUCTION READINESS CHECK                  ║${NC}\n"
printf "${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${NC}\n\n"

# ─── Section 1: Code Quality ───
printf "${BOLD}Code Quality${NC}\n"

if [ -f "tsconfig.json" ]; then
    npx tsc --noEmit 2>/dev/null && check pass "TypeScript compiles" || check fail "TypeScript errors"
else
    check skip "TypeScript"
fi

if ls .eslintrc* eslint.config.* 2>/dev/null | head -1 | grep -q .; then
    npx eslint . --quiet --max-warnings=0 2>/dev/null && check pass "ESLint clean" || check warn "ESLint warnings"
else
    check skip "ESLint"
fi

# Check for console.log in production code
CONSOLE_COUNT=$(grep -rn "console\.log" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ app/ 2>/dev/null | grep -v "node_modules" | grep -v ".test." | grep -v "__tests__" | wc -l | tr -d ' ')
if [ "$CONSOLE_COUNT" -gt 0 ]; then
    check warn "console.log statements" "${CONSOLE_COUNT} found in production code"
else
    check pass "No console.log in production code"
fi

# ─── Section 2: Tests ───
printf "\n${BOLD}Tests${NC}\n"

if [ -f "package.json" ]; then
    TEST_SCRIPT=$(node -e "try{console.log(require('./package.json').scripts?.test||'')}catch(e){console.log('')}" 2>/dev/null)
    if [ -n "$TEST_SCRIPT" ] && [ "$TEST_SCRIPT" != 'echo "Error: no test specified" && exit 1' ]; then
        npm test -- --passWithNoTests 2>/dev/null && check pass "Test suite passes" || check fail "Tests failing"
    else
        check fail "No test script configured" "Add tests before going to production"
    fi
fi

# Check test coverage exists
if [ -d "coverage" ] || ls .nyc_output 2>/dev/null | grep -q .; then
    check pass "Test coverage configured"
else
    check warn "No test coverage directory" "Consider adding coverage reporting"
fi

# ─── Section 3: Security ───
printf "\n${BOLD}Security${NC}\n"

# Check for exposed secrets in code
if grep -rE "(sk-[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16}|ghp_[a-zA-Z0-9]{36})" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" . 2>/dev/null | grep -v node_modules | grep -v ".env" | head -1 | grep -q .; then
    check fail "Hardcoded API keys found" "Remove secrets from source code"
else
    check pass "No hardcoded API keys"
fi

# Check .env not committed
if git ls-files --error-unmatch .env 2>/dev/null; then
    check fail ".env is tracked by git" "Add .env to .gitignore"
else
    check pass ".env not in git"
fi

# Check for TODO security items
SEC_TODOS=$(grep -rni "TODO.*secur\|FIXME.*auth\|HACK.*token" --include="*.ts" --include="*.tsx" src/ app/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$SEC_TODOS" -gt 0 ]; then
    check warn "Security TODOs in code" "${SEC_TODOS} items need attention"
else
    check pass "No security TODOs"
fi

# ─── Section 4: Build & Dependencies ───
printf "\n${BOLD}Build & Dependencies${NC}\n"

if [ -f "package.json" ]; then
    npm run build 2>/dev/null && check pass "Production build succeeds" || check fail "Build fails"
fi

# Check for vulnerable dependencies
if command -v npm &>/dev/null; then
    AUDIT_RESULT=$(npm audit --production --json 2>/dev/null | node -e "try{const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(d.metadata?.vulnerabilities?.high||0)}catch(e){console.log('0')}" 2>/dev/null)
    if [ "$AUDIT_RESULT" -gt 0 ] 2>/dev/null; then
        check warn "npm audit" "${AUDIT_RESULT} high-severity vulnerabilities"
    else
        check pass "No high-severity vulnerabilities"
    fi
fi

# Check package-lock.json exists
if [ -f "package-lock.json" ] || [ -f "pnpm-lock.yaml" ] || [ -f "bun.lockb" ]; then
    check pass "Lock file present"
else
    check fail "No lock file" "Builds may not be reproducible"
fi

# ─── Section 5: Configuration ───
printf "\n${BOLD}Configuration${NC}\n"

# Check env vars
if [ -f ".env.example" ]; then
    if [ -f ".env.local" ] || [ -f ".env" ]; then
        check pass ".env configured"
    else
        check fail ".env.example exists but no .env.local"
    fi
else
    check skip "No .env.example"
fi

# Vercel project linked
if [ -d ".vercel" ]; then
    check pass "Vercel project linked"
else
    check warn "No .vercel directory" "Run vercel link first"
fi

# Check for next.config
if [ -f "next.config.js" ] || [ -f "next.config.mjs" ] || [ -f "next.config.ts" ]; then
    check pass "Next.js config present"
    # Check if images domains configured
    if grep -q "images" next.config.* 2>/dev/null; then
        check pass "Image domains configured"
    else
        check warn "No image domains configured" "May cause runtime errors"
    fi
fi

# ─── Section 6: Database (Supabase) ───
printf "\n${BOLD}Database${NC}\n"

if [ -d "supabase" ]; then
    # Check for pending migrations
    MIGRATION_COUNT=$(ls supabase/migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')
    check pass "Supabase configured" "${MIGRATION_COUNT} migrations"

    # Check RLS on all tables in migrations
    TABLES_WITHOUT_RLS=$(grep -l "CREATE TABLE" supabase/migrations/*.sql 2>/dev/null | while read f; do
        if ! grep -q "ENABLE ROW LEVEL SECURITY" "$f" 2>/dev/null; then
            basename "$f"
        fi
    done | wc -l | tr -d ' ')

    if [ "$TABLES_WITHOUT_RLS" -gt 0 ]; then
        check warn "Tables without RLS" "${TABLES_WITHOUT_RLS} migration(s) missing RLS"
    else
        check pass "RLS enabled on all tables"
    fi
else
    check skip "Supabase not configured"
fi

# ─── Verdict ───
TOTAL=$((PASS + FAIL + WARN + SKIP))
printf "\n${BOLD}${CYAN}═══════════════════════════════════════════════════${NC}\n"
printf "${GREEN}  Passed: $PASS${NC}  ${RED}Failed: $FAIL${NC}  ${YELLOW}Warnings: $WARN${NC}  ${DIM}Skipped: $SKIP${NC}\n"

if [ "$FAIL" -gt 0 ]; then
    printf "\n${RED}${BOLD}  ✗ NOT PRODUCTION READY — $FAIL blocking issue(s)${NC}\n"
    exit 1
elif [ "$WARN" -gt 3 ]; then
    printf "\n${YELLOW}${BOLD}  ⚠ CONDITIONALLY READY — many warnings, review before deploy${NC}\n"
    exit 0
else
    printf "\n${GREEN}${BOLD}  ✓ PRODUCTION READY${NC}\n"
    exit 0
fi
