/**
 * 找 AppSnap helper。打包二进制优先。开发时 swiftc 编到 .build，未签名不得报就绪。
 */
import { spawnSync } from "node:child_process"
import { execPath } from "node:process"
import fs from "node:fs"
import path from "node:path"
import { pathDirs } from "@enjoy-agents/agent-harness/probe"
import { inspectDarwinCodesign } from "../builtin-tools/computer-use/executor-identity"

export function resolveAppsnapBinary(
  platform = process.platform,
  resourcesPath = process.resourcesPath,
  arch = process.arch
): string | null {
  if (platform !== "darwin") return null
  const bundled = [
    path.join(resourcesPath, "bin", `${platform}-${arch}`, "appsnap"),
    path.join(resourcesPath, "bin", "appsnap")
  ].find((item) => fs.existsSync(item))
  if (bundled) return bundled
  return compileDevBinary()
}

export function appsnapHelperSigned(binary: string | null): boolean {
  if (!binary || process.platform !== "darwin") return false
  const sidecar = readSidecar(binary)
  if (sidecar?.signed !== true) return false
  return inspectDarwinCodesign(binary).signed === true
}

function compileDevBinary(): string | null {
  const dir = findSourceDir()
  if (!dir) return null
  const sources = fs.readdirSync(dir).filter((name) => name.endsWith(".swift")).sort().map((name) => path.join(dir, name))
  const out = path.join(dir, ".build", "appsnap")
  if (sources.length === 0) return null
  if (fs.existsSync(out) && sources.every((file) => fs.statSync(file).mtimeMs <= fs.statSync(out).mtimeMs)) return out
  const compiler = lookup("swiftc")
  if (!compiler) return null
  fs.mkdirSync(path.dirname(out), { recursive: true })
  const result = spawnSync(compiler, ["-O", "-o", out, ...sources], { stdio: "ignore" })
  return result.status === 0 && fs.existsSync(out) ? out : null
}

function findSourceDir(): string | null {
  const candidates = [
    path.resolve(path.dirname(execPath), "../../native/appsnap/darwin"),
    path.resolve(process.cwd(), "apps/desktop/native/appsnap/darwin"),
    path.resolve(process.cwd(), "native/appsnap/darwin")
  ]
  return candidates.find((item) => fs.existsSync(item)) ?? null
}

function readSidecar(binary: string): { signed?: boolean } | null {
  const file = path.join(path.dirname(binary), "appsnap.identity.json")
  if (!fs.existsSync(file)) return null
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as { signed?: boolean }
  } catch {
    return null
  }
}

function lookup(name: string): string | null {
  for (const dir of pathDirs()) {
    const candidate = path.join(dir, name)
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}
