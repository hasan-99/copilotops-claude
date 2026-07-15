# Project-Type Stack Presets

These presets turn the question *"what kind of project is this?"* into a runnable
starting point. When `qualia-new` asks the user to pick a project type, the chosen
preset supplies the env contract, the phase plan, the Definition-of-Done checklist,
and a minimal-but-real code scaffold.

This directory installs to `C:\Users\hasan\.claude/qualia-templates/stacks/` automatically — it
ships inside the `templates/` tree, which the installer copies wholesale. No
installer change is required to add or edit a preset.

## The four stacks

| `id`            | What it is                                                         | Database / auth          | AI       | Voice    |
|-----------------|-------------------------------------------------------------------|--------------------------|----------|----------|
| `landing-page`  | Static / SSG marketing site. No login, no DB.                     | none                     | none     | none     |
| `full-app`      | Authenticated product: accounts, roles, dashboard, RLS-everywhere. | Supabase (auth + RLS)    | optional | none     |
| `ai-agent`      | LLM / chat / tool-calling agent on top of the full-app base.       | Supabase (+ pgvector)    | OpenRouter | optional |
| `internal-tool` | Staff-only portal / admin tool. Same Supabase base as full-app.    | Supabase (auth + RLS)    | optional | none     |

All stacks default to the Qualia standard: **Next.js 16 (App Router) + React 19 +
TypeScript + Tailwind + Vercel**, AI via **OpenRouter**, data via **Supabase**.

## Preset contract (every `<id>/` directory has exactly this shape)

```
templates/stacks/<id>/
  stack.json            metadata: id, title, description, archetype, defaultStack,
                        scaffoldEntry, whenToUse
  env.required.json     array of { name, purpose, howToObtain, ownerIssued }
  phases.md             the increment / phase plan tuned for this stack
  verify-checklist.md   the per-stack Definition-of-Done checklist
  scaffold/             a minimal but REAL runnable starter (MVP, not a full app)
```

### `stack.json` fields

| Field           | Meaning                                                                             |
|-----------------|-------------------------------------------------------------------------------------|
| `id`            | Stack id; must equal the directory name.                                            |
| `title`         | Human label shown in the `qualia-new` project-type picker.                          |
| `description`   | One line describing what this stack builds.                                         |
| `archetype`     | The `references/archetypes/*.md` file whose DoD + Road this stack borrows.           |
| `defaultStack`  | The default tech string (Next.js / Supabase / OpenRouter / …).                      |
| `scaffoldEntry` | The file a developer opens first after the scaffold is laid down.                   |
| `whenToUse`     | A short "pick this when…" sentence to disambiguate from neighbouring stacks.        |

### Stack → archetype mapping (DoD source of truth)

The stack ids are a delivery-facing rename of the archetype ids. The mapping keeps
`qualia-scope`'s archetype DoD grill and `qualia-doctor`'s env check consistent:

| Stack `id`      | `archetype` (DoD source)        |
|-----------------|---------------------------------|
| `landing-page`  | `website`                       |
| `full-app`      | `web-app`                       |
| `ai-agent`      | `ai-agent`                      |
| `internal-tool` | `web-app`                       |

`internal-tool` and `landing-page` reuse `web-app` / `website` DoD respectively;
their `phases.md` and `verify-checklist.md` narrow that DoD to the stack's shape
(no public SEO for an internal tool, no auth for a landing page).

### `env.required.json` fields

Each entry is an environment variable the stack needs to run:

| Field         | Meaning                                                                              |
|---------------|--------------------------------------------------------------------------------------|
| `name`        | The env var name (e.g. `NEXT_PUBLIC_SUPABASE_URL`).                                  |
| `purpose`     | Why the stack needs it.                                                              |
| `howToObtain` | The exact step (or CLI command) to get the value.                                    |
| `ownerIssued` | `true` if only the OWNER (Fawzi) can issue the key; `false` if self-serve.           |

`ownerIssued: true` vars are ones a developer cannot mint themselves (paid third-party
API keys: OpenRouter, Retell, ElevenLabs, Telnyx). When such a var is missing,
`qualia-doctor` prints **"ask the OWNER (Fawzi) for this key"** instead of a self-serve
fix command.

## How `qualia-new` consumes a preset

After the user picks a project type, `qualia-new`:

1. Resolves the chosen `id` to `templates/stacks/<id>/`.
2. Copies `env.required.json` → the new project's `.planning/env.required.json`
   (creating `.planning/` if absent).
3. Folds `phases.md` into the generated plan as the milestone-arc starting point.
4. Lays down `scaffold/` into the project root (a runnable skeleton, then the
   roadmapped phases build on it).

## How `qualia-doctor` consumes a preset

`qualia-doctor` reads `.planning/env.required.json` (falling back to `./env.required.json`)
and, for each entry:

1. Checks the var is present (in the shell env or in `.env.local`).
2. Checks the relevant CLI logins: `vercel whoami`, `supabase projects list`
   (or `supabase --version` for auth), `gh auth status`.
3. Prints **PASS / FAIL** per item with the EXACT fix command.
4. For `ownerIssued: true` vars whose value is missing, prints
   **"ask the OWNER (Fawzi) for this key"** rather than a self-serve command.

## Editing a preset

- Keep the scaffold MVP. A runnable skeleton, not a finished app — the roadmapped
  phases earn the rest.
- Keep `env.required.json` accurate. A var that the scaffold does not actually read
  should not be listed; a var the scaffold needs to boot must be.
- After editing any JSON, validate it parses:
  `node -e "require('./templates/stacks/<id>/stack.json')"`.
