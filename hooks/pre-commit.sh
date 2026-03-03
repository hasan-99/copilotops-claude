#!/bin/bash
# Pre-commit validation hook for Claude Code
# Runs before git commit to validate code quality

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
DIM='\033[2m'
NC='\033[0m' # No Color

printf "${YELLOW}Running pre-commit checks...${NC}\n"

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
    printf "${GREEN}No files staged for commit${NC}\n"
    exit 0
fi

# Check for secrets in staged files
echo "Checking for secrets..."
SECRETS_PATTERN="(api[_-]?key|apikey|secret[_-]?key|password|passwd|pwd|token|auth[_-]?token|access[_-]?token|private[_-]?key)[\s]*[=:][\"'\s]*[A-Za-z0-9+/=_-]{20,}"

for file in $STAGED_FILES; do
    if [ -f "$file" ]; then
        if grep -iE "$SECRETS_PATTERN" "$file" > /dev/null 2>&1; then
            printf "${RED}Potential secret found in: %s${NC}\n" "$file"
            echo "Please remove sensitive data before committing"
            exit 1
        fi
    fi
done

# Check for console.log/debugger in JS/TS files
JS_FILES=$(echo "$STAGED_FILES" | grep -E '\.(js|jsx|ts|tsx)$' || true)
if [ -n "$JS_FILES" ]; then
    echo "Checking for debug statements..."
    for file in $JS_FILES; do
        if [ -f "$file" ]; then
            if grep -E "console\.(log|debug|info)|debugger" "$file" > /dev/null 2>&1; then
                printf "${YELLOW}Warning: Debug statement found in: %s${NC}\n" "$file"
                # Warning only, don't block
            fi
        fi
    done
fi

# Run type checking for TypeScript projects
if [ -f "tsconfig.json" ]; then
    echo "Running TypeScript check..."
    if command -v npx &> /dev/null; then
        npx tsc --noEmit 2>/dev/null || {
            printf "${RED}TypeScript errors found${NC}\n"
            exit 1
        }
    fi
fi

# Run linting if eslint is available
if [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ] || [ -f "eslint.config.js" ]; then
    if command -v npx &> /dev/null; then
        echo "Running ESLint..."
        npx eslint --max-warnings=0 $JS_FILES 2>/dev/null || {
            printf "${YELLOW}ESLint warnings found (continuing)${NC}\n"
        }
    fi
fi

# Run tests if test script exists (quality gate)
if [ -f "package.json" ]; then
    # Check if test script exists and isn't the default placeholder
    TEST_SCRIPT=$(node -e "try { const p = require('./package.json'); console.log(p.scripts?.test || ''); } catch(e) { console.log(''); }" 2>/dev/null)

    if [ -n "$TEST_SCRIPT" ] && [ "$TEST_SCRIPT" != "echo \"Error: no test specified\" && exit 1" ]; then
        echo "Running tests..."

        # Run tests but only for changed files if possible
        if echo "$TEST_SCRIPT" | grep -q "vitest\|jest"; then
            # Use --changed flag for vitest/jest if available
            npm test -- --passWithNoTests --changed 2>/dev/null || npm test -- --passWithNoTests 2>/dev/null || {
                printf "${RED}Tests failed! Fix tests before committing.${NC}\n"
                printf "${DIM}Tip: Use 'git commit --no-verify' to skip (not recommended)${NC}\n"
                exit 1
            }
        else
            # Run full test suite for other test runners
            npm test 2>/dev/null || {
                printf "${RED}Tests failed! Fix tests before committing.${NC}\n"
                printf "${DIM}Tip: Use 'git commit --no-verify' to skip (not recommended)${NC}\n"
                exit 1
            }
        fi
        printf "${GREEN}Tests passed!${NC}\n"
    fi
fi

# Run build check if build script exists (opt-in via CLAUDE_PRE_COMMIT_BUILD=1)
if [ "$CLAUDE_PRE_COMMIT_BUILD" = "1" ] && [ -f "package.json" ]; then
    BUILD_SCRIPT=$(node -e "try { const p = require('./package.json'); console.log(p.scripts?.build || ''); } catch(e) { console.log(''); }" 2>/dev/null)

    # Only run build check for significant changes (not just docs/config)
    SIGNIFICANT_CHANGES=$(echo "$STAGED_FILES" | grep -E '\.(ts|tsx|js|jsx|css|scss)$' | wc -l | tr -d ' ')

    if [ -n "$BUILD_SCRIPT" ] && [ "$SIGNIFICANT_CHANGES" -gt 0 ]; then
        echo "Checking build..."
        npm run build 2>/dev/null || {
            printf "${RED}Build failed! Fix build errors before committing.${NC}\n"
            exit 1
        }
        printf "${GREEN}Build check passed!${NC}\n"
    fi
else
    printf "${YELLOW}Skipping build check (set CLAUDE_PRE_COMMIT_BUILD=1 to enable)${NC}\n"
fi

# Check for .env files
ENV_FILES=$(echo "$STAGED_FILES" | grep -E '\.env($|\.)' | grep -v '.example' | grep -v '.sample' || true)
if [ -n "$ENV_FILES" ]; then
    printf "${RED}Warning: .env file(s) staged for commit:${NC}\n"
    echo "$ENV_FILES"
    echo "Consider adding to .gitignore"
    exit 1
fi

printf "${GREEN}Pre-commit checks passed!${NC}\n"
exit 0
