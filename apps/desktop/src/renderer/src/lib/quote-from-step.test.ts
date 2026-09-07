import assert from "node:assert/strict"
import { test } from "node:test"
import { quoteFromStep } from "./quote-from-step.ts"

test("思考走 task_step，命令走 terminal_output，有路径的编辑走 diff", () => {
  const thought = quoteFromStep({
    id: "n1",
    kind: "thinking",
    title: "计划",
    rawText: "先读 layout",
    status: "completed"
  })
  assert.equal(thought.type, "task_step")
  assert.equal(thought.content, "先读 layout")
  assert.equal(thought.snippet, "先读 layout")

  const command = quoteFromStep({
    id: "n2",
    kind: "command",
    title: "bash",
    command: "ls",
    status: "completed"
  })
  assert.equal(command.type, "terminal_output")

  const edit = quoteFromStep({
    id: "n3",
    kind: "editing",
    title: "改文件",
    filePath: "src/a.ts",
    fileName: "a.ts",
    detail: "export const a = 1",
    status: "completed"
  })
  assert.equal(edit.type, "diff")

  const read = quoteFromStep({
    id: "n4",
    kind: "reading",
    title: "读文件",
    filePath: "src/b.ts",
    fileName: "b.ts",
    status: "completed"
  })
  assert.equal(read.type, "file")
})
