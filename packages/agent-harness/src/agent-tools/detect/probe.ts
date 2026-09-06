/**
 * 在 PATH 上找 CLI，并可选跑 version。测试可注入 lookup。
 */
import { spawn } from "node:child_process"
import { homedir } from "node:os"
import { delimiter, join } from "node:path"
import { access } from "node:fs/promises"
import { constants } from "node:fs"

export type BinaryLookup = (name: string) => Promise<string | undefined>

export type ProbeResult = {
  found: boolean
  path: string | null
  version: string | null
}

/** 按候选名依次查找；找到后跑 detectArgs 取第一行当 version。 */
export async function probeBinaries(
  names: string[],
  detectArgs: string[] = ["--version"],
  lookup: BinaryLookup = lookupOnPath
): Promise<ProbeResult> {
  for (const name of names) {
    const path = await lookup(name)
    if (!path) continue
    const version = detectArgs.length > 0 ? await readVersion(path, detectArgs) : null
    return { found: true, path, version }
  }
  return { found: false, path: null, version: null }
}

export async function lookupOnPath(name: string): Promise<string | undefined> {
  if (name.includes("/") || name.includes("\\")) {
    try {
      await access(name, constants.X_OK)
      return name
    } catch {
      return undefined
    }
  }
  const dirs = pathDirs()
  const suffixes = process.platform === "win32" ? ["", ".exe", ".cmd"] : [""]
  for (const dir of dirs) {
    for (const suffix of suffixes) {
      const candidate = join(dir, `${name}${suffix}`)
      try {
        await access(candidate, constants.F_OK)
        return candidate
      } catch {
        // 下一个目录
      }
    }
  }
  return undefined
}

/** 系统 PATH 优先；brew / 用户 bin 只补 Finder 启动时的缺口。 */
export function pathDirs(): string[] {
  const home = homedir()
  const system = (process.env.PATH ?? "").split(delimiter).filter(Boolean)
  const brew =
    process.platform === "win32" ? [] : ["/opt/homebrew/bin", "/usr/local/bin"]
  const user =
    process.platform === "win32"
      ? [join(home, "AppData", "Roaming", "npm"), join(home, ".grok", "bin")]
      : [join(home, ".local", "bin"), join(home, ".npm-global", "bin"), join(home, ".grok", "bin")]
  return uniqueDirs([...system, ...brew, ...user])
}

function uniqueDirs(dirs: string[]): string[] {
  const seen = new Set<string>()
  const next: string[] = []
  for (const dir of dirs) {
    if (!dir || seen.has(dir)) continue
    seen.add(dir)
    next.push(dir)
  }
  return next
}

const VERSION_OUT_CAP = 8_192

function readVersion(command: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { shell: false, windowsHide: true })
    let out = ""
    let settled = false
    const take = (chunk: Buffer | string) => {
      if (out.length >= VERSION_OUT_CAP) return
      out += String(chunk)
      if (out.length > VERSION_OUT_CAP) out = out.slice(0, VERSION_OUT_CAP)
    }
    const finish = (value: string | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }
    const timer = setTimeout(() => {
      child.kill("SIGTERM")
      const force = setTimeout(() => child.kill("SIGKILL"), 1500)
      force.unref?.()
      finish(null)
    }, 4000)
    child.stdout?.on("data", take)
    child.stderr?.on("data", take)
    child.on("error", () => finish(null))
    child.on("close", () => {
      const line = out.split(/\r?\n/).map((item) => item.trim()).find(Boolean)
      finish(line ?? null)
    })
  })
}
