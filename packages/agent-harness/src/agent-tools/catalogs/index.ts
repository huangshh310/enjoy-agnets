/**
 * CLI 目录查询：安装种类、文档白名单、是否把 --model 传给 ACP。
 */
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import { AGENT_TOOL_CATALOGS } from "./data.ts"
import type { AgentToolCatalog } from "./types.ts"

export type { AgentCliModelDef, AgentToolCatalog, InstallStep } from "./types.ts"
export { AGENT_TOOL_CATALOGS } from "./data.ts"

/** 这些 CLI 的 ACP 入口不认 --model，或模型位置由 spawn 自己插。 */
const SKIP_MODEL_FLAG = new Set(["grok", "deepseek", "amp", "hermes", "pi"])

const ALLOWED_DOCS_HOSTS = new Set([
  "docs.anthropic.com",
  "cursor.com",
  "developers.openai.com",
  "github.com",
  "antigravity.google",
  "docs.x.ai",
  "x.ai",
  "opencode.ai",
  "pi.dev",
  "nousresearch.com",
  "hermes-agent.nousresearch.com",
  "ampcode.com",
  "platform.deepseek.com",
  "geminicli.com",
  "www.geminicli.com",
  "ohmypi.xyz"
])

export function isAllowedDocsUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw)
    return parsed.protocol === "https:" && ALLOWED_DOCS_HOSTS.has(parsed.hostname)
  } catch {
    return false
  }
}

export function catalogFor(id: string | undefined): AgentToolCatalog | undefined {
  if (!id) return undefined
  return AGENT_TOOL_CATALOGS[id as AgentToolId]
}

export function installKindFor(id: string | undefined): "npm" | "brew" | "copy" {
  const first = catalogFor(id)?.steps[0]
  return first?.manager ?? "copy"
}

export function loginBinaryFor(id: string | undefined): string | undefined {
  return catalogFor(id)?.loginBinary
}

/** 动态模型不在静态目录里，只要有 id 就传 --model。Grok 的位置由 resolve-spawn 处理。 */
export function modelArgsFor(id: string | undefined, modelId: string | undefined): string[] {
  const model = modelId?.trim()
  if (!model || !id || SKIP_MODEL_FLAG.has(id)) return []
  return ["--model", model]
}
