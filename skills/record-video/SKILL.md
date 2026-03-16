---
name: record-video
description: "Record showcase videos of live websites using Playwright and ffmpeg. Use this skill whenever the user says 'record video', 'showcase recording', 'capture website video', 'record site', or wants to create a demo/showcase video of any website. Also trigger when user mentions Playwright recording, website demo videos, or needs to capture scrolling/interaction footage of a web project."
---

# Record Video — Showcase Website Recorder

Record polished showcase videos of live websites using Playwright for browser automation and ffmpeg for post-processing.

## Usage

`/record-video <url>` — Record a showcase video of the given URL
`/record-video --slug=aquador` — Record a known project by slug
`/record-video --login` — Include login flow in recording
`/record-video --dark` / `--light` — Force color scheme

## Video Specifications

- Resolution: 1920x1080
- Codec: H.264
- Quality: CRF 20
- Framerate: 30fps
- Duration: 55-65 seconds target
- File size: 5-15MB target
- Format: MP4

## Helper Scripts

Located at `~/.claude/scripts/showcase-video-recorder/`:

- `playwright-helpers.js` — Browser setup, smooth scrolling, element interactions
- `ffmpeg-builder.js` — Video processing pipeline construction

## 5-Phase Pipeline

### Phase 1: Scout

Analyze the target site before recording:

```javascript
// scout.js pattern
const { chromium } = require('playwright');

async function scout(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(url, { waitUntil: 'networkidle' });

  // Gather page info
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  const sections = await page.$$eval('section, [id], h1, h2', els =>
    els.map(el => ({ tag: el.tagName, id: el.id, y: el.getBoundingClientRect().y }))
  );
  const hasAnimations = await page.evaluate(() =>
    document.querySelectorAll('[class*="animate"], [class*="motion"], [class*="transition"]').length > 0
  );
  const interactiveElements = await page.$$eval('button, a, input, [role="button"]', els => els.length);

  await browser.close();
  return { pageHeight, sections, hasAnimations, interactiveElements };
}
```

### Phase 2: Plan Scenes

Design a scene list based on scout data. Each scene should be 5-12 seconds. Aim for 5-8 scenes totaling 55-65 seconds.

Scene types:
- **Hero reveal** — Page load with hero section (5-8s)
- **Smooth scroll** — Scroll through content sections (8-12s)
- **Interaction** — Click buttons, hover elements, open menus (5-8s)
- **Feature highlight** — Pause on key features (5-8s)
- **Mobile view** — Resize viewport to show responsive design (8-10s)
- **Final shot** — Return to top or key CTA (3-5s)

### Phase 3: Record

Record each scene with Playwright:

```javascript
// record.js pattern
const { chromium } = require('playwright');

async function record(url, scenes) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: './raw-frames/', size: { width: 1920, height: 1080 } }
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });

  for (const scene of scenes) {
    await executeScene(page, scene);
  }

  await context.close();
  await browser.close();
}

async function executeScene(page, scene) {
  switch (scene.type) {
    case 'scroll':
      await smoothScroll(page, scene.target, scene.duration);
      break;
    case 'click':
      await page.click(scene.selector);
      await page.waitForTimeout(scene.pause || 1000);
      break;
    case 'hover':
      await page.hover(scene.selector);
      await page.waitForTimeout(scene.pause || 800);
      break;
    case 'resize':
      await page.setViewportSize(scene.viewport);
      await page.waitForTimeout(scene.pause || 2000);
      break;
  }
}

async function smoothScroll(page, targetY, duration) {
  await page.evaluate(async ({ targetY, duration }) => {
    const start = window.scrollY;
    const distance = targetY - start;
    const startTime = Date.now();
    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    return new Promise(resolve => {
      function step() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        window.scrollTo(0, start + distance * easeInOutCubic(progress));
        if (progress < 1) requestAnimationFrame(step);
        else resolve();
      }
      step();
    });
  }, { targetY, duration });
}
```

### Phase 4: FFmpeg Post-Processing

Process the raw recording:

```bash
ffmpeg -i raw.webm \
  -vf "fps=30,scale=1920:1080:flags=lanczos" \
  -c:v libx264 -preset slow -crf 20 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -an \
  output.mp4
```

Optional enhancements:
- Fade in/out: `-vf "fade=in:0:30,fade=out:ST:30"` (where ST = total_frames - 30)
- Speed adjustment: `-vf "setpts=0.8*PTS"` for slight speedup
- Trim: `-ss 0 -t 60` to cap at 60 seconds

### Phase 5: Deploy

Save the final video:

```bash
cp output.mp4 ~/Projects/live/qualiafinal/public/videos/showcase/<slug>.mp4
```

## Flags

- `--login` — Include authentication flow in recording (for authenticated apps)
- `--slug=<name>` — Use a known project slug from the portfolio list
- `--dark` / `--light` — Force `prefers-color-scheme` for the recording
- `--duration=<seconds>` — Override default 60s target duration
