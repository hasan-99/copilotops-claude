#!/usr/bin/env node
/**
 * playwright-capture.mjs — screenshot capture for the visual-polish loop.
 *
 * Prefers Playwright when the package is import-resolvable (project has it as a
 * dep, or the user ran `npm i -g playwright`). Falls back to driving a cached
 * Chromium / Google Chrome binary directly via `--headless=new --screenshot`.
 * Either path produces equivalent PNG output for the vision evaluator.
 *
 * Usage:
 *   node playwright-capture.mjs --url http://localhost:3000 --out /tmp/qpl-1
 *   node playwright-capture.mjs --url http://localhost:3000 --viewports 375,768,1440 --out /tmp/qpl-1 --wait 1500
 *
 * Output (one PNG per viewport, in --out):
 *   mobile-375.png  tablet-768.png  desktop-1440.png
 *
 * Stdout: a JSON envelope with per-capture status. Exit 0 on full success,
 * 1 if any viewport failed, 2 on invocation error.
 */

import { existsSync, mkdirSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { argv, exit } from "node:process";
import { homedir } from "node:os";

// ── Arg parsing ──────────────────────────────────────────────────────────
function parseArgs() {
  const args = { url: null, out: null, viewports: [375, 768, 1440], wait: 1500, reducedMotion: false, states: false, stateSelector: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url" && argv[i + 1]) args.url = argv[++i];
    else if (a === "--out" && argv[i + 1]) args.out = argv[++i];
    else if (a === "--viewports" && argv[i + 1]) {
      args.viewports = argv[++i].split(",").map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n) && n > 0);
    } else if (a === "--wait" && argv[i + 1]) args.wait = parseInt(argv[++i], 10);
    else if (a === "--reduced-motion") args.reducedMotion = true;
    else if (a === "--states") args.states = true;
    else if (a === "--state-selector" && argv[i + 1]) args.stateSelector = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log(`playwright-capture.mjs — Screenshot capture for /qualia-polish --loop

Usage:
  node playwright-capture.mjs --url <url> --out <dir> [--viewports 375,768,1440] [--wait 1500] [--reduced-motion] [--states]

Flags:
  --reduced-motion   Force prefers-reduced-motion: reduce in the captured page.
                     Use when the brief explicitly opts out of motion (a11y mode).
  --states           Also capture hover/focus interaction-state PNGs (Playwright
                     backend only — the Chrome-binary backend cannot drive
                     hover/focus from the CLI and silently skips them).
  --state-selector   CSS selector to target for --states (default: first
                     a, button, [role=button], or input on the page).

Backend selection (auto):
  1. Playwright   — import('playwright') if installed
  2. Chromium     — ~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome
  3. Google Chrome — google-chrome on PATH
  4. Chromium     — chromium on PATH`);
      exit(0);
    }
  }
  if (!args.url) { console.error("--url is required"); exit(2); }
  if (!args.out) { console.error("--out is required"); exit(2); }
  return args;
}

// ── Viewport name mapping ────────────────────────────────────────────────
function viewportName(width) {
  if (width <= 480) return "mobile";
  if (width <= 900) return "tablet";
  return "desktop";
}
// Initial render height for the Playwright context viewport. Capture is
// full-page (fullPage:true), so this is NOT a clamp on the captured PNG — it
// only sets the layout viewport before Playwright stitches the full scroll.
const INITIAL_RENDER_HEIGHT = 1080;
// Headless Chrome (binary backend) has no --full-page flag, so a tall window
// height approximates full-page capture. Replaces the old per-viewport clamp
// (812/1024/900) that cropped everything below the fold.
const FULLPAGE_WINDOW_HEIGHT = 8000;

// ── Backend: Playwright (preferred when available) ──────────────────────
async function captureViaPlaywright(args) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    try { ({ chromium } = await import("playwright-core")); } catch { return null; }
  }
  const results = [];
  let browser = null;
  try {
    browser = await chromium.launch({ headless: true });
    for (const width of args.viewports) {
      const name = viewportName(width);
      const height = INITIAL_RENDER_HEIGHT;
      const file = join(args.out, `${name}-${width}.png`);
      try {
        const ctxOpts = { viewport: { width, height }, deviceScaleFactor: 1 };
        if (args.reducedMotion) ctxOpts.reducedMotion = "reduce";
        const ctx = await browser.newContext(ctxOpts);
        const page = await ctx.newPage();
        await page.goto(args.url, { waitUntil: "networkidle", timeout: 30000 });
        if (args.wait > 0) await page.waitForTimeout(args.wait);
        await page.screenshot({ path: file, fullPage: true });
        const stateFiles = [];
        if (args.states) {
          const extra = await captureStates(page, args, name, width);
          stateFiles.push(...extra);
        }
        await ctx.close();
        results.push({ viewport: name, width, height, file, ok: true, backend: "playwright", reducedMotion: !!args.reducedMotion, ...(stateFiles.length ? { state_captures: stateFiles } : {}) });
      } catch (err) {
        results.push({ viewport: name, width, height, file, ok: false, backend: "playwright", error: err.message });
      }
    }
  } finally {
    if (browser) await browser.close();
  }
  return results;
}

// ── Optional interaction-state capture (--states, Playwright only) ───────
// Captures hover/focus/loading variant PNGs of the first interactive element
// (or --state-selector) so the evaluator can score Motion/States honestly
// instead of guessing from a single static above-fold frame. Best-effort: any
// individual state that can't be captured is recorded as ok:false, never throws.
async function captureStates(page, args, name, width) {
  const out = [];
  const selector = args.stateSelector
    || "a:visible, button:visible, [role=button]:visible, input:visible";
  let target;
  try {
    target = page.locator(selector).first();
    await target.waitFor({ state: "visible", timeout: 2000 });
  } catch {
    out.push({ state: "hover", viewport: name, width, ok: false, error: "no interactive target found" });
    return out;
  }

  // hover
  const hoverFile = join(args.out, `${name}-${width}-hover.png`);
  try {
    await target.hover({ timeout: 2000 });
    await page.waitForTimeout(Math.min(args.wait, 400));
    await target.screenshot({ path: hoverFile });
    out.push({ state: "hover", viewport: name, width, file: hoverFile, ok: true });
  } catch (e) {
    out.push({ state: "hover", viewport: name, width, file: hoverFile, ok: false, error: e.message });
  }

  // focus
  const focusFile = join(args.out, `${name}-${width}-focus.png`);
  try {
    await target.focus({ timeout: 2000 });
    await page.waitForTimeout(Math.min(args.wait, 400));
    await target.screenshot({ path: focusFile });
    out.push({ state: "focus", viewport: name, width, file: focusFile, ok: true });
  } catch (e) {
    out.push({ state: "focus", viewport: name, width, file: focusFile, ok: false, error: e.message });
  }

  // loading — re-navigate and grab the earliest paint (commit) before networkidle
  const loadingFile = join(args.out, `${name}-${width}-loading.png`);
  try {
    await page.goto(args.url, { waitUntil: "commit", timeout: 30000 });
    await page.screenshot({ path: loadingFile });
    out.push({ state: "loading", viewport: name, width, file: loadingFile, ok: true });
  } catch (e) {
    out.push({ state: "loading", viewport: name, width, file: loadingFile, ok: false, error: e.message });
  }

  return out;
}

// ── Backend: Chrome/Chromium headless via spawn ─────────────────────────
function findChromeBinary() {
  // 1. Playwright cached chromium (newest first)
  try {
    const pwCache = join(homedir(), ".cache", "ms-playwright");
    if (existsSync(pwCache)) {
      const dirs = readdirSync(pwCache)
        .filter((d) => d.startsWith("chromium-"))
        .sort((a, b) => parseInt(b.split("-")[1], 10) - parseInt(a.split("-")[1], 10));
      for (const d of dirs) {
        for (const sub of ["chrome-linux64/chrome", "chrome-linux/chrome", "chrome-mac/Chromium.app/Contents/MacOS/Chromium", "chrome-win/chrome.exe"]) {
          const p = join(pwCache, d, sub);
          if (existsSync(p)) return p;
        }
      }
    }
  } catch {}

  // 2. PATH lookups
  for (const cmd of ["google-chrome", "chromium", "chromium-browser", "chrome"]) {
    const r = spawnSync("which", [cmd], { encoding: "utf8" });
    if (r.status === 0 && r.stdout) return r.stdout.trim();
  }
  return null;
}

function captureViaChromeBinary(args, binary) {
  const results = [];
  for (const width of args.viewports) {
    const name = viewportName(width);
    // Tall window so headless Chrome's --screenshot is not cropped to a fixed
    // above-fold height. Classic headless has no --full-page flag, so a large
    // height is the closest equivalent to full-page capture on this backend.
    const height = FULLPAGE_WINDOW_HEIGHT;
    const file = join(args.out, `${name}-${width}.png`);
    const flags = [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      // Constrain layout WIDTH; use a tall height (not the old per-viewport
      // clamp) so the capture spans well below the fold.
      `--window-size=${width},${height}`,
      `--screenshot=${file}`,
      `--virtual-time-budget=${Math.max(args.wait + 1000, 3000)}`,
    ];
    if (args.reducedMotion) flags.push("--force-prefers-reduced-motion");
    flags.push(args.url);
    const r = spawnSync(binary, flags, { encoding: "utf8", timeout: 30000 });
    let ok = r.status === 0 && existsSync(file);
    let size = 0;
    if (ok) {
      try { size = statSync(file).size; } catch { ok = false; }
      if (size < 100) ok = false; // empty/zero PNG → treat as failure
    }
    results.push({
      viewport: name, width, height, file, ok,
      backend: "chrome-binary", binary,
      reducedMotion: !!args.reducedMotion,
      ...(ok ? {} : { error: r.stderr ? r.stderr.split("\n").slice(0, 3).join(" / ") : `exit ${r.status}` }),
    });
  }
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs();
  if (!existsSync(args.out)) mkdirSync(args.out, { recursive: true });

  let captures = await captureViaPlaywright(args);
  let backendUsed = "playwright";
  if (captures === null) {
    const bin = findChromeBinary();
    if (!bin) {
      console.error(JSON.stringify({
        ok: false,
        error: "no_browser_backend",
        hint: "Install Playwright (`npm i playwright && npx playwright install chromium`) or ensure google-chrome / chromium is on PATH.",
      }, null, 2));
      exit(2);
    }
    captures = captureViaChromeBinary(args, bin);
    backendUsed = "chrome-binary";
  }

  const failed = captures.filter((c) => !c.ok).length;
  // --states is only honored on the Playwright backend (the Chrome-binary
  // backend cannot drive hover/focus from the CLI). Surface that it was skipped.
  const statesSkipped = args.states && backendUsed === "chrome-binary";
  console.log(JSON.stringify({
    url: args.url,
    output_dir: args.out,
    backend: backendUsed,
    captures,
    total: captures.length,
    failed,
    ...(args.states ? { states_requested: true } : {}),
    ...(statesSkipped ? { states_skipped: "chrome-binary backend cannot capture hover/focus/loading states" } : {}),
  }, null, 2));
  exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message, stack: e.stack }, null, 2));
  exit(2);
});
