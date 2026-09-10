import assert from "node:assert/strict"
import { test } from "node:test"
import { collectMentionFiles, type MentionDirEntry } from "./collect-mention-files.ts"

test("BFS 收集文件并尊重上限", async () => {
  const tree: Record<string, MentionDirEntry[]> = {
    ".": [
      { name: "apps", path: "apps", kind: "directory" },
      { name: "README.md", path: "README.md", kind: "file" }
    ],
    apps: [{ name: "desktop", path: "apps/desktop", kind: "directory" }],
    "apps/desktop": [{ name: "package.json", path: "apps/desktop/package.json", kind: "file" }]
  }
  const rows = await collectMentionFiles(async (path) => tree[path] ?? [], 10)
  assert.equal(rows.some((row) => row.path === "apps/desktop/package.json"), true)
  const capped = await collectMentionFiles(async (path) => tree[path] ?? [], 2)
  assert.equal(capped.length, 2)
})
