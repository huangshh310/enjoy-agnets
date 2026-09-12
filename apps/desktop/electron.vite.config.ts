import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, externalizeDepsPlugin } from "electron-vite"

const desktopRoot = import.meta.dirname
const repoRoot = resolve(desktopRoot, "../..")
const uiRoot = resolve(repoRoot, "packages/ui")

const WS_OPTIONAL_NATIVE = ["bufferutil", "utf-8-validate"] as const

/** 主进程必须打包的 workspace 包。漏掉会被 externalize，Node 无法加载无后缀 .ts。 */
const MAIN_WORKSPACE_PACKAGES = [
  "ipc-contract",
  "db",
  "providers",
  "agent-core",
  "agent-harness",
  "assets",
  "knowledge",
  "mcp"
] as const

function workspacePackageId(name: (typeof MAIN_WORKSPACE_PACKAGES)[number]) {
  return `@enjoy-agents/${name}`
}

function workspacePackageAlias(name: (typeof MAIN_WORKSPACE_PACKAGES)[number]) {
  return {
    find: new RegExp(`^${workspacePackageId(name).replace("/", "\\/")}$`),
    replacement: resolve(repoRoot, `packages/${name}/src/index.ts`)
  }
}

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: MAIN_WORKSPACE_PACKAGES.map(workspacePackageId)
      })
    ],
    // ws 的可选原生加速包未安装；打进 bundle 会被 Vite 写成顶层 throw，主进程直接崩。
    define: {
      "process.env.WS_NO_BUFFER_UTIL": JSON.stringify("1"),
      "process.env.WS_NO_UTF_8_VALIDATE": JSON.stringify("1")
    },
    build: {
      rollupOptions: {
        external: [...WS_OPTIONAL_NATIVE]
      }
    },
    resolve: {
      // 必须精确匹配包名。别名到 index.ts 文件时，`@pkg/sub` 会被拼成 `index.ts/sub`。
      alias: [
        {
          find: "@enjoy-agents/ipc-contract/runtime-capabilities",
          replacement: resolve(repoRoot, "packages/ipc-contract/src/runtime-capabilities.ts")
        },
        {
          find: "@enjoy-agents/ipc-contract/custom-agent",
          replacement: resolve(repoRoot, "packages/ipc-contract/src/custom-agent.ts")
        },
        {
          find: "@enjoy-agents/ipc-contract/workspace-move-plan",
          replacement: resolve(repoRoot, "packages/ipc-contract/src/workspace-move-plan.ts")
        },
        {
          find: "@enjoy-agents/ipc-contract/workspace-preview",
          replacement: resolve(repoRoot, "packages/ipc-contract/src/workspace-preview.ts")
        },
        {
          find: "@enjoy-agents/ipc-contract/agents-md-chain",
          replacement: resolve(repoRoot, "packages/ipc-contract/src/agents-md-chain.ts")
        },
        {
          find: "@enjoy-agents/ipc-contract/provider-agent-bind",
          replacement: resolve(repoRoot, "packages/ipc-contract/src/provider-agent-bind.ts")
        },
        {
          find: "@enjoy-agents/ipc-contract/cli-compat",
          replacement: resolve(repoRoot, "packages/ipc-contract/src/cli-compat.ts")
        },
        {
          find: "@enjoy-agents/db/path-safe",
          replacement: resolve(repoRoot, "packages/db/src/path-safe.ts")
        },
        {
          find: "@enjoy-agents/db/hmac",
          replacement: resolve(repoRoot, "packages/db/src/hmac.ts")
        },
        {
          find: "@enjoy-agents/assets/media-type",
          replacement: resolve(repoRoot, "packages/assets/src/media-type.ts")
        },
        {
          find: "@enjoy-agents/agent-core/compaction",
          replacement: resolve(repoRoot, "packages/agent-core/src/compaction/index.ts")
        },
        ...MAIN_WORKSPACE_PACKAGES.map(workspacePackageAlias)
      ]
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    publicDir: resolve(desktopRoot, "public"),
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
          find: /^@enjoy-agents\/editor$/,
          replacement: resolve(repoRoot, "packages/editor/src/index.ts")
        },
        {
          find: "@enjoy-agents/ipc-contract/runtime-capabilities",
          replacement: resolve(repoRoot, "packages/ipc-contract/src/runtime-capabilities.ts")
        },
        {
          find: "@enjoy-agents/ipc-contract/custom-agent",
          replacement: resolve(repoRoot, "packages/ipc-contract/src/custom-agent.ts")
        },
        {
          find: "@enjoy-agents/ipc-contract/provider-agent-bind",
          replacement: resolve(repoRoot, "packages/ipc-contract/src/provider-agent-bind.ts")
        },
        {
          find: "@enjoy-agents/ipc-contract/cli-compat",
          replacement: resolve(repoRoot, "packages/ipc-contract/src/cli-compat.ts")
        },
        {
          find: "@enjoy-agents/ipc-contract/workspace-preview",
          replacement: resolve(repoRoot, "packages/ipc-contract/src/workspace-preview.ts")
        },
        {
          find: /^@enjoy-agents\/ipc-contract$/,
          replacement: resolve(repoRoot, "packages/ipc-contract/src/index.ts")
        },
        {
          find: "@enjoy-agents/agent-core/diff",
          replacement: resolve(repoRoot, "packages/agent-core/src/diff.ts")
        },
        {
          find: "@enjoy-agents/agent-core/compaction",
          replacement: resolve(repoRoot, "packages/agent-core/src/compaction/index.ts")
        },
        {
          find: "@enjoy-agents/providers/presets",
          replacement: resolve(repoRoot, "packages/providers/src/presets.ts")
        },
        {
          find: "@enjoy-agents/providers/capabilities",
          replacement: resolve(repoRoot, "packages/providers/src/capabilities/catalog.ts")
        },
        {
          find: "@enjoy-agents/assets/playback-url",
          replacement: resolve(repoRoot, "packages/assets/src/playback-url.ts")
        },
        {
          find: "@enjoy-agents/assets/media-type",
          replacement: resolve(repoRoot, "packages/assets/src/media-type.ts")
        },
        {
          find: "@enjoy-agents/mcp/app-host",
          replacement: resolve(repoRoot, "packages/mcp/src/app-host.ts")
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
