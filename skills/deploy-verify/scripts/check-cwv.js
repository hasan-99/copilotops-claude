#!/usr/bin/env node
// check-cwv.js — Core Web Vitals via Google PageSpeed Insights API
// Usage: node check-cwv.js <URL>
// Output: JSON { "status": "PASS|WARN|FAIL|SKIP", "metrics": {...}, "detail": "..." }
//
// Thresholds (Google standards):
//   LCP: < 2.5s PASS, 2.5-4s WARN, > 4s FAIL
//   CLS: < 0.1 PASS, 0.1-0.25 WARN, > 0.25 FAIL
//   INP: < 200ms PASS, 200-500ms WARN, > 500ms FAIL

const url = process.argv[2];
if (!url) {
  console.log(JSON.stringify({ status: "FAIL", metrics: {}, detail: "No URL provided" }));
  process.exit(1);
}

const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000, unit: "ms", label: "Largest Contentful Paint" },
  CLS: { good: 0.1, poor: 0.25, unit: "", label: "Cumulative Layout Shift" },
  INP: { good: 200, poor: 500, unit: "ms", label: "Interaction to Next Paint" },
};

function classify(metric, value) {
  const t = THRESHOLDS[metric];
  if (value <= t.good) return "PASS";
  if (value <= t.poor) return "WARN";
  return "FAIL";
}

function formatValue(metric, value) {
  const t = THRESHOLDS[metric];
  if (metric === "CLS") return value.toFixed(2);
  if (metric === "LCP") return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value)}${t.unit}`;
}

async function run() {
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance`;

  try {
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(60000) });

    if (!response.ok) {
      console.log(JSON.stringify({
        status: "SKIP",
        metrics: {},
        detail: `PageSpeed API returned ${response.status} — skipping CWV check`,
      }));
      process.exit(0);
    }

    const data = await response.json();

    // Extract metrics from field data (CrUX) first, fall back to lab data
    const metrics = {};
    let worstStatus = "PASS";

    // Try CrUX (field) data first — more representative of real users
    const fieldMetrics = data.loadingExperience?.metrics || {};

    // LCP
    if (fieldMetrics.LARGEST_CONTENTFUL_PAINT_MS) {
      metrics.LCP = fieldMetrics.LARGEST_CONTENTFUL_PAINT_MS.percentile;
    } else {
      // Fall back to Lighthouse lab data
      const lcpAudit = data.lighthouseResult?.audits?.['largest-contentful-paint'];
      if (lcpAudit) metrics.LCP = lcpAudit.numericValue;
    }

    // CLS
    if (fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE) {
      metrics.CLS = fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100;
    } else {
      const clsAudit = data.lighthouseResult?.audits?.['cumulative-layout-shift'];
      if (clsAudit) metrics.CLS = clsAudit.numericValue;
    }

    // INP
    if (fieldMetrics.INTERACTION_TO_NEXT_PAINT) {
      metrics.INP = fieldMetrics.INTERACTION_TO_NEXT_PAINT.percentile;
    } else if (fieldMetrics.EXPERIMENTAL_INTERACTION_TO_NEXT_PAINT) {
      metrics.INP = fieldMetrics.EXPERIMENTAL_INTERACTION_TO_NEXT_PAINT.percentile;
    }
    // INP has no Lighthouse lab equivalent — skip if no field data

    // Build result
    const results = {};
    const parts = [];

    for (const [metric, value] of Object.entries(metrics)) {
      const status = classify(metric, value);
      const formatted = formatValue(metric, value);
      const icon = status === "PASS" ? "✓" : status === "WARN" ? "⚠" : "✗";
      results[metric] = { value, formatted, status };
      parts.push(`${metric}: ${formatted} ${icon}`);

      // Track worst status
      if (status === "FAIL") worstStatus = "FAIL";
      else if (status === "WARN" && worstStatus !== "FAIL") worstStatus = "WARN";
    }

    if (Object.keys(metrics).length === 0) {
      console.log(JSON.stringify({
        status: "SKIP",
        metrics: {},
        detail: "No CWV data available (site may lack sufficient traffic for CrUX data)",
      }));
    } else {
      // Also include overall performance score
      const perfScore = data.lighthouseResult?.categories?.performance?.score;
      if (perfScore !== undefined) {
        results.performanceScore = Math.round(perfScore * 100);
        parts.push(`Score: ${results.performanceScore}`);
      }

      console.log(JSON.stringify({
        status: worstStatus,
        metrics: results,
        detail: parts.join("  "),
      }));
    }
  } catch (err) {
    if (err.name === 'TimeoutError' || err.code === 'ABORT_ERR') {
      console.log(JSON.stringify({
        status: "SKIP",
        metrics: {},
        detail: "PageSpeed API timed out (60s) — skipping CWV check",
      }));
    } else {
      console.log(JSON.stringify({
        status: "SKIP",
        metrics: {},
        detail: `PageSpeed API error: ${err.message?.substring(0, 100)}`,
      }));
    }
  }
}

run();
