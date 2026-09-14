import assert from "node:assert/strict"
import { test } from "node:test"
import {
  acpProcessKey,
  composeAcpPrompt,
  CUSTOM_INSTRUCTIONS_PREFIX,
  formatHandoffContext,
  HANDOFF_PREFIX,
  lastUserText
} from "./acp-prompt.ts"

test("acpProcessKey 含 toolId，Claude 与 Cursor 不会撞车", () => {
  const claude = acpProcessKey("claude", "", {})
  const cursor = acpProcessKey("cursor", "", {})
  assert.notEqual(claude, cursor)
  assert.ok(claude.startsWith("claude:"))
  assert.ok(cursor.startsWith("cursor:"))
})

test("composeAcpPrompt 把 handoff 系统上下文垫在用户句前", () => {
  const hidden = formatHandoffContext({
    fromRuntimeId: "claude",
    toRuntimeId: "cursor",
    summary: "正在改 auth.ts，未决审批：bash"
  })
  const prompt = composeAcpPrompt([
    { role: "system", content: hidden },
    { role: "user", content: "继续" },
    { role: "assistant", content: "好" },
    { role: "user", content: "换成 Cursor 接着做" }
  ])
  assert.ok(prompt.startsWith(HANDOFF_PREFIX))
  assert.ok(prompt.includes("Previous engine: claude"))
  assert.ok(prompt.includes("Next engine: cursor"))
  assert.ok(prompt.includes("正在改 auth.ts"))
  assert.ok(prompt.endsWith("换成 Cursor 接着做"))
  assert.ok(prompt.includes("\n---\n"))
})

test("没有 handoff 时只发最后一条用户句，不当成续跑伪装", () => {
  assert.equal(
    composeAcpPrompt([
      { role: "user", content: "先读 README" },
      { role: "assistant", content: "读了" },
      { role: "user", content: "再改入口" }
    ]),
    "再改入口"
  )
})

test("附件写成工作区路径清单，不写未转发", () => {
  const prompt = composeAcpPrompt([
    {
      role: "user",
      content: [
        { type: "text", text: "对照这份改" },
        { type: "file", filename: "src/auth.ts", mediaType: "text/plain" }
      ]
    }
  ])
  assert.ok(prompt.includes("对照这份改"))
  assert.ok(prompt.includes("Attached workspace files:"))
  assert.ok(prompt.includes("- src/auth.ts"))
  assert.ok(!prompt.includes("not forwarded"))
})

test("自定义说明垫在用户句前，空串不占位", () => {
  const prompt = composeAcpPrompt([{ role: "user", content: "继续改" }], {
    customInstructions: "  Prefer small diffs.  "
  })
  assert.ok(prompt.startsWith(CUSTOM_INSTRUCTIONS_PREFIX))
  assert.ok(prompt.includes("Prefer small diffs."))
  assert.ok(prompt.endsWith("继续改"))
  assert.equal(composeAcpPrompt([{ role: "user", content: "只这一句" }], { customInstructions: "  " }), "只这一句")
})

test("技能索引垫在用户句前", () => {
  const prompt = composeAcpPrompt([{ role: "user", content: "继续" }], {
    skillCatalog: "# Installed skills (index)\n- tdd"
  })
  assert.ok(prompt.includes("Installed skills"))
  assert.ok(prompt.includes("- tdd"))
  assert.ok(prompt.endsWith("继续"))
})

test("lastUserText 忽略系统句", () => {
  assert.equal(
    lastUserText([
      { role: "system", content: `${HANDOFF_PREFIX}\nSummary: x` },
      { role: "user", content: "真实用户句" }
    ]),
    "真实用户句"
  )
})
