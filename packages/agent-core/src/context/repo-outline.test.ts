import assert from "node:assert/strict"
import { test } from "node:test"
import { collectRepoOutline, formatRepoOutline } from "./repo-outline.ts"

const tree: Record<string, Array<{ name: string; kind: "file" | "directory" }>> = {
  ".": [
    { name: "node_modules", kind: "directory" },
    { name: "apps", kind: "directory" },
    { name: "package.json", kind: "file" },
    { name: "AGENTS.md", kind: "file" },
    { name: "README.md", kind: "file" }
  ],
  apps: [
    { name: "desktop", kind: "directory" },
    { name: "ignored.bin", kind: "file" }
  ],
  "apps/desktop": [{ name: "package.json", kind: "file" }]
}

test("收集大纲时跳过 node_modules，并保留入口文件", async () => {
  const nodes = await collectRepoOutline(async (path) => tree[path] ?? [])
  const paths = nodes.map((node) => node.path)
  assert.ok(paths.includes("apps"))
  assert.ok(paths.includes("package.json"))
  assert.ok(paths.includes("AGENTS.md"))
  assert.ok(!paths.some((path) => path.includes("node_modules")))
})

test("formatRepoOutline 目录带斜杠，超预算截断", () => {
  const text = formatRepoOutline([
    { path: "apps", kind: "directory" },
    { path: "package.json", kind: "file" }
  ])
  assert.ok(text.includes("- apps/"))
  assert.ok(text.includes("Workspace outline"))
  const tiny = formatRepoOutline(
    [
      { path: "apps", kind: "directory" },
      { path: "packages", kind: "directory" }
    ],
    90
  )
  assert.ok(tiny.includes("truncated"))
})
