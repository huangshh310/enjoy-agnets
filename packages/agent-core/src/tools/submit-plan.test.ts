import assert from "node:assert/strict"
import { test } from "node:test"
import type { AgentWorkspaceHost } from "../runtime-context.ts"
import { IMPLEMENTATION_PLAN_PATH } from "./implementation-plan.ts"
import { createSubmitPlanTool, SUBMIT_PLAN_TOOL } from "./submit-plan.ts"

function host(writeFile: AgentWorkspaceHost["writeFile"]): AgentWorkspaceHost {
  return {
    readFile: async () => "",
    writeFile,
    editFile: async () => "",
    listDir: async () => [],
    glob: async () => [],
    grep: async () => [],
    bash: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
    gitStatus: async () => "",
    gitDiff: async () => "",
    gitLog: async () => "",
    gitCommit: async () => "",
    gitPush: async () => ""
  }
}

test("submit_plan 写入固定路径并回传 plan", async () => {
  const written: Array<{ path: string; content: string }> = []
  const tools = createSubmitPlanTool(
    host(async (path, content) => {
      written.push({ path, content })
    })
  )
  const result = await tools[SUBMIT_PLAN_TOOL].execute(
    { plan: "改 host", files: ["src/main.ts"] },
    { toolCallId: "t1", messages: [] }
  )
  assert.equal(result.submitted, true)
  assert.equal(result.path, IMPLEMENTATION_PLAN_PATH)
  assert.equal(result.writeError, undefined)
  assert.equal(written[0]?.path, "implementation_plan.md")
  assert.match(written[0]?.content ?? "", /改 host/)
  assert.match(written[0]?.content ?? "", /src\/main\.ts/)
})
