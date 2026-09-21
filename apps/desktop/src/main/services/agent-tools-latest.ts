/**
 * 探 npm/brew 最新版。4s 超时、1h 缓存；失败当不可知，禁止假版本。
 */
import { latestPackageSource, lookupOnPath, spawnPathCommand } from "@enjoy-agents/agent-harness"
import type { AgentToolId } from "@enjoy-agents/ipc-contract"

const TTL_MS = 60 * 60 * 1000
const TIMEOUT_MS = 4_000
const cache = new Map<string, { expiresAt: number; version: string | null }>()

export function invalidateLatestCache(id?: AgentToolId) {
  if (!id) {
    cache.clear()
    return
  }
  const source = latestPackageSource(id)
  if (source) cache.delete(`${source.manager}:${source.name}`)
}

export async function probeLatestVersion(
  id: AgentToolId
): Promise<{ version: string | null; knowable: boolean }> {
  const source = latestPackageSource(id)
  if (!source) return { version: null, knowable: false }
  if (source.manager === "brew" && process.platform === "win32") {
    return { version: null, knowable: false }
  }
  const key = `${source.manager}:${source.name}`
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) return { version: hit.version, knowable: true }
  const version =
    source.manager === "npm" ? await npmViewVersion(source.name) : await brewStableVersion(source.name)
  cache.set(key, { expiresAt: Date.now() + TTL_MS, version })
  return { version, knowable: true }
}

async function npmViewVersion(pkg: string): Promise<string | null> {
  const npm = await lookupOnPath("npm")
  if (!npm) return null
  return runText(npm, ["view", pkg, "version"])
}

async function brewStableVersion(formula: string): Promise<string | null> {
  const brew = await lookupOnPath("brew")
  if (!brew) return null
  const raw = await runText(brew, ["info", "--json=v2", formula])
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { formulae?: Array<{ versions?: { stable?: string } }> }
    return parsed.formulae?.[0]?.versions?.stable?.trim() || null
  } catch {
    return null
  }
}

function runText(command: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawnPathCommand(command, args)
    let out = ""
    const timer = setTimeout(() => {
      child.kill("SIGTERM")
      resolve(null)
    }, TIMEOUT_MS)
    child.stdout?.on("data", (chunk: Buffer) => {
      out += String(chunk)
    })
    child.on("error", () => {
      clearTimeout(timer)
      resolve(null)
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      resolve(code === 0 ? out.trim() || null : null)
    })
  })
}
