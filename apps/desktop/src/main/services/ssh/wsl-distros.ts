/**
 * 解析 `wsl -l -q` 输出。Windows 常是 UTF-16 LE；去掉 docker-desktop 辅助发行版。
 */
import { spawnSync } from "node:child_process"
import { resolveWslExecutable } from "./ssh-client.ts"

const SKIP = new Set(["docker-desktop", "docker-desktop-data"])

export function listWslDistros(platform = process.platform): string[] {
  if (platform !== "win32") return []
  try {
    const result = spawnSync(resolveWslExecutable(platform), ["-l", "-q"], {
      encoding: "buffer",
      windowsHide: true,
      timeout: 8000
    })
    if (result.error || result.status !== 0) return []
    return parseWslDistroNames(decodeWslList(result.stdout ?? Buffer.alloc(0)))
  } catch {
    return []
  }
}

export function decodeWslList(buffer: Buffer): string {
  if (buffer.length >= 2 && buffer[1] === 0) return buffer.toString("utf16le")
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString("utf16le")
  }
  return buffer.toString("utf8")
}

export function parseWslDistroNames(text: string): string[] {
  return text
    .split(/\r?\n/)
    // wsl.exe 输出 UTF-16LE，字符之间夹 NUL，必须按码位剥掉。
    // eslint-disable-next-line no-control-regex
    .map((line) => line.replace(/\u0000/g, "").replace(/^\*\s*/, "").trim())
    .filter((name) => name.length > 0 && !SKIP.has(name.toLowerCase()))
}
