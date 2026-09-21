import assert from "node:assert/strict"
import { test } from "node:test"
import {
  composeQuotedPrompt,
  deriveTaskStatus,
  formatQuotedContext,
  replaceQuotedDraft,
  splitQuotedDisplay,
  SteerAgentInput
} from "./quoted-context.ts"

test("划词引用走对话头", () => {
  const block = formatQuotedContext({
    id: "q-sel",
    type: "text_selection",
    title: "hello",
    content: "hello world"
  })
  assert.match(block, /> \[引用自对话: hello\]/)
  const view = splitQuotedDisplay(`${block}\n\n请继续`)
  assert.equal(view.chips[0]?.title, "hello")
  assert.equal(view.text, "请继续")
})

test("引用转成步骤 Markdown 块，拼在正文前", () => {
  const block = formatQuotedContext({
    id: "q1",
    type: "tool_call",
    title: "AccessForm.tsx",
    snippet: "export function AccessForm() {}"
  })
  assert.match(block, /> \[引用自步骤: AccessForm\.tsx\]/)
  assert.match(block, /> export function AccessForm/)
  assert.equal(
    composeQuotedPrompt(
      [{ id: "q1", type: "tool_call", title: "A", snippet: "x" }],
      "改成暗色"
    ),
    "> [引用自步骤: A]\n> x\n\n改成暗色"
  )
})

test("状态机：审批优先，否则 running / idle", () => {
  assert.equal(deriveTaskStatus({ running: true, pendingApproval: true }), "waiting_review")
  assert.equal(deriveTaskStatus({ running: true, pendingApproval: false }), "running")
  assert.equal(deriveTaskStatus({ running: false, pendingApproval: false, paused: true }), "paused")
  assert.equal(deriveTaskStatus({ running: false, pendingApproval: false }), "idle")
})

test("多段引用按顺序拼在正文前（idle Chip 并上输入框引用）", () => {
  assert.match(
    composeQuotedPrompt(
      [
        { id: "q1", type: "file", title: "a.ts", content: "const a = 1" },
        { id: "q2", type: "task_step", title: "计划", content: "先读文件" }
      ],
      "按这个改"
    ),
    /a\.ts[\s\S]*先读文件[\s\S]*按这个改/
  )
})

test("content 优先于 snippet", () => {
  assert.equal(
    formatQuotedContext({
      id: "q2",
      type: "file",
      title: "a.ts",
      snippet: "旧",
      content: "新"
    }),
    "> [引用自文件: a.ts]\n> 新"
  )
})

test("SteerAgentInput 拒空文本", () => {
  assert.throws(() => SteerAgentInput.parse({ sessionId: "s", text: "" }))
  assert.equal(SteerAgentInput.parse({ sessionId: "s", text: "停，先读这个文件" }).text.length > 0, true)
})

test("气泡拆出文件 Chip，正文不含协议头", () => {
  const prompt = composeQuotedPrompt(
    [
      { id: "q1", type: "file", title: "tsconfig.tsbuildinfo", content: '{"fileNames":[]}' },
      { id: "q2", type: "file", title: "CLAUDE.md", content: "@AGENTS.md" }
    ],
    "你能看到我发的文件吗"
  )
  const view = splitQuotedDisplay(prompt)
  assert.deepEqual(
    view.chips.map((chip) => chip.title),
    ["tsconfig.tsbuildinfo", "CLAUDE.md"]
  )
  assert.equal(view.text, "你能看到我发的文件吗")
  assert.equal(replaceQuotedDraft(prompt, "换成这个"), prompt.replace("你能看到我发的文件吗", "换成这个"))
})
