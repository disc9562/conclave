# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

DreamCoder is an open-source desktop GUI for Claude Code: a Tauri 2 shell wrapping a Bun-based reimplementation of the Claude Code CLI engine, with multi-provider support (Anthropic, OpenAI, DeepSeek, Bedrock, Vertex, Azure, etc.). Comments and docs are largely in Chinese; code identifiers are English.

## The three packages and how they connect

This is a Bun monorepo with three `package.json` workspaces that are NOT linked by a workspace field — each is installed independently.

- **`/` (root, `dreamcoder`)** — the CLI engine. An Ink-based TUI reimplementation of Claude Code under `src/`. Entry: `bin/dreamcoder` → `src/entrypoints/cli.tsx`. This is the "Claude Code core" the README refers to. Also hosts `src/server/` — an HTTP+WebSocket server that drives the desktop/H5 UI.
- **`/desktop` (`dreamcoder-desktop`)** — the Tauri 2 app. React 18 + Vite + Zustand + Tailwind v4 frontend in `desktop/src/`; Rust shell in `desktop/src-tauri/` (`lib.rs` is the bulk of the native code). Has its own deps (Tauri CLI lives here, NOT root).
- **`/sidecar`** — a near-duplicate of the root runtime, packaged for compilation into a standalone binary.

**Runtime topology:** the Tauri app spawns a compiled **sidecar binary** (`desktop/src-tauri/binaries/dreamcoder-sidecar`, declared as `externalBin` in `tauri.conf.json`). That binary is built from `desktop/sidecars/dreamcoder-sidecar.ts`, which is a multiplexer: its first positional arg selects a mode — `server` (start `src/server/index.ts`), `cli` (`src/entrypoints/cli.tsx`), or `adapters` (stubbed, Phase 4). It imports the root `src/` code via relative paths and `preload.ts`. The React frontend talks to the `server` mode over HTTP/WS at `http://127.0.0.1:3456` (see `desktop/src/api/client.ts`). The same server also serves the H5 remote-access UI (`src/server/staticH5.ts`), letting a phone/browser connect to a running desktop session.

**`bin/dreamcoder` env nuance:** when the CLI is spawned as a child of the server, `DREAMCODER_SKIP_DOTENV=1` suppresses `.env` loading so stale provider keys don't override the active provider config set via `dreamcoder/settings.json`.

## Commands

All commands use Bun. First-time setup is four steps that cannot be skipped (a missing sidecar binary or missing Tauri CLI causes `tauri dev` to fail):

```bash
bun install                    # 1. root deps (sidecar runtime)
cd desktop && bun install      # 2. desktop deps (Tauri CLI + React) — Tauri CLI is ONLY here
bun run build:sidecars         # 3. compile sidecar binary (run from desktop/)
bun run tauri dev              # 4. launch desktop dev mode (from desktop/)
```

Common dev commands:

```bash
# From root:
bun run dev:server             # run the server alone on port 3456 (src/server/index.ts)
bun test                       # run root CLI-engine tests
bun test path/to/file.test.ts  # run a single test file

# From desktop/:
bun run dev                    # Vite frontend only (no Tauri shell) on :1420
bun run test                   # vitest (frontend)
bun run test -- path/to.test   # single vitest file
bun run test:ui                # vitest UI
bun run lint                   # tsc --noEmit type check
bun run build:sidecars         # rebuild sidecar binary after changing src/ or sidecar/
```

`bun run tauri dev` runs `beforeDevCommand: bun run dev`; `bun run tauri build` runs `bun run build && bun run build:sidecars`.

## Quality gate

`scripts/quality-gate/` is a custom multi-lane gate (type-check, tests, coverage thresholds, provider smoke tests) invoked by the `scripts/git-hooks/pre-push` hook. The hook is opt-in via `bun run hooks:install` and is gated by `git config --local` flags: `quality.allowCliCoreChange`, `quality.allowMissingTests`, `quality.allowCoverageBaselineChange`, and live-provider smoke settings (`quality.prePushLive`, `quality.prePushProviderModels`). Live provider smoke tests are off by default. Coverage baselines live in `scripts/quality-gate/baseline/` and `coverage-baseline.json`; flaky tests are listed in `quarantine.json`. Run the gate directly with `bun run scripts/quality-gate/index.ts --mode <pr|baseline|release>`.

## Conventions

- TypeScript strict mode; avoid `any`. React function components + Hooks. **Zustand** for all frontend state (`desktop/src/stores/` — note `chatStore.ts` is the large central store). Tailwind v4 for styling.
- Branch from `dev`, PR targets `dev` (not `master`). Semantic commit prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- Frontend ↔ server contract lives in `desktop/src/api/` (one file per domain) mirroring `src/server/api/` routes; WebSocket session streaming in `src/remote/` and `desktop/src/api/websocket.ts`.

## Platform reality

Developed and verified on **Windows x64 only**. macOS/Linux have `#[cfg(target_os = ...)]` branches but are untested by the maintainer (Linux memory issue tracked in #25). Build scripts: `desktop/scripts/build-windows-x64.ps1`, `build-macos-arm64.sh`. Computer Use relies on Python helpers in `runtime/` (`win_helper.py`, `mac_helper.py`, `uia_helper.py` — the text-based UIA Tree mode).
