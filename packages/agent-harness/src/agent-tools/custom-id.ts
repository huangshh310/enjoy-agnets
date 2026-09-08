/**
 * 自定义 agent id：label → custom:<slug>，碰撞加后缀。
 */
import { CUSTOM_AGENT_ID_RE } from "@enjoy-agents/ipc-contract/custom-agent"

export function slugFromLabel(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
  if (!slug) return "agent"
  return /^[a-z]/.test(slug) ? slug : `a${slug}`.slice(0, 32)
}

export function nextCustomAgentId(label: string, taken: ReadonlySet<string>): string {
  const base = slugFromLabel(label)
  let candidate = `custom:${base}`
  let index = 2
  while (taken.has(candidate) || !CUSTOM_AGENT_ID_RE.test(candidate)) {
    candidate = `custom:${base}-${index}`.slice(0, 56)
    index += 1
    if (index > 99) throw new Error("Could not allocate a custom agent id.")
  }
  return candidate
}
