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

Tag must match `apps/desktop/package.json` `version`. Pushing the tag runs `.github/workflows/release.yml`, which publishes macOS / Windows / Linux installers to GitHub Releases. Packaged apps then check that feed and offer in-app update + restart. See `design/specs/updates.md`.

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

If that run fails, do **not** bump the version. Fix, move the same tag, and let the workflow upload onto the existing Release:

```bash
git tag -f vX.Y.Z
git push -f origin vX.Y.Z
```

Force only that version tag, never `main`.

Add a provider key in Settings (stored with Electron `safeStorage`, never in the renderer).

## BoardUI AI Chat

The official `template-ai-chat` is a BoardUI Pro template. This repo ships a matching `AiChatShell` wired to the local agent loop. If you have a Pro license, activate it and install:

```bash
npx boardui@latest login YOUR_LICENSE_KEY
npx boardui@latest add template-ai-chat
```
