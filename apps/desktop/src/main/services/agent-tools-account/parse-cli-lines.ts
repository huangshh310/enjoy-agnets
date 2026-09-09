/**
 * OpenCode / Pi / OMP 的公开 CLI 文本解析。不碰 token 字段。
 */
import type { AgentCliModel, AgentToolAuthAccount } from "@enjoy-agents/ipc-contract"
import { clipCliLabel } from "./cli-label.ts"
import { firstLine, parseJsonObject } from "./parse.ts"

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

/**
 * `omp models --json` 或分组表。供应商名（如 google-antigravity）不是可选模型。
 */
export function parseOmpModels(raw: string): AgentCliModel[] {
  const fromJson = parseOmpModelsJson(raw)
  if (fromJson.length > 0) return fromJson
  const fromTable = parseOmpModelsTable(raw)
  if (fromTable.length > 0) return fromTable
  return parseProviderModelLines(raw).filter((item) => item.id.includes("/"))
}

function parseOmpModelsJson(raw: string): AgentCliModel[] {
  const json = parseJsonObject(raw)
  const rows = Array.isArray(json?.models) ? json.models : []
  const models: AgentCliModel[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    if (!row || typeof row !== "object") continue
    const rec = row as Record<string, unknown>
    const selector =
      asToken(rec.selector) ||
      (asToken(rec.provider) && asToken(rec.id) ? `${asToken(rec.provider)}/${asToken(rec.id)}` : "")
    if (!selector || !selector.includes("/") || seen.has(selector) || selector.length > 120) continue
    seen.add(selector)
    const name = typeof rec.name === "string" ? rec.name.trim() : ""
    const short = selector.split("/")[1] ?? selector
    models.push({ id: selector, label: clipCliLabel(name || short) })
  }
  return models
}

function parseOmpModelsTable(raw: string): AgentCliModel[] {
  const models: AgentCliModel[] = []
  const seen = new Set<string>()
  let provider = ""
  for (const line of raw.split(/\r?\n/)) {
    const heading = line.trim().match(/^([a-zA-Z0-9._:-]+)\s+\(\d+\)\s*$/)
    if (heading) {
      provider = heading[1] ?? ""
      continue
    }
    if (!provider || /^[┌┐└┘├┤┬┴─│\s]+$/.test(line) || /token|secret/i.test(line)) continue
    const cell = line.replace(/^│\s*/, "").split(/\s*│/)[0]?.trim() ?? ""
    if (!cell || cell === "model" || !/^[a-zA-Z0-9._:-]+$/.test(cell)) continue
    const id = `${provider}/${cell}`
    if (seen.has(id) || id.length > 120) continue
    seen.add(id)
    models.push({ id, label: clipCliLabel(cell) })
  }
  return models
}

function asToken(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}
