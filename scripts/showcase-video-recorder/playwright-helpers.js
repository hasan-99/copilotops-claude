/**
 * Playwright Recording Helpers
 * Bundled with showcase-video-recorder skill
 *
 * Usage: const helpers = require('./playwright-helpers');
 */

/**
 * Mask all input fields to hide credentials.
 * Call BEFORE submitting login forms.
 */
async function maskInputs(page) {
  await page.evaluate(() => {
    document.querySelectorAll('input[type="password"], input[type="email"], input[type="text"]')
      .forEach(el => {
        el.style.webkitTextSecurity = 'disc';
        el.style.color = 'transparent';
        el.style.textShadow = '0 0 8px rgba(255,255,255,0.5)';
      });
  });
}

/**
 * Smooth scroll with cubic ease-in-out.
 * @param {import('playwright').Page} page
 * @param {number} targetY - Target scroll position in pixels
 * @param {number} duration - Animation duration in ms (default 1500)
 */
async function smoothScroll(page, targetY, duration = 1500) {
  await page.evaluate(async ({ targetY, duration }) => {
    const startY = window.scrollY;
    const distance = targetY - startY;
    const startTime = performance.now();
    return new Promise(resolve => {
      function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Cubic ease-in-out
        const ease = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        window.scrollTo(0, startY + distance * ease);
        if (progress < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  }, { targetY, duration });
}

/**
 * Click a button by its accessible name, with fallback to text content.
 * @returns {boolean} true if clicked, false if not found
 */
async function clickButton(page, text, timeout = 5000) {
  try {
    const btn = page.getByRole('button', { name: text });
    await btn.waitFor({ state: 'visible', timeout });
    await btn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await btn.click();
    return true;
  } catch {
    try {
      const fallback = page.locator(`text="${text}"`).first();
      await fallback.waitFor({ state: 'visible', timeout: 3000 });
      await fallback.click();
      return true;
    } catch {
      console.log(`[WARN] Button not found: "${text}" — skipping`);
      return false;
    }
  }
}

/**
 * Type text with natural human-like timing variation.
 * @param {number} baseDelay - Base delay between keystrokes in ms
 */
async function naturalType(page, selector, text, baseDelay = 80) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout: 5000 });
  await el.click();
  await page.waitForTimeout(200);
  for (const char of text) {
    await el.type(char, { delay: 0 });
    const delay = baseDelay + Math.random() * 60 - 30;
    await page.waitForTimeout(Math.max(30, delay));
  }
}

/**
 * Add a custom cursor highlight ring that follows mouse movement.
 * Teal border (#00FFD1) with purple click feedback (#8B5CF6).
 * Must be called after every page navigation (ring is lost on navigation).
 */
async function addCursorHighlight(page) {
  await page.evaluate(() => {
    // Remove existing ring if present
    const existing = document.getElementById('cursor-highlight');
    if (existing) existing.remove();

    const ring = document.createElement('div');
    ring.id = 'cursor-highlight';
    ring.style.cssText = `
      position: fixed; width: 28px; height: 28px;
      border: 2px solid #00FFD1; border-radius: 50%;
      pointer-events: none; z-index: 999999;
      transform: translate(-50%, -50%);
      transition: all 0.15s ease-out;
      box-shadow: 0 0 10px rgba(0,255,209,0.3);
    `;
    document.body.appendChild(ring);

    document.addEventListener('mousemove', e => {
      ring.style.left = e.clientX + 'px';
      ring.style.top = e.clientY + 'px';
    });

    document.addEventListener('mousedown', () => {
      ring.style.borderColor = '#8B5CF6';
      ring.style.transform = 'translate(-50%, -50%) scale(0.8)';
      ring.style.boxShadow = '0 0 20px rgba(139,92,246,0.5)';
    });

    document.addEventListener('mouseup', () => {
      ring.style.borderColor = '#00FFD1';
      ring.style.transform = 'translate(-50%, -50%) scale(1)';
      ring.style.boxShadow = '0 0 10px rgba(0,255,209,0.3)';
    });
  });
}

/**
 * Click a navigation link by its text content.
 * Waits for network idle after navigation.
 */
async function clickNavLink(page, text, timeout = 8000) {
  try {
    const link = page.locator(`a:has-text("${text}")`).first();
    await link.waitFor({ state: 'visible', timeout: 5000 });
    await link.click();
    await page.waitForLoadState('networkidle', { timeout });
    await page.waitForTimeout(1500);
    return true;
  } catch {
    console.log(`[WARN] Nav link not found: "${text}" — skipping`);
    return false;
  }
}

/**
 * Hover over an element to trigger hover states for visual effect.
 */
async function hoverElement(page, selector, duration = 1000) {
  try {
    const el = page.locator(selector).first();
    await el.waitFor({ state: 'visible', timeout: 3000 });
    await el.hover();
    await page.waitForTimeout(duration);
    return true;
  } catch {
    return false;
  }
}

/**
 * Scene timestamp tracker for ffmpeg post-processing.
 */
class SceneTracker {
  constructor() {
    this.scenes = [];
    this.startTime = null;
  }

  start() {
    this.startTime = Date.now();
    this.mark('start');
  }

  mark(name) {
    if (!this.startTime) this.startTime = Date.now();
    const elapsed = (Date.now() - this.startTime) / 1000;
    this.scenes.push({ name, time: elapsed });
    console.log(`[SCENE] ${name} @ ${elapsed.toFixed(1)}s`);
  }

  getScenes() {
    return this.scenes;
  }

  printSummary() {
    console.log('\n=== SCENE TIMESTAMPS ===');
    console.log(JSON.stringify(this.scenes, null, 2));

    // Calculate raw durations
    console.log('\n=== SEGMENT DURATIONS ===');
    for (let i = 0; i < this.scenes.length - 1; i++) {
      const raw = this.scenes[i + 1].time - this.scenes[i].time;
      console.log(`  ${this.scenes[i].name}: ${raw.toFixed(1)}s`);
    }
    const total = this.scenes[this.scenes.length - 1].time - this.scenes[0].time;
    console.log(`  TOTAL RAW: ${total.toFixed(1)}s`);
  }
}

module.exports = {
  maskInputs,
  smoothScroll,
  clickButton,
  naturalType,
  addCursorHighlight,
  clickNavLink,
  hoverElement,
  SceneTracker,
};
