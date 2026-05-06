# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kiku is a feature-rich Anki note type for Japanese learners. It renders interactive card templates using SolidJS, bundled via Vite, and deployed directly into Anki's collection.media folder.

## Monorepo Structure

- **packages/note** — Core note template (SolidJS + TypeScript + Tailwind/DaisyUI). This is where most development happens.
- **packages/addon** — Anki desktop add-on (Python) for managing Kiku note templates.
- **apps/docs** — VitePress documentation site.

Managed with **pnpm workspaces** and **Turborepo**.

## Common Commands

All commands run from the repo root unless noted.

```bash
pnpm dev              # Start dev servers (note preview + docs)
pnpm build            # Build all packages
pnpm test             # Run all tests (Vitest)
pnpm typecheck        # TypeScript type checking
pnpm check            # Biome lint + format check
pnpm check:write      # Biome lint + format with auto-fix

# Run a single test file
cd packages/note && pnpm vitest run src/util/parse-furigana.test.ts
```

## Deploying Changes to Anki

After making changes to the note template, deploy to your local Anki installation:

```bash
pnpm apply            # Build + generate templates + copy to Anki + update note type
```

This runs the full pipeline: `build` -> `generate-template` -> `copy-anki-build` -> `update-note-type`. Requires `ANKI_COLLECTION_MEDIA_PATH` set in `packages/note/.env`.

## Architecture

### Note Template (packages/note)

**Framework**: SolidJS (not React) — uses fine-grained reactivity, JSX with `<Show>`, `<For>`, `<Switch>`/`<Match>`, signals, and context providers.

**State management**: Context API heavily used — see `src/components/shared/` for providers (ConfigContext, CardContext, AnkiFieldsContext, FieldGroupContext, etc.).

**Build output**: Vite produces code-split bundles (`_kiku.js`, `_kiku_libs.js`, `_kiku_shared.js`, `_kiku_lazy.js`, `_kiku_worker.js`, `_kiku.css`) — no minification (for Anki compatibility).

**Template generation**: `script/generate-template.ts` produces HTML files with SSR output injected + hydration scripts. These HTML files become the Anki card templates.

**Card types**: Mining cards (Front/Back) and Cloze cards (ClozeFront/ClozeBack).

### Plugin System

Plugins live in `packages/note/plugins/`. Each plugin has a `src/index.ts` entry point and follows the interface defined in `plugins/plugin-types.ts`.

### Linting & Formatting

Uses **Biome** (not ESLint/Prettier). Double quotes, spaces for indentation. Run `pnpm check:write` to fix issues.
