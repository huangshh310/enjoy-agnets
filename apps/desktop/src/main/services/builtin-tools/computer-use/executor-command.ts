/**
 * 按当前平台找桌面执行器。打包二进制优先，开发时认仓库里的源码入口。
 * PATH 走 pathDirs，Windows 脚本由 spawnPathCommand 处理。
 */
import { spawnSync } from "node:child_process"
import { execPath } from "node:process"
import fs from "node:fs"
import path from "node:path"
import { pathDirs } from "@enjoy-agents/agent-harness/probe"

export type ExecutorCommand = { command: string; args: string[] }

export function resolveExecutorCommand(
  platform: string = process.platform,
  resourcesPath = process.resourcesPath,
  arch = process.arch,
  options: { compile?: boolean } = {}
): ExecutorCommand | null {
  return bundledCommand(platform, resourcesPath, arch) ?? sourceCommand(platform, options.compile !== false)
}

/** 真正要点击的那份文件：darwin 是 helper 二进制，脚本平台是 .ps1 / .py。 */
export function spawnTargetPath(resolved: ExecutorCommand, platform: string = process.platform): string {
  if (platform === "darwin") return resolved.command
  if (platform === "win32") {
    const fileAt = resolved.args.lastIndexOf("-File")
    const script = fileAt >= 0 ? resolved.args[fileAt + 1] : undefined
    if (script) return script
  }
  return resolved.args[0] ?? resolved.command
}

function bundledCommand(platform: string, resourcesPath: string, arch: string) {
  const roots = [path.join(resourcesPath, "bin", `${platform}-${arch}`), path.join(resourcesPath, "bin")]
  for (const root of roots) {
    const native = pickFile([path.join(root, "computer-use.exe"), path.join(root, "computer-use")])
    if (native) return { command: native, args: [] }
    const ps1 = path.join(root, "computer-use.ps1")
    if (fs.existsSync(ps1)) return powershellCommand(ps1)
    const py = path.join(root, "computer-use.py")
    if (fs.existsSync(py)) return pythonCommand(py)
  }
  return null
}

function sourceCommand(platform: string, compile: boolean) {
  const source = devEntry(platform)
  if (!source || !fs.existsSync(source)) return null
  if (platform === "darwin") return darwinCommand(source, compile)
  if (platform === "win32") return powershellCommand(source)
  return pythonCommand(source)
}

function powershellCommand(script: string) {
  const shell = lookupSync("powershell") ?? lookupSync("pwsh") ?? "powershell"
  return { command: shell, args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script] }
}

function pythonCommand(script: string) {
  const bin = lookupSync("python3") ?? lookupSync("python") ?? "python3"
  return { command: bin, args: [script] }
}

function darwinCommand(source: string, compile: boolean): ExecutorCommand | null {
  const out = path.join(path.dirname(source), ".build", "computer-use")
  if (!compile) return fs.existsSync(out) ? { command: out, args: [] } : null
  const binary = compileDarwin(path.dirname(source))
  return binary ? { command: binary, args: [] } : null
}

function compileDarwin(dir: string): string | null {
  const sources = fs.readdirSync(dir).filter((name) => name.endsWith(".swift")).sort().map((name) => path.join(dir, name))
  const out = path.join(dir, ".build", "computer-use")
  const compiler = lookupSync("swiftc")
  if (sources.length === 0 || !compiler) return null
  try {
    if (freshSources(sources, out)) return out
    fs.mkdirSync(path.dirname(out), { recursive: true })
    const result = spawnSync(compiler, ["-O", "-o", out, ...sources], { stdio: "ignore", windowsHide: true })
    if (result.status === 0 && fs.existsSync(out)) return out
  } catch {
    return null
  }
  return null
}

function freshSources(sources: string[], out: string): boolean {
  if (!fs.existsSync(out)) return false
  const built = fs.statSync(out).mtimeMs
  return sources.every((file) => fs.statSync(file).mtimeMs <= built)
}

function lookupSync(name: string): string | null {
  if (name.includes("/") || name.includes("\\")) return fs.existsSync(name) ? name : null
  const suffixes = process.platform === "win32" ? ["", ".exe", ".cmd"] : [""]
  for (const dir of pathDirs()) {
    for (const suffix of suffixes) {
      const candidate = path.join(dir, `${name}${suffix}`)
      if (fs.existsSync(candidate)) return candidate
    }
  }
  return null
}

function pickFile(candidates: string[]): string | null {
  return candidates.find((item) => fs.existsSync(item)) ?? null
}

function devEntry(platform: string): string | null {
  const root = findRepoNative()
  if (!root) return null
  if (platform === "darwin") return path.join(root, "darwin", "main.swift")
  if (platform === "win32") return path.join(root, "win32", "executor.ps1")
  if (platform === "linux") return path.join(root, "linux", "executor.py")
  return null
}

function findRepoNative(): string | null {
  const candidates = [
    path.resolve(path.dirname(execPath), "../../native/computer-use"),
    path.resolve(process.cwd(), "apps/desktop/native/computer-use"),
    path.resolve(process.cwd(), "native/computer-use")
  ]
  return candidates.find((item) => fs.existsSync(item)) ?? null
}
