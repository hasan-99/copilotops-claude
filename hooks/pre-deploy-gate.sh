#!/bin/bash
# Pre-deploy test gate — blocks `vercel --prod` if tests/build/lint fail
# Hook type: PreToolUse (intercepts Bash commands matching vercel)
# Exit 0 = allow, Exit 2 = block with message (CLAUDE_BLOCK_MESSAGE)

COMMAND="$CLAUDE_TOOL_INPUT"

# Only gate production deploys
if ! echo "$COMMAND" | grep -qE 'vercel\s+.*--prod|vercel\s+--prod'; then
    exit 0
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

printf "${CYAN}╔══════════════════════════════════════════╗${NC}\n"
printf "${CYAN}║   PRE-DEPLOY GATE — Production Safety    ║${NC}\n"
printf "${CYAN}╚══════════════════════════════════════════╝${NC}\n"

FAILURES=0
WARNINGS=0

# ─── Check 1: TypeScript compilation ───
if [ -f "tsconfig.json" ]; then
    printf "${YELLOW}[1/5] TypeScript check...${NC}\n"
    if npx tsc --noEmit 2>/tmp/tsc-gate-output.txt; then
        printf "${GREEN}  ✓ TypeScript compiles cleanly${NC}\n"
    else
        printf "${RED}  ✗ TypeScript errors found:${NC}\n"
        head -20 /tmp/tsc-gate-output.txt
        FAILURES=$((FAILURES + 1))
    fi
else
    printf "${YELLOW}[1/5] TypeScript check... skipped (no tsconfig.json)${NC}\n"
fi

# ─── Check 2: ESLint (errors only, warnings allowed) ───
if [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ] || [ -f "eslint.config.js" ] || [ -f "eslint.config.mjs" ]; then
    printf "${YELLOW}[2/5] Lint check...${NC}\n"
    if npx eslint . --max-warnings=-1 --quiet 2>/dev/null; then
        printf "${GREEN}  ✓ No lint errors${NC}\n"
    else
        printf "${RED}  ✗ Lint errors found${NC}\n"
        FAILURES=$((FAILURES + 1))
    fi
else
    printf "${YELLOW}[2/5] Lint check... skipped (no eslint config)${NC}\n"
fi

# ─── Check 3: Tests ───
if [ -f "package.json" ]; then
    TEST_SCRIPT=$(node -e "try{console.log(require('./package.json').scripts?.test||'')}catch(e){console.log('')}" 2>/dev/null)
    if [ -n "$TEST_SCRIPT" ] && [ "$TEST_SCRIPT" != 'echo "Error: no test specified" && exit 1' ]; then
        printf "${YELLOW}[3/5] Running tests...${NC}\n"
        if npm test -- --passWithNoTests 2>/tmp/test-gate-output.txt; then
            printf "${GREEN}  ✓ Tests passed${NC}\n"
        else
            printf "${RED}  ✗ Tests failed:${NC}\n"
            tail -15 /tmp/test-gate-output.txt
            FAILURES=$((FAILURES + 1))
        fi
    else
        printf "${YELLOW}[3/5] Tests... skipped (no test script)${NC}\n"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# ─── Check 4: Build ───
if [ -f "package.json" ]; then
    BUILD_SCRIPT=$(node -e "try{console.log(require('./package.json').scripts?.build||'')}catch(e){console.log('')}" 2>/dev/null)
    if [ -n "$BUILD_SCRIPT" ]; then
        printf "${YELLOW}[4/5] Build check...${NC}\n"
        if npm run build 2>/tmp/build-gate-output.txt; then
            printf "${GREEN}  ✓ Build succeeded${NC}\n"
        else
            printf "${RED}  ✗ Build failed:${NC}\n"
            tail -20 /tmp/build-gate-output.txt
            FAILURES=$((FAILURES + 1))
        fi
    else
        printf "${YELLOW}[4/5] Build check... skipped (no build script)${NC}\n"
    fi
fi

# ─── Check 5: Env var sanity ───
printf "${YELLOW}[5/5] Environment check...${NC}\n"
ENV_OK=true

# Check .env.local exists for projects that need it
if [ -f ".env.example" ] && [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
    printf "${RED}  ✗ .env.example exists but no .env.local found${NC}\n"
    ENV_OK=false
    WARNINGS=$((WARNINGS + 1))
fi

# Check for hardcoded localhost in source
if grep -rE "localhost:[0-9]+" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ app/ 2>/dev/null | grep -v "node_modules" | grep -v ".next" | head -3 | grep -q .; then
    printf "${YELLOW}  ⚠ Hardcoded localhost references found in source${NC}\n"
    WARNINGS=$((WARNINGS + 1))
fi

if $ENV_OK; then
    printf "${GREEN}  ✓ Environment looks good${NC}\n"
fi

# ─── Verdict ───
echo ""
if [ "$FAILURES" -gt 0 ]; then
    printf "${RED}╔══════════════════════════════════════════╗${NC}\n"
    printf "${RED}║  DEPLOY BLOCKED — %d check(s) failed      ║${NC}\n" "$FAILURES"
    printf "${RED}╚══════════════════════════════════════════╝${NC}\n"
    printf "${RED}Fix the issues above before deploying to production.${NC}\n"

    # Set block message for Claude Code
    export CLAUDE_BLOCK_MESSAGE="Deploy blocked: $FAILURES pre-deploy check(s) failed. Fix TypeScript/lint/test/build errors before deploying."
    exit 2
fi

if [ "$WARNINGS" -gt 0 ]; then
    printf "${YELLOW}⚠ %d warning(s) — proceeding with deploy${NC}\n" "$WARNINGS"
fi

printf "${GREEN}╔══════════════════════════════════════════╗${NC}\n"
printf "${GREEN}║  ALL CHECKS PASSED — Deploy approved ✓   ║${NC}\n"
printf "${GREEN}╚══════════════════════════════════════════╝${NC}\n"
exit 0
