import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

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
        "@enjoy-agents/ipc-contract": resolve("../../packages/ipc-contract/src/index.ts"),
        "@enjoy-agents/db": resolve("../../packages/db/src/index.ts"),
        "@enjoy-agents/providers": resolve("../../packages/providers/src/index.ts"),
        "@enjoy-agents/agent-core": resolve("../../packages/agent-core/src/index.ts")
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        "@": resolve("."),
        "@renderer": resolve("src/renderer/src"),
        "@enjoy-agents/ipc-contract": resolve("../../packages/ipc-contract/src/index.ts"),
        "@enjoy-agents/editor": resolve("../../packages/editor/src/index.ts"),
        "next/link": resolve("src/renderer/src/shims/next-link.tsx")
      }
    },
    plugins: [react(), tailwindcss()],
    server: {
      fs: {
        allow: [resolve("../..")]
      }
    }
  }
});
