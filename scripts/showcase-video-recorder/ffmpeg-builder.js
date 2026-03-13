#!/usr/bin/env node
/**
 * FFmpeg Command Builder for Showcase Videos
 * Bundled with showcase-video-recorder skill
 *
 * Usage:
 *   node ffmpeg-builder.js <input.webm> <output.mp4> [scenes.json]
 *
 * If scenes.json not provided, reads from stdin.
 * scenes.json format: [{ "name": "landing", "time": 0, "speed": 1.0 }, ...]
 */

const fs = require('fs');
const path = require('path');

const TARGET_DURATION = 60; // seconds

function buildFfmpegCommand(inputFile, outputFile, scenes) {
  // Validate scenes
  if (!scenes || scenes.length < 2) {
    throw new Error('Need at least 2 scene markers (start + end)');
  }

  // Ensure scenes are sorted by time
  scenes.sort((a, b) => a.time - b.time);

  // Build segments (each scene runs until the next scene starts)
  const segments = [];
  for (let i = 0; i < scenes.length - 1; i++) {
    const raw = scenes[i + 1].time - scenes[i].time;
    const speed = scenes[i].speed || 1.3; // default speed if not specified
    const final = raw / speed;
    segments.push({
      name: scenes[i].name,
      start: scenes[i].time,
      end: scenes[i + 1].time,
      raw,
      speed,
      final,
    });
  }

  // Calculate total
  const totalFinal = segments.reduce((sum, s) => sum + s.final, 0);

  // Print segment breakdown
  console.log('=== SEGMENT BREAKDOWN ===');
  for (const s of segments) {
    console.log(`  ${s.name}: ${s.raw.toFixed(1)}s raw -> ${s.final.toFixed(1)}s @ ${s.speed}x`);
  }
  console.log(`  TOTAL: ${totalFinal.toFixed(1)}s (target: ${TARGET_DURATION}s)`);

  if (totalFinal < 45 || totalFinal > 75) {
    console.warn(`\n  WARNING: Total duration ${totalFinal.toFixed(1)}s is outside 45-75s range.`);
    console.warn('   Adjust speeds and re-run.\n');
  }

  // Build ffmpeg filter_complex
  const N = segments.length;
  const splitOutputs = segments.map((_, i) => `[s${i + 1}]`).join('');
  const trimFilters = segments.map((s, i) =>
    `[s${i + 1}]trim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},setpts=(PTS-STARTPTS)/${s.speed}[v${i + 1}]`
  ).join(';\n    ');
  const concatInputs = segments.map((_, i) => `[v${i + 1}]`).join('');

  const cmd = `ffmpeg -i "${inputFile}" \\
  -filter_complex "
    [0:v]split=${N}${splitOutputs};
    ${trimFilters};
    ${concatInputs}concat=n=${N}:v=1:a=0[out]
  " \\
  -map "[out]" \\
  -c:v libx264 -preset medium -crf 20 \\
  -pix_fmt yuv420p -r 30 -s 1920x1080 \\
  -movflags +faststart \\
  "${outputFile}"`;

  return { cmd, segments, totalFinal };
}

function autoTuneSpeeds(scenes, targetDuration = TARGET_DURATION) {
  const scenesCopy = scenes.map(s => ({ ...s }));

  // Default all to 1.3x if no speed set
  for (const s of scenesCopy) {
    if (!s.speed) s.speed = 1.3;
  }

  // Calculate initial total
  let total = 0;
  for (let i = 0; i < scenesCopy.length - 1; i++) {
    const raw = scenesCopy[i + 1].time - scenesCopy[i].time;
    total += raw / scenesCopy[i].speed;
  }

  // Iteratively adjust
  const maxIterations = 20;
  for (let iter = 0; iter < maxIterations; iter++) {
    const ratio = total / targetDuration;
    if (Math.abs(ratio - 1.0) < 0.05) break; // Within 5% of target

    // Scale all speeds proportionally
    for (const s of scenesCopy) {
      s.speed = Math.min(4.0, Math.max(0.8, s.speed * ratio));
    }

    // Recalculate
    total = 0;
    for (let i = 0; i < scenesCopy.length - 1; i++) {
      const raw = scenesCopy[i + 1].time - scenesCopy[i].time;
      total += raw / scenesCopy[i].speed;
    }
  }

  // Round speeds to 1 decimal
  for (const s of scenesCopy) {
    s.speed = Math.round(s.speed * 10) / 10;
  }

  return scenesCopy;
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node ffmpeg-builder.js <input.webm> <output.mp4> [scenes.json]');
    console.log('\nscenes.json example:');
    console.log(JSON.stringify([
      { name: 'landing', time: 0, speed: 1.0 },
      { name: 'dashboard', time: 8, speed: 1.5 },
      { name: 'feature-a', time: 20, speed: 1.2 },
      { name: 'end', time: 80 },
    ], null, 2));
    process.exit(1);
  }

  const [inputFile, outputFile, scenesFile] = args;

  let scenes;
  if (scenesFile) {
    scenes = JSON.parse(fs.readFileSync(scenesFile, 'utf-8'));
  } else {
    // Read from stdin
    console.log('Paste scene timestamps JSON (Ctrl+D when done):');
    const input = fs.readFileSync('/dev/stdin', 'utf-8');
    scenes = JSON.parse(input);
  }

  // Auto-tune if speeds not all defined
  const hasAllSpeeds = scenes.every(s => s.speed !== undefined);
  if (!hasAllSpeeds) {
    console.log('Auto-tuning speeds to hit ~60s...');
    scenes = autoTuneSpeeds(scenes);
  }

  const { cmd, totalFinal } = buildFfmpegCommand(inputFile, outputFile, scenes);

  console.log('\n=== FFMPEG COMMAND ===');
  console.log(cmd);

  console.log(`\nEstimated output: ${totalFinal.toFixed(1)}s`);
  console.log('Run the command above to process the video.');
}

module.exports = { buildFfmpegCommand, autoTuneSpeeds };
