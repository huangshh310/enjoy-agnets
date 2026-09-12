import assert from "node:assert/strict"
import { test } from "node:test"
import { applyLeadingSlash } from "./consume-slash.ts"
import type { SkillMention } from "./mention-items.ts"

const summarize: SkillMention = {
  id: "s1",
  name: "Summarize",
  slash: "summarize",
  scope: "global"
}

test("句首模式命令剥掉并切 mode", () => {
  assert.deepEqual(applyLeadingSlash("/plan 先画蓝图", []), { mode: "plan", text: "先画蓝图" })
  assert.deepEqual(applyLeadingSlash("/ask", []), { mode: "ask", text: "" })
  assert.deepEqual(applyLeadingSlash("/explore 摸清", []), { mode: "plan", text: "摸清" })
  assert.deepEqual(applyLeadingSlash("/execute", []), { mode: "agent", text: "" })
})

test("已安装技能变成 skill，未知 /web 原样留下", () => {
  assert.deepEqual(applyLeadingSlash("/summarize 这段", [summarize]), {
    skill: summarize,
    text: "这段"
  })
  assert.deepEqual(applyLeadingSlash("/web 搜索", [summarize]), { text: "/web 搜索" })
})

test("同名时模式优先于技能", () => {
  const planSkill: SkillMention = { id: "p", name: "plan", slash: "plan", scope: "workspace" }
  assert.deepEqual(applyLeadingSlash("/plan x", [planSkill]), { mode: "plan", text: "x" })
})

test("句首 /compact 当宿主命令，不发给模型", () => {
  assert.deepEqual(applyLeadingSlash("/compact", []), { command: "compact", text: "" })
  assert.deepEqual(applyLeadingSlash("/compact 再问一句", []), {
    command: "compact",
    text: "再问一句"
  })
})
