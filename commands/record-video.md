---
description: Record professional ~1-minute showcase videos for web projects using Playwright + ffmpeg. Use for any request to record, capture, demo, or create a video of a website.
argument-hint: "<project-url> [--login email:password] [--slug project-slug] [--dark|--light]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
---

# /record-video — Showcase Video Recorder

Record a professional ~1-minute showcase video for a web project using headless Playwright browser automation + ffmpeg post-processing. Outputs an H.264 MP4 ready for the Qualia Solutions work page.

**Helper scripts location:** `~/.claude/scripts/showcase-video-recorder/`
- `playwright-helpers.js` — maskInputs, smoothScroll, clickButton, naturalType, addCursorHighlight, clickNavLink, hoverElement, SceneTracker
- `ffmpeg-builder.js` — buildFfmpegCommand, autoTuneSpeeds (CLI + module)

## Parse Arguments

From `$ARGUMENTS`, extract:
- **url** — The target website URL (required)
- **--login email:password** — Credentials if login required (optional)
- **--slug project-slug** — Slug for output filename (auto-derived from URL if not given)
- **--dark** / **--light** — Color scheme preference (default: dark)

**Derive slug** from URL if not provided: strip protocol, take domain, remove common TLDs and prefixes.

**Output directory:** Create `/tmp/showcase-videos/{slug}/` for all recording artifacts.

## Pipeline (5 Phases)

### Phase 1: Scout the Target Site

Create and run a scouting script to discover the site's UI structure before recording anything.

```javascript
// /tmp/showcase-videos/{slug}/scout.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto('TARGET_URL', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // If login required:
  // await page.fill('input[type="email"]', 'EMAIL');
  // await page.fill('input[type="password"]', 'PASSWORD');
  // await page.click('button[type="submit"]');
  // await page.waitForTimeout(3000);

  // Discover navigation
  const navLinks = await page.$$eval('nav a, [role="navigation"] a, header a', els =>
    els.map(el => ({ text: el.textContent?.trim(), href: el.href }))
  );
  console.log('=== NAVIGATION ===');
  console.log(JSON.stringify(navLinks, null, 2));

  // Discover buttons
  const buttons = await page.$$eval('button, [role="button"], input[type="submit"]', els =>
    els.map(el => ({
      text: el.textContent?.trim() || el.value || el.getAttribute('aria-label'),
      classes: el.className?.substring(0, 80)
    }))
  );
  console.log('=== BUTTONS ===');
  console.log(JSON.stringify(buttons, null, 2));

  // Discover sidebar/menu
  const sidebar = await page.$$eval('[class*="sidebar"] a, [class*="menu"] a, [class*="nav"] li', els =>
    els.map(el => ({ text: el.textContent?.trim(), tag: el.tagName }))
  );
  console.log('=== SIDEBAR/MENU ===');
  console.log(JSON.stringify(sidebar, null, 2));

  // Discover inputs
  const inputs = await page.$$eval('input, textarea, [contenteditable="true"]', els =>
    els.map(el => ({
      type: el.type || el.tagName,
      placeholder: el.placeholder,
      name: el.name,
      id: el.id
    }))
  );
  console.log('=== INPUTS ===');
  console.log(JSON.stringify(inputs, null, 2));

  // Discover headings
  const headings = await page.$$eval('h1, h2, h3', els =>
    els.map(el => ({ level: el.tagName, text: el.textContent?.trim() }))
  );
  console.log('=== HEADINGS ===');
  console.log(JSON.stringify(headings, null, 2));

  // Screenshot main page
  await page.screenshot({ path: `/tmp/showcase-videos/SLUG/scout-main.png`, fullPage: true });

  // Navigate to each major section
  for (const link of navLinks.slice(0, 5)) {
    if (link.href && !link.href.includes('logout')) {
      try {
        await page.goto(link.href, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `/tmp/showcase-videos/SLUG/scout-${link.text?.replace(/\s+/g, '-')}.png` });
      } catch (e) { console.log(`Skip: ${link.text}`); }
    }
  }

  await browser.close();
  console.log('=== SCOUTING COMPLETE ===');
})();
```

**Run:** `node /tmp/showcase-videos/{slug}/scout.js`

**Review output** and identify:
- 4-8 key features to showcase
- Exact selectors for interactive elements
- Login flow requirements
- Navigation structure for scene planning

### Phase 2: Plan Scenes

Based on scouting results, plan 6-12 scenes. Present the plan to the user:

| Scene | Duration (raw) | Speed | Final | Content |
|-------|---------------|-------|-------|---------|
| 1 | 4s | 1.0x | 4s | Landing/hero |
| 2 | 8s | 1.5x | 5s | Dashboard overview |
| ... | ... | ... | ... | ... |

**Speed guidelines:**
- **1.0x** — Hero shots, impressive UI moments, key interactions
- **1.2x-1.5x** — Standard feature demonstrations
- **2.0x-3.0x** — Navigation transitions, loading, repetitive actions
- **Never exceed 4.0x** — becomes unwatchable

**Target:** Sum "Final" column = ~60s (55-65s acceptable range).

### Phase 3: Record with Playwright

Create the recording script. Copy helpers INLINE (do not require external files — the script must be self-contained for reliability).

```javascript
// /tmp/showcase-videos/{slug}/record.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CONFIG = {
  url: 'TARGET_URL',
  auth: {
    required: false,          // true if login needed
    email: '',
    password: '',
    emailSelector: 'input[type="email"]',
    passwordSelector: 'input[type="password"]',
    submitSelector: 'button[type="submit"]',
  },
  viewport: { width: 1920, height: 1080 },
  colorScheme: 'dark',       // or 'light'
  videoDir: path.join(__dirname, 'raw'),
};

// --- INLINE HELPERS (paste from ~/.claude/scripts/showcase-video-recorder/playwright-helpers.js) ---
// maskInputs, smoothScroll, clickButton, naturalType, addCursorHighlight, clickNavLink, hoverElement, SceneTracker
// ... (copy all helper functions inline) ...

(async () => {
  fs.mkdirSync(CONFIG.videoDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    colorScheme: CONFIG.colorScheme,
    recordVideo: { dir: CONFIG.videoDir, size: CONFIG.viewport },
  });

  const page = await context.newPage();
  const tracker = new SceneTracker();
  tracker.start();

  // === SCENE 1: Landing ===
  tracker.mark('landing');
  await page.goto(CONFIG.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  if (CONFIG.auth.required) {
    await addCursorHighlight(page);
    await naturalType(page, CONFIG.auth.emailSelector, CONFIG.auth.email);
    await page.waitForTimeout(500);
    await naturalType(page, CONFIG.auth.passwordSelector, CONFIG.auth.password);
    await maskInputs(page);  // BEFORE submit
    await page.waitForTimeout(800);
    await page.click(CONFIG.auth.submitSelector);
    await page.waitForTimeout(3000);
  }

  await addCursorHighlight(page);

  // === SCENE 2+: Feature demonstrations ===
  // (Customize per project based on scout results)
  // tracker.mark('feature-name');
  // try {
  //   await clickButton(page, 'Feature');
  //   await page.waitForTimeout(2000);
  // } catch (e) {
  //   console.log('[WARN] Feature not available, skipping');
  // }

  // === FINAL: Hero shot ===
  tracker.mark('finale');
  await smoothScroll(page, 0, 1500);
  await page.waitForTimeout(2000);

  // === CLEANUP ===
  tracker.mark('end');
  tracker.printSummary();

  // Save scenes.json for ffmpeg
  const scenesPath = path.join(__dirname, 'scenes.json');
  fs.writeFileSync(scenesPath, JSON.stringify(tracker.getScenes(), null, 2));
  console.log(`\nScenes saved to: ${scenesPath}`);

  await page.close();
  await context.close();
  await browser.close();

  // Find recorded video
  const files = fs.readdirSync(CONFIG.videoDir).filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    console.log(`\nRecorded: ${path.join(CONFIG.videoDir, files[files.length - 1])}`);
  }
})();
```

**Critical recording rules:**
1. Every UI interaction in try/catch — never crash the recording
2. Call `addCursorHighlight(page)` after every page navigation
3. Call `maskInputs(page)` BEFORE clicking submit on login
4. Use `tracker.mark('name')` before each scene
5. Minimum 500ms between clicks, 1000-2000ms for visual pauses
6. Always use `smoothScroll()` — never raw `window.scrollTo`
7. `headless: true` always — consistent rendering
8. Save `scenes.json` at the end for ffmpeg

**Run:** `node /tmp/showcase-videos/{slug}/record.js`

### Phase 4: FFmpeg Post-Processing

After recording, process with ffmpeg for per-scene speed adjustments + H.264 encoding.

**Option A: Use the ffmpeg-builder script:**
```bash
node ~/.claude/scripts/showcase-video-recorder/ffmpeg-builder.js \
  /tmp/showcase-videos/{slug}/raw/INPUT.webm \
  /tmp/showcase-videos/{slug}/{slug}.mp4 \
  /tmp/showcase-videos/{slug}/scenes.json
```

**Option B: Manual ffmpeg command** (build from scenes.json):
```bash
ffmpeg -i raw/INPUT.webm \
  -filter_complex "
    [0:v]split=N[s1][s2]...[sN];
    [s1]trim=start=T1:end=T2,setpts=(PTS-STARTPTS)/SPEED1[v1];
    [s2]trim=start=T2:end=T3,setpts=(PTS-STARTPTS)/SPEED2[v2];
    ...
    [v1][v2]...[vN]concat=n=N:v=1:a=0[out]
  " \
  -map "[out]" \
  -c:v libx264 -preset medium -crf 20 \
  -pix_fmt yuv420p -r 30 -s 1920x1080 \
  -movflags +faststart \
  {slug}.mp4
```

**If no speed adjustments needed** (simple encode):
```bash
ffmpeg -i raw/INPUT.webm \
  -c:v libx264 -preset medium -crf 20 \
  -pix_fmt yuv420p -r 30 -s 1920x1080 \
  -movflags +faststart \
  {slug}.mp4
```

### Phase 5: Deploy to Production

1. **Copy to qualiafinal public folder:**
   ```bash
   cp /tmp/showcase-videos/{slug}/{slug}.mp4 ~/Projects/live/qualiafinal/public/Projects/{slug}.mp4
   ```

2. **Update projects.ts** if the video field needs updating:
   ```typescript
   video: '/Projects/{slug}.mp4'
   ```

3. **Verify file size:** Should be 5-15MB for 60s at CRF 20. If >20MB, re-encode with CRF 23-25.

## Video Quality Requirements (Non-Negotiable)

| Spec | Value |
|------|-------|
| Resolution | 1920x1080 |
| Codec | H.264 (libx264) |
| Quality | CRF 20 |
| Frame rate | 30fps |
| Container | MP4 + movflags +faststart |
| Duration | 55-65 seconds |
| File size | 5-15MB |

## Qualia Work Page Projects

These are all projects on qualiasolutions.net/work. Videos go to `~/Projects/live/qualiafinal/public/Projects/{slug}.mp4`.

**Projects with local videos (already recorded):**
axidex, ai-boss-brainz, tamoil, breathe-iv, an-exchange, tzironis, carhub, urban-catering, kids-festive, omu-media, autoexclusive, build-stay, zambelis, melon-auto, black-gold, haamah, vero-models, inrvo, underdog-sales, ai-sales-coach, maison-maud

**Projects with external Squarespace videos (need local re-recording):**
sigatalachana, jeenee-ai, alkemy, aicoachs

**Data file:** `~/Projects/live/qualiafinal/data/projects.ts`
**Video field format:** `video: '/Projects/{slug}.mp4'`

## Batch Mode

When asked to record multiple projects, process them sequentially:
1. Scout project 1 → plan → record → ffmpeg → deploy
2. Scout project 2 → plan → record → ffmpeg → deploy
3. ...

Report progress after each project completes.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Black/empty video | Increase waitForTimeout after page load to 3000ms |
| Elements not found | Re-run scout; selectors may have changed |
| Video too long | Increase speeds on transitions (2.0-3.0x) |
| Video too short | Add more feature demos or slow hero moments |
| Jerky scrolling | Increase scroll duration to 2000ms |
| Login visible | Call maskInputs() BEFORE clicking submit |
| Cursor ring missing | Call addCursorHighlight() after every navigation |
| ffmpeg error | Check timestamps don't overlap or have gaps |
| File too large (>20MB) | Increase CRF to 23-25 |
| Chromium not found | `npx playwright install chromium` |
| Script crashes | Wrap every interaction in try/catch |

## Delivery Checklist

Before marking a video as done:
- [ ] Video starts immediately (no black frames)
- [ ] All credentials masked/blurred
- [ ] Custom cursor ring visible throughout
- [ ] Smooth scrolling on all scroll actions
- [ ] At least 4 distinct features showcased
- [ ] Duration 55-65 seconds
- [ ] File size under 15MB
- [ ] H.264 codec with movflags +faststart
- [ ] Copied to qualiafinal public/Projects/
- [ ] projects.ts updated with video path
