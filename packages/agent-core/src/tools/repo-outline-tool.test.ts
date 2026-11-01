import assert from "node:assert/strict"
import { test } from "node:test"
import { createRepoOutlineTool } from "./repo-outline-tool.ts"
import { SYMBOL_MAP_UNAVAILABLE_NOTE } from "../context/repo-map/index.ts"
import { resetWasmHostForTests } from "../context/repo-map/wasm-host.ts"

test("repo_outline 工具在 remote host 上降级目录模式", async () => {
  resetWasmHostForTests()
  const host = {
    isRemote: true,
    listDir: async () => [
      { name: "package.json", kind: "file" as const },
      { name: "src", kind: "directory" as const }
    ],
    readFile: async () => {
      throw new Error("should not read for symbol map on remote")
    },
    writeFile: async () => {},
    editFile: async () => "",
    glob: async () => [],
    grep: async () => [],
    bash: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
    gitStatus: async () => "",
    gitDiff: async () => "",
    gitLog: async () => "",
    gitCommit: async () => "",
    gitPush: async () => ""
  }
  const tools = createRepoOutlineTool(host)
  const result = await tools.repo_outline.execute({ maxDepth: 2 }, { toolCallId: "t", messages: [] })
  assert.equal(result.mode, "directory")
  assert.match(result.outline, new RegExp(SYMBOL_MAP_UNAVAILABLE_NOTE))
})
