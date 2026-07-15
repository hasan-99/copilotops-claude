// vault-access.js — the SINGLE source for qualia-memory vault access control.
//
// The vault carries an access manifest at wiki/_meta/access.md naming OWNER_ONLY
// and CONDITIONAL paths. Every deterministic reader of the vault (recall.js, the
// memory MCP server) enforces it THROUGH THIS MODULE so the security rule has one
// implementation that can't drift between callers. Fail-closed: an unknown role
// is treated as non-OWNER (restricted). See rules/access.md.

const fs = require("fs");
const os = require("os");
const path = require("path");

// Resolve the caller's role. QUALIA_ROLE env wins (tests / overrides); else read
// `role` from <home>/.qualia-config.json; else RESTRICTED (fail-closed).
function resolveRole(home) {
  if (process.env.QUALIA_ROLE) return process.env.QUALIA_ROLE.toUpperCase();
  const h = home || process.env.QUALIA_HOME || path.join(os.homedir(), ".claude");
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(h, ".qualia-config.json"), "utf8"));
    if (cfg && typeof cfg.role === "string") return cfg.role.toUpperCase();
  } catch {}
  return "RESTRICTED";
}

// Parse the OWNER_ONLY + CONDITIONAL path tokens from wiki/_meta/access.md into
// matchers over VAULT-ROOT-relative paths (e.g. "wiki/_meta/access.md").
// Returns null when no manifest exists (caller decides; wiki is curated-by-design).
function loadDenyMatchers(wikiDir) {
  let text;
  try {
    text = fs.readFileSync(path.join(wikiDir, "_meta", "access.md"), "utf8");
  } catch {
    return null;
  }
  const matchers = [];
  for (const section of ["## OWNER_ONLY", "## CONDITIONAL"]) {
    const start = text.indexOf(section);
    if (start === -1) continue;
    const rest = text.slice(start + section.length);
    const end = rest.indexOf("\n## ");
    const body = end === -1 ? rest : rest.slice(0, end);
    for (const m of body.matchAll(/`([^`]+)`/g)) {
      const tok = m[1].trim();
      if (!tok.includes("/") && !tok.includes("*")) continue; // skip non-path backticks
      matchers.push(tok);
    }
  }
  return matchers;
}

// Does a VAULT-ROOT-relative path match any deny pattern?
//   "dir/"     → prefix match    "dir/*.md" → prefix + extension
//   "a/*/b"    → glob → regex    bare       → exact or prefix
function isDenied(vaultRelPath, matchers) {
  for (const tok of matchers) {
    if (tok.endsWith("/*.md")) {
      const dir = tok.slice(0, -5);
      if (vaultRelPath.startsWith(dir + "/") && vaultRelPath.endsWith(".md")) return true;
    } else if (tok.endsWith("/")) {
      if (vaultRelPath.startsWith(tok)) return true;
    } else if (tok.includes("*")) {
      const re = new RegExp("^" + tok.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*") + "$");
      if (re.test(vaultRelPath)) return true;
    } else if (vaultRelPath === tok || vaultRelPath.startsWith(tok + "/")) {
      return true;
    }
  }
  return false;
}

// Convenience for callers that work in WIKI-relative paths (recall, memory-mcp).
// OWNER sees everything; non-OWNER is denied OWNER_ONLY/CONDITIONAL wiki paths.
// Unknown manifest → allow (wiki is curated; sensitive stores live outside wiki/).
function isWikiPathAllowed(wikiRelPath, role, wikiDir) {
  if (role === "OWNER") return true;
  const matchers = loadDenyMatchers(wikiDir);
  if (!matchers) return true;
  const vaultRel = path.join("wiki", wikiRelPath).split(path.sep).join("/");
  return !isDenied(vaultRel, matchers);
}

module.exports = { resolveRole, loadDenyMatchers, isDenied, isWikiPathAllowed };
