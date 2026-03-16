---
name: test-runner
description: Automate testing for Qualia Solutions projects - runs unit tests, integration tests, generates coverage reports, and creates missing tests
---

# Automated Testing Skill

Handles all testing operations for your projects.

## Run Tests (canonical reference)

This is the single source of truth for test detection and execution in the Qualia workflow.
Referenced by: `/qualia-verify-work`, `/ship`, `auto-test.sh` hook.

### Detection
```bash
# Unit/Integration
[ -f package.json ] && grep -q '"test"' package.json && echo "HAS_UNIT=true"

# E2E - Playwright
ls playwright.config.* 2>/dev/null && echo "HAS_PLAYWRIGHT=true"

# E2E - Cypress
ls cypress.config.* 2>/dev/null && echo "HAS_CYPRESS=true"

# Python
[ -f pytest.ini ] || [ -f setup.cfg ] || [ -f pyproject.toml ] && echo "HAS_PYTEST=true"
```

### Execution Order
1. Unit/Integration: `npm test` (or `pytest --cov`)
2. E2E Playwright: `npx playwright test`
3. E2E Cypress: `npx cypress run`
4. Report: X passed, Y failed, Z skipped per runner

### Result Format
```
Test Results: {runner}
- Passed: X
- Failed: Y
- Skipped: Z
{If failures: list names}
```

## Auto-detect and Run Tests

When you say "run tests", I automatically:

### For JavaScript/TypeScript Projects
```bash
# Detect test runner
if [ -f "package.json" ]; then
  if grep -q "jest" package.json; then
    npm test -- --coverage
  elif grep -q "vitest" package.json; then
    npm run test -- --coverage
  elif grep -q "mocha" package.json; then
    npm test
  fi
fi
```

### For Python Projects
```bash
# Run pytest with coverage
if [ -f "requirements.txt" ]; then
  pytest --cov=src --cov-report=html --cov-report=term
fi
```

## Generate Missing Tests

When you say "create tests for X", I generate:

### React Component Test
```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByText('Click'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Python Function Test
```python
# test_agent.py
import pytest
from agent import QualiaAgent

class TestQualiaAgent:
    @pytest.fixture
    def agent(self):
        return QualiaAgent("test")

    async def test_process_input(self, agent):
        response = await agent.process("Hello")
        assert response is not None
        assert isinstance(response, str)

    async def test_error_handling(self, agent):
        with pytest.raises(ValueError):
            await agent.process("")
```

## Coverage Reports

### Generate Coverage
```bash
# JavaScript
npm test -- --coverage --coverageReporters=html

# Python
pytest --cov --cov-report=html

# Open report
open coverage/index.html  # or htmlcov/index.html
```

### Coverage Requirements
- Minimum 80% overall
- 90% for critical paths
- 100% for utility functions

## Test Types

### Unit Tests
- Test individual functions
- Mock external dependencies
- Fast execution (<1s per test)

### Integration Tests
```javascript
// API integration test
describe('API Integration', () => {
  it('creates user successfully', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'test@example.com' })

    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty('id')
  })
})
```

### E2E Tests
```javascript
// Playwright E2E test
test('user can complete signup flow', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Sign Up')
  await page.fill('[name=email]', 'test@example.com')
  await page.fill('[name=password]', 'password123')
  await page.click('button[type=submit]')
  await expect(page).toHaveURL('/dashboard')
})
```

## CI/CD Integration

### GitHub Actions
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v2
```

## Quick Commands

- "test" → Run all tests
- "test unit" → Run unit tests only
- "test integration" → Run integration tests
- "test e2e" → Run end-to-end tests
- "create tests" → Generate missing tests
- "coverage" → Generate coverage report

## Test Watching

```bash
# Watch mode for development
npm test -- --watch
# or
pytest-watch