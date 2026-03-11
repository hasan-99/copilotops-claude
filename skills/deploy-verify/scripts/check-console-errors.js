#!/usr/bin/env node
// check-console-errors.js — Detect client-side JS errors via Playwright headless browser
// Usage: node check-console-errors.js <URL>
// Output: JSON { "status": "PASS|WARN|FAIL", "errors": [...], "detail": "..." }

const url = process.argv[2];
if (!url) {
  console.log(JSON.stringify({ status: "FAIL", errors: [], detail: "No URL provided" }));
  process.exit(1);
}

// Known benign error patterns (third-party, browser extensions, etc.)
const BENIGN_PATTERNS = [
  /third.?party/i,
  /gtag/i,
  /analytics/i,
  /fbq/i,
  /hotjar/i,
  /intercom/i,
  /clarity/i,
  /sentry/i,
  /Failed to load resource.*favicon/i,
  /ERR_BLOCKED_BY_CLIENT/i, // ad blockers
  /net::ERR_FAILED.*chrome-extension/i,
  /ResizeObserver loop/i,
  /Loading chunk.*failed/i, // sometimes transient
];

// Critical error patterns — these always mean FAIL
const CRITICAL_PATTERNS = [
  /TypeError/,
  /ReferenceError/,
  /SyntaxError/,
  /ChunkLoadError/,
  /Unhandled/i,
  /NEXT_/,
  /Internal Server Error/i,
  /500/,
  /Cannot read propert/i,
  /is not defined/i,
  /is not a function/i,
  /Hydration/i,
];

async function run() {
  let chromium;
  try {
    // Try to import playwright
    const pw = require('playwright');
    chromium = pw.chromium;
  } catch {
    try {
      const pw = require('playwright-core');
      chromium = pw.chromium;
    } catch {
      console.log(JSON.stringify({
        status: "SKIP",
        errors: [],
        detail: "Playwright not available — install with: npm i -g playwright"
      }));
      process.exit(0);
    }
  }

  const errors = [];
  const warnings = [];
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Collect console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Collect page-level errors (uncaught exceptions)
    page.on('pageerror', err => {
      errors.push(err.message || String(err));
    });

    // Navigate with timeout
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Give a brief extra moment for any late errors
    await page.waitForTimeout(2000);

    await browser.close();
    browser = null;

    // Classify errors
    const criticalErrors = [];
    const benignErrors = [];

    for (const err of errors) {
      const isBenign = BENIGN_PATTERNS.some(p => p.test(err));
      const isCritical = CRITICAL_PATTERNS.some(p => p.test(err));

      if (isCritical && !isBenign) {
        criticalErrors.push(err);
      } else {
        benignErrors.push(err);
      }
    }

    if (criticalErrors.length > 0) {
      console.log(JSON.stringify({
        status: "FAIL",
        errors: criticalErrors,
        benign: benignErrors.length,
        detail: `${criticalErrors.length} critical error(s): ${criticalErrors[0].substring(0, 120)}`,
      }));
    } else if (benignErrors.length > 0) {
      console.log(JSON.stringify({
        status: "WARN",
        errors: benignErrors,
        benign: benignErrors.length,
        detail: `${benignErrors.length} non-critical error(s) (third-party/benign)`,
      }));
    } else {
      console.log(JSON.stringify({
        status: "PASS",
        errors: [],
        detail: "No console errors detected",
      }));
    }
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.log(JSON.stringify({
      status: "FAIL",
      errors: [err.message],
      detail: `Browser check failed: ${err.message.substring(0, 120)}`,
    }));
    process.exit(1);
  }
}

run();
