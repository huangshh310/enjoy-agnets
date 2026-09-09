/**
 * 从 ~/.omp/agent/models.yml 只抽自定义供应商 id。
 * 禁止把 apiKey / headers 值带出去。
 */
import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import { OMP_PROVIDER_ID_RE } from "./cli-label.ts"
const PROVIDER_FIELDS = new Set([
  "baseUrl",
  "apiKey",
  "api",
  "headers",
  "auth",
  "authHeader",
  "models",
  "discovery",
  "modelOverrides",
  "disableStrictTools",
  "compat",
  "remoteCompaction",
  "transport"
])

/** 只认 `providers:` 下两格缩进的 id，丢掉字段名与密钥行。 */
export function parseOmpCustomProviderIds(raw: string): string[] {
  const disabled = parseDisabledIds(raw)
  let inProviders = false
  const ids: string[] = []
  const seen = new Set<string>()
  for (const line of raw.split(/\r?\n/)) {
    if (/^providers:\s*(#.*)?$/.test(line)) {
      inProviders = true
      continue
    }
    if (inProviders && /^\S/.test(line)) break
    if (!inProviders) continue
    const match = line.match(/^  ([a-zA-Z][a-zA-Z0-9._:-]*):\s*(#.*)?$/)
    const id = match?.[1] ?? ""
    if (!OMP_PROVIDER_ID_RE.test(id) || PROVIDER_FIELDS.has(id) || seen.has(id) || disabled.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

const YML_CAP = 200_000

/** 只读家目录 OMP 配置里的供应商 id，不把文件内容回给 renderer。 */
export async function readOmpCustomProviderIds(): Promise<string[]> {
  const root = process.env.PI_CODING_AGENT_DIR || join(homedir(), ".omp", "agent")
  for (const name of ["models.yml", "models.yaml"]) {
    try {
      const raw = await readFile(join(root, name), "utf8")
      if (raw.length > YML_CAP) continue
      return parseOmpCustomProviderIds(raw)
    } catch {
      /* 文件不存在或不可读 */
    }
  }
  return []
}

function parseDisabledIds(raw: string): Set<string> {
  const ids = new Set<string>()
  let inDisabled = false
  for (const line of raw.split(/\r?\n/)) {
    if (/^disabledProviders:\s*(#.*)?$/.test(line)) {
      inDisabled = true
      continue
    }
    if (inDisabled && /^\S/.test(line)) break
    if (!inDisabled) continue
    const match = line.match(/^\s*-\s+([a-zA-Z][a-zA-Z0-9._:-]*)\s*$/)
    if (match?.[1]) ids.add(match[1])
  }
  return ids
}
