# Enjoy Agents

Local-first Agent IDE: Electron + React 19 + BoardUI + Vercel AI SDK 7.

BoardUI lives in `packages/ui` (tokens, base components, agent primitives).
The desktop app under `apps/desktop` owns Electron, IPC, and the AI Chat shell.

## Stack

Agent 手册：`AGENTS.md`。领域契约：`design/specs/`。选型长文：`design/references/tech-stack.md`。

## Develop

```bash
pnpm install
pnpm dev
```

## Release

Tag must match `apps/desktop/package.json` `version`. The operator command is `./scripts/release-tag.sh`; pushing the tag runs `.github/workflows/release.yml`, which publishes macOS / Windows / Linux installers to GitHub Releases. Packaged apps then check that feed and offer in-app update + restart. See `design/specs/updates.md`.

```bash
./scripts/release-tag.sh          # first cut of the current desktop version
./scripts/release-tag.sh --retry  # same tag after a failed Release CI; do not bump version
```

The script force-pushes only `refs/tags/vX.Y.Z`, never `main`.

Add a provider key in Settings (stored with Electron `safeStorage`, never in the renderer).

## BoardUI AI Chat

The official `template-ai-chat` is a BoardUI Pro template. This repo ships a matching `AiChatShell` wired to the local agent loop. If you have a Pro license, activate it and install:

```bash
npx boardui@latest login YOUR_LICENSE_KEY
npx boardui@latest add template-ai-chat
```
