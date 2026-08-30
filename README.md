# Enjoy Agents

Local-first Agent IDE: Electron + React 19 + BoardUI + Vercel AI SDK 7.

## Stack

See `electron-agents-ide-tech-stack.md`.

## Develop

```bash
pnpm install
pnpm dev
```

Add a provider key in Settings (stored with Electron `safeStorage`, never in the renderer).

## BoardUI AI Chat

The official `template-ai-chat` is a BoardUI Pro template. This repo ships a matching `AiChatShell` wired to the local agent loop. If you have a Pro license, activate it and install:

```bash
npx boardui@latest login YOUR_LICENSE_KEY
npx boardui@latest add template-ai-chat
```
