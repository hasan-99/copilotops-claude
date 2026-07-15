#!/usr/bin/env node
// last-report.js — surface "where work was left off last time" at session start.
//
// WHY: the /qualia router classifies state from state.js, .continue-here.md, and
// git log — but it ignores .planning/reports/, which is the richest "where we
// left off" signal a team has. A teammate (or future-you) picking the project
// back up should instantly see the last session's outcome and next step without
// opening a file. This extracts a compact digest from the newest report so the
// router can print it at the TOP of its output when a project is loaded.
//
// Reports are written by /qualia-report at .planning/reports/report-{YYYY-MM-DD}.md
// (the date filename may carry a suffix, e.g. report-2026-05-31-session3.md). The
// markdown has a "# Session Report — {date}" title, a "**Date:**" line, a
// "## What Was Done" section (the summary), and a "## Next Steps" section.
//
// Read-only. Zero npm dependencies.
// Exit 0 = a report was found, 1 = none found, 2 = bad input.

const fs = require("fs");
const path = require("path");

// Pull a YYYY-MM-DD from a report filename. Returns null when absent so a
// misnamed file falls back to mtime ordering rather than poisoning the sort.
function dateFromName(name) {
  const m = name.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

// Whole-day difference between two ISO-ish dates (report date vs --now). Floors
// to a non-negative integer; a future report date (clock skew) reads as 0.
function ageDays(dateStr, nowIso) {
  if (!dateStr) return null;
  const then = Date.parse(dateStr + "T00:00:00Z");
  const now = nowIso ? Date.parse(nowIso) : Date.now();
  if (Number.isNaN(then) || Number.isNaN(now)) return null;
  return Math.max(0, Math.floor((now - then) / 86400000));
}

// Collapse markdown bullets/bold/whitespace into one tight prose line.
function flatten(s) {
  return s
    .replace(/^\s+/, "")         // leading indentation, so list-marker anchors match
    .replace(/\*\*/g, "")
    .replace(/^[-*]\s+/, "")     // unordered bullet
    .replace(/^\d+[.)]\s+/, "")  // ordered list marker (1. / 1))
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Lines that carry no signal for a digest (metadata, blank, headings).
function isNoise(line) {
  const t = line.trim();
  if (!t) return true;
  if (t.startsWith("#")) return true;
  if (/^\*\*[A-Za-z ]+:\*\*/.test(t)) return true; // **Project:** / **Date:** etc.
  return false;
}

// Find the body under a "## {heading}" until the next "## " heading or EOF.
function sectionBody(lines, headingRe) {
  let i = lines.findIndex((l) => headingRe.test(l.trim()));
  if (i === -1) return [];
  const out = [];
  for (let j = i + 1; j < lines.length; j++) {
    if (/^##\s/.test(lines[j].trim())) break;
    out.push(lines[j]);
  }
  return out;
}

// First meaningful sentence/clause of a section, capped to keep the digest tight.
function firstMeaningful(bodyLines, cap = 160) {
  for (const raw of bodyLines) {
    if (isNoise(raw)) continue;
    const flat = flatten(raw);
    if (!flat) continue;
    return flat.length > cap ? flat.slice(0, cap - 1).trimEnd() + "…" : flat;
  }
  return "";
}

// Extract the digest from a single report's markdown text.
function digest(text) {
  const lines = text.split(/\r?\n/);

  // Date: prefer the explicit **Date:** line, else the title's trailing date.
  let date = null;
  const dateLine = lines.find((l) => /^\*\*Date:\*\*/.test(l.trim()));
  if (dateLine) date = (dateFromName(dateLine) || null);
  if (!date) {
    const title = lines.find((l) => /^#\s+Session Report/.test(l.trim()));
    if (title) date = dateFromName(title);
  }

  // Summary: first meaningful line of "## What Was Done", else first meaningful
  // line of the whole body (so malformed reports still yield something).
  let summary = firstMeaningful(sectionBody(lines, /^##\s+What Was Done/i));
  if (!summary) summary = firstMeaningful(lines);

  // Next: first meaningful line of "## Next Steps" / "## Next Step".
  let next = firstMeaningful(sectionBody(lines, /^##\s+Next Steps?/i));

  return { date, summary, next };
}

// Library: find the newest report under root and return its digest object.
//   { found, file, date, summary, next, age_days }
function latestReport(root, opts = {}) {
  const dir = path.join(path.resolve(root || process.cwd()), ".planning", "reports");
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return { found: false, file: null, date: null, summary: "", next: "", age_days: null };
  }

  const reports = entries
    .filter((f) => /^report-.*\.md$/.test(f))
    .map((f) => {
      const full = path.join(dir, f);
      let mtime = 0;
      try { mtime = fs.statSync(full).mtimeMs; } catch {}
      return { file: f, full, date: dateFromName(f), mtime };
    });

  if (reports.length === 0) {
    return { found: false, file: null, date: null, summary: "", next: "", age_days: null };
  }

  // Newest by filename date desc; tiebreak (same/absent date) by mtime desc.
  reports.sort((a, b) => {
    const ad = a.date || "";
    const bd = b.date || "";
    if (ad !== bd) return bd.localeCompare(ad);
    return b.mtime - a.mtime;
  });

  const top = reports[0];
  let text = "";
  try { text = fs.readFileSync(top.full, "utf8"); } catch {}
  const d = digest(text);
  const date = d.date || top.date || null;

  return {
    found: true,
    file: top.file,
    date,
    summary: d.summary,
    next: d.next,
    age_days: ageDays(date, opts.now),
  };
}

// ── CLI ───────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--cwd") args.cwd = argv[++i];
    else if (a.startsWith("--cwd=")) args.cwd = a.slice(6);
    else if (a === "--now") args.now = argv[++i]; // ISO; tests inject determinism
    else if (a.startsWith("--now=")) args.now = a.slice(6);
    else { args._bad = a; }
  }
  return args;
}

function main(argv) {
  const args = parseArgs(argv);
  if (args._bad) {
    console.error(`last-report: unknown argument '${args._bad}'`);
    return 2;
  }

  let result;
  try {
    result = latestReport(args.cwd, { now: args.now });
  } catch (e) {
    console.error(`last-report: ${e.message || e}`);
    return 2;
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return result.found ? 0 : 1;
  }

  if (!result.found) {
    console.log("No session reports yet — nothing to surface.");
    return 1;
  }

  const age = result.age_days == null ? "?" : result.age_days;
  const summary = result.summary || "(no summary in report)";
  let line = `Last session (${result.date || "undated"}, ${age}d ago): ${summary}`;
  if (result.next) line += ` → next: ${result.next}`;
  console.log(line);
  return 0;
}

module.exports = { latestReport };

if (require.main === module) {
  process.exit(main(process.argv));
}
