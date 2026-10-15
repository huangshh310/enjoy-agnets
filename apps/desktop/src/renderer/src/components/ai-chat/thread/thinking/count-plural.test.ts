import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { enChat } from "../../../../i18n/catalogs/en/chat.ts"

test("英文单数：Ran 1 tool / Ran 1 command / Edited 1 file 等（luna P3）", () => {
  const c = enChat as Record<string, string>
  assert.equal(c.ranToolsOne, "Ran 1 tool")
  assert.equal(c.batchCommandsRun + "|" + c.batchCommandsRunOne, "Ran {count} commands|Ran 1 command")
  assert.equal(c.batchFilesModifiedOne, "Edited 1 file")
  assert.equal(c.batchFilesReadOne, "Read 1 file")
  assert.equal(c.subagentStepCountOne, "1 step")
  assert.equal(c.exploredPagesOne, "Explored 1 page")
  assert.equal(c.batchSearchesOne, "Searched once")
})
test("调用处 count === 1 走 One 键", () => {
  const dir = new URL("./", import.meta.url)
  for (const [file, key] of [
    ["thinking-rows.ts", "ranTools"],
    ["agent-step-group.ts", "batchCommandsRun"],
    ["agent-step-group.ts", "batchFilesModified"],
    ["agent-step-group.ts", "batchFilesRead"],
    ["agent-step-group.ts", "batchSearches"],
    ["step-tree/subagent-row.tsx", "subagentStepCount"],
    ["step-tree/tool-step-row.tsx", "exploredPages"]
  ] as const) {
    const src = readFileSync(new URL(file, dir), "utf8")
    assert.match(src, new RegExp(`=== 1 \\? t\\("chat\\.${key}One"\\)`), `${file} ${key}`)
  }
})
