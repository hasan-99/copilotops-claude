#!/usr/bin/env node
// host-adapters.js — the single internal contract for everything that differs
// between the runtimes Qualia targets (Claude Code, OpenAI Codex).
//
// The rule (ACP shape): NOTHING else branches on runtime. Skills, install, and
// hooks ask the adapter for a fact ("what's the instruction filename?", "how do
// I render this text for this host?") instead of hardcoding an `if (codex)`.
// When a third runtime arrives, it's one entry in HOSTS — not a grep-and-patch
// across the tree.

const path = require("path");
const os = require("os");

// Per-host facts. Each host declares — declaratively, in ONE place:
//   home            install root
//   name            display name (used in the naming map + UX copy)
//   instructionFile the top-level agent-instructions file this runtime reads
//   configFile      the runtime's settings file
//   agentDir        where subagent definitions live (relative to home)
//   agentExt        the subagent file extension the runtime consumes
//   naming          source→host display-string swaps applied to rendered text
const HOSTS = {
  claude: {
    name: "Claude Code",
    home: path.join(os.homedir(), ".claude"),
    instructionFile: "CLAUDE.md",
    configFile: "settings.json",
    agentDir: "agents",
    agentExt: ".md",
    agentCli: "claude", // the CLI that runs a non-interactive turn for this host
    agentExecPrefix: ["-p"], // `claude -p "<prompt>"`
    naming: {}, // Claude is the canonical voice — no swaps.
  },
  codex: {
    name: "OpenAI Codex",
    home: path.join(os.homedir(), ".codex"),
    instructionFile: "AGENTS.md",
    configFile: "config.toml",
    agentDir: "agents",
    agentExt: ".toml",
    agentCli: "codex",
    agentExecPrefix: ["exec"], // `codex exec "<prompt>"`
    naming: { "Claude Code": "Codex", "Claude's": "Codex's" },
  },
};

// Which host owns this install home? (".codex" → codex, else claude.) The one
// place that maps a home dir back to a host name — callers ask, never re-derive.
function hostForHome(home) {
  return path.basename(home) === ".codex" ? "codex" : "claude";
}

function adapter(name) {
  const host = HOSTS[name];
  if (!host) throw new Error(`Unknown Qualia host adapter: ${name}`);
  const home = host.home;
  return {
    ...host,
    instructionPath: path.join(home, host.instructionFile),
    configPath: path.join(home, host.configFile),
    agentPath: path.join(home, host.agentDir),
    // Full argv (minus the binary) to run one non-interactive turn on this host.
    agentExec: (prompt) => [...host.agentExecPrefix, prompt],
    tokens: {
      QUALIA_HOME: home,
      QUALIA_BIN: `${home}/bin`,
      QUALIA_AGENTS: `${home}/agents`,
      QUALIA_SKILLS: `${home}/skills`,
      QUALIA_RULES: `${home}/rules`,
      QUALIA_TEMPLATES: `${home}/qualia-templates`,
      QUALIA_KNOWLEDGE: `${home}/knowledge`,
      QUALIA_REFERENCES: `${home}/qualia-references`,
      QUALIA_DESIGN: `${home}/qualia-design`,
    },
  };
}

// Host-display naming swaps only (e.g. "Claude Code" → "Codex"). Split out from
// path rendering so the canonical→artifact compile can swap names WITHOUT baking
// in install-time paths (install resolves those per host afterwards).
function applyNaming(content, hostName) {
  const host = adapter(hostName);
  let out = String(content);
  for (const [from, to] of Object.entries(host.naming)) {
    out = out.replaceAll(from, to);
  }
  return out;
}

// Path/token rendering: ${QUALIA_*} tokens + legacy `.claude/` literals → this
// host's install paths. Idempotent (running twice is a no-op), so install can
// safely re-render an already-compiled artifact.
function applyPaths(content, hostName) {
  const host = adapter(hostName);
  let out = String(content);
  for (const [token, value] of Object.entries(host.tokens)) {
    out = out.replaceAll(`\${${token}}`, value);
  }
  return out
    .replaceAll("~/.claude/", `${host.home}/`)
    .replaceAll("$HOME/.claude/", `${host.home}/`)
    .replaceAll("${HOME}/.claude/", `${host.home}/`)
    .replaceAll("@~/.claude/", `@${host.home}/`)
    .replaceAll(".claude/", `${path.basename(host.home)}/`);
}

// Full install-time render: paths + naming. Unchanged public behavior.
function renderText(content, hostName) {
  return applyNaming(applyPaths(content, hostName), hostName);
}

// Host-conditional blocks in a canonical source:
//   <!--QUALIA-HOST claude-->  …kept only for claude…  <!--/QUALIA-HOST-->
// Keep the matching host's block (unwrapped), drop every other host's block.
function stripHostBlocks(content, hostName) {
  const re = /[ \t]*<!--QUALIA-HOST\s+(\w+)-->\n?([\s\S]*?)\n?[ \t]*<!--\/QUALIA-HOST-->\n?/g;
  return String(content).replace(re, (_m, host, body) =>
    host === hostName ? `${body}\n` : ""
  );
}

// Compile a canonical instruction source into one host's artifact: resolve
// conditional blocks + apply naming, but DO NOT resolve paths or {{ROLE}} —
// those stay as tokens for install.js to render per concrete install.
function compileInstructions(canonical, hostName) {
  return applyNaming(stripHostBlocks(canonical, hostName), hostName);
}

module.exports = {
  HOSTS,
  adapter,
  hostForHome,
  applyNaming,
  applyPaths,
  renderText,
  stripHostBlocks,
  compileInstructions,
};
