/**
 * 子智能体 Blobatar 人格：同 id 同脸、花名册去重、状态映射表情。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  personaForSubagent,
  personasForSubagents,
  SUBAGENT_PERSONA_SEEDS
} from "./subagent-persona.ts"

const base = {
  heading: "审查路由",
  subagentKind: "explore" as const,
  status: "completed" as const
}

test("同一 tool id 两次得到同一种子名", () => {
  const first = personaForSubagent({ ...base, id: "d1" })
  const second = personaForSubagent({ ...base, id: "d1" })
  assert.equal(first.seed, second.seed)
  assert.ok(SUBAGENT_PERSONA_SEEDS.includes(first.seed as (typeof SUBAGENT_PERSONA_SEEDS)[number]))
})

test("不同 id 可以落到不同种子（哈希不是恒等）", () => {
  const seeds = ["d1", "d2", "d3", "d4", "d5"].map(
    (id) => personaForSubagent({ ...base, id }).seed
  )
  assert.ok(new Set(seeds).size >= 2)
})

test("花名册内种子名去重，即使哈希撞车", () => {
  const nodes = Array.from({ length: 8 }, (_, index) => ({
    ...base,
    id: `same-hash-probe-${index}`,
    heading: `任务 ${index}`
  }))
  const personas = personasForSubagents(nodes)
  const seeds = personas.map((persona) => persona.seed)
  assert.equal(new Set(seeds).size, seeds.length)
})

test("池耗尽后仍能给出互异后缀名", () => {
  const nodes = Array.from({ length: SUBAGENT_PERSONA_SEEDS.length + 3 }, (_, index) => ({
    ...base,
    id: `overflow-${index}`
  }))
  const personas = personasForSubagents(nodes)
  const seeds = personas.map((persona) => persona.seed)
  assert.equal(new Set(seeds).size, seeds.length)
  assert.ok(personas.slice(SUBAGENT_PERSONA_SEEDS.length).every((persona) => persona.seed.includes("-")))
})

test("running → thinking，error → sad，其余 idle", () => {
  assert.equal(personaForSubagent({ ...base, id: "r1", status: "running" }).expression, "thinking")
  assert.equal(personaForSubagent({ ...base, id: "e1", status: "error" }).expression, "sad")
  assert.equal(personaForSubagent({ ...base, id: "p1", status: "pending" }).expression, "idle")
  assert.equal(personaForSubagent({ ...base, id: "c1", status: "completed" }).expression, "idle")
})

test("种子池长度冻结在 40，避免无声缩短导致换脸", () => {
  assert.equal(SUBAGENT_PERSONA_SEEDS.length, 40)
  assert.equal(new Set(SUBAGENT_PERSONA_SEEDS).size, 40)
})
