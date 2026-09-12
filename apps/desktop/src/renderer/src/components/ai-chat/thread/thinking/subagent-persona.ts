/**
 * 子智能体 Blobatar 人格：用 tool id 哈希出稳定种子名与表情。
 * 面孔走本机 blobatar，不请求 blobatar.dev；同 id 永远同一张脸。
 */
import type { BlobatarExpressionName } from "@renderer/components/avatar/blobatar.types"
import type { AgentStepNode } from "./agent-step-tree.types.ts"

/** blobatar 种子，同时是行上展示名。 */
export interface SubagentPersona {
  seed: string
  expression: BlobatarExpressionName
}

type SubagentPersonaInput = Pick<AgentStepNode, "id" | "heading" | "subagentKind" | "status">

/**
 * 短柄名字，风格对齐 blobatar.dev/editor。
 * 顺序冻结：哈希按下标取，改序会换已有面孔。
 */
export const SUBAGENT_PERSONA_SEEDS = [
  "Alain",
  "Tove",
  "Kasper",
  "Nova",
  "Pixel",
  "Orbit",
  "Atlas",
  "Echo",
  "Prism",
  "Ember",
  "Quark",
  "Willow",
  "Cedar",
  "Flint",
  "Jade",
  "Onyx",
  "Coral",
  "Dune",
  "Frost",
  "Ivy",
  "Moss",
  "Pebble",
  "Ripple",
  "Aura",
  "Muse",
  "Spark",
  "Ghost",
  "Nomad",
  "Apex",
  "Pulse",
  "Lotus",
  "Mica",
  "Quartz",
  "Opal",
  "Luna",
  "Sol",
  "Nyx",
  "Cobalt",
  "Amber",
  "Sage"
] as const

/** 单条：按 id 哈希挑未占用的种子名。 */
export function personaForSubagent(
  node: SubagentPersonaInput,
  taken: ReadonlySet<string> = new Set()
): SubagentPersona {
  const key = node.id.trim() || `${node.subagentKind ?? "general"}:${node.heading ?? ""}`
  return {
    seed: pickPersonaSeed(key, taken),
    expression: expressionForStatus(node.status)
  }
}

/** 花名册：按出现顺序去重种子名，避免两行同一张脸。 */
export function personasForSubagents(nodes: SubagentPersonaInput[]): SubagentPersona[] {
  const taken = new Set<string>()
  const result: SubagentPersona[] = []
  for (const node of nodes) {
    const persona = personaForSubagent(node, taken)
    taken.add(persona.seed)
    result.push(persona)
  }
  return result
}

function expressionForStatus(status: AgentStepNode["status"]): BlobatarExpressionName {
  if (status === "running") return "thinking"
  if (status === "error") return "sad"
  return "idle"
}

/** 从 start 下标线性探测，池耗尽才加数字后缀。 */
function pickPersonaSeed(key: string, taken: ReadonlySet<string>): string {
  const pool = SUBAGENT_PERSONA_SEEDS
  const start = fnv1a(key) % pool.length
  for (let offset = 0; offset < pool.length; offset += 1) {
    const seed = pool[(start + offset) % pool.length]
    if (seed && !taken.has(seed)) return seed
  }
  const fallback = pool[start] ?? "Nova"
  return `${fallback}-${taken.size}`
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
