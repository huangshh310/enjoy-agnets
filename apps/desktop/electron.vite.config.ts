import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, externalizeDepsPlugin } from "electron-vite"

const desktopRoot = import.meta.dirname
const repoRoot = resolve(desktopRoot, "../..")
const uiRoot = resolve(repoRoot, "packages/ui")

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          "@enjoy-agents/ipc-contract",
          "@enjoy-agents/db",
          "@enjoy-agents/providers",
          "@enjoy-agents/agent-core"
        ]
      })
    ],
    resolve: {
      alias: {
        "@enjoy-agents/ipc-contract": resolve(repoRoot, "packages/ipc-contract/src/index.ts"),
        "@enjoy-agents/db": resolve(repoRoot, "packages/db/src/index.ts"),
        "@enjoy-agents/providers": resolve(repoRoot, "packages/providers/src/index.ts"),
        "@enjoy-agents/agent-core": resolve(repoRoot, "packages/agent-core/src/index.ts")
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: [
        {
          find: "@renderer",
          replacement: resolve(desktopRoot, "src/renderer/src")
        },
        {
          find: /^@enjoy-agents\/ui$/,
          replacement: resolve(uiRoot, "src/index.ts")
        },
        {
          find: "@enjoy-agents/ipc-contract",
          replacement: resolve(repoRoot, "packages/ipc-contract/src/index.ts")
        },
        {
          find: "@enjoy-agents/agent-core/diff",
          replacement: resolve(repoRoot, "packages/agent-core/src/diff.ts")
        },
        {
          find: "@enjoy-agents/providers/presets",
          replacement: resolve(repoRoot, "packages/providers/src/presets.ts")
        },
        {
          find: "next/link",
          replacement: resolve(uiRoot, "shims/next-link.tsx")
        },
        {
          find: /^@\//,
          replacement: `${uiRoot.replace(/\\/g, "/")}/`
        }
      ]
    },
    plugins: [react(), tailwindcss()],
    server: {
      fs: {
        allow: [repoRoot]
      }
    }
  }
})
