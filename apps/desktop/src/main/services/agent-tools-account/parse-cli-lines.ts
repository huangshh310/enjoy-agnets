/**
 * OpenCode / Pi / OMP 的公开 CLI 文本解析。不碰 token 字段。
 */
import type { AgentCliModel, AgentToolAuthAccount } from "@enjoy-agents/ipc-contract"
import { firstLine } from "./parse.ts"

export function parseOpenCodeAuth(raw: string): AgentToolAuthAccount {
  const text = raw.trim()
  const loggedIn = Boolean(text) && !/not (logged|authenticated)|no credentials|unauthenticated/i.test(text)
  const providers = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[*\-•]\s+/, "").trim())
    .filter((line) => line && !/^┌|^│|^└|^─/.test(line) && !/token|secret|key/i.test(line))
  return {
    loggedIn,
    authMethod: "opencode auth login",
    organization: "OpenCode",
    accountName: providers[0],
    rawStatus: firstLine(text).slice(0, 400)
  }
}

/** `provider/model` 或纯模型 id 一行一条。 */
export function parseProviderModelLines(raw: string): AgentCliModel[] {
  const models: AgentCliModel[] = []
  const seen = new Set<string>()
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.replace(/^[*\-•]\s+/, "").trim()
    if (!trimmed || trimmed.startsWith("Fetching") || /token|secret/i.test(trimmed)) continue
    const match = trimmed.match(/^([a-zA-Z0-9._:-]+(?:\/[a-zA-Z0-9._:-]+)?)/)
    const id = match?.[1]
    if (!id || seen.has(id)) continue
    seen.add(id)
    models.push({ id, label: id })
  }
  return models
}
