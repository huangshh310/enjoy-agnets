/**
 * stdio 命令白名单：只允许常见包管理器 / 运行时，禁止路径和 shell 元字符。
 */
const ALLOWED_BINS = new Set([
  "npx",
  "npm",
  "pnpm",
  "yarn",
  "bun",
  "node",
  "uvx",
  "uv",
  "python",
  "python3"
])

export function parseStdioCommand(command: string): { bin: string; args: string[] } {
  const trimmed = command.trim()
  if (!trimmed) throw new Error("stdio command is empty.")
  if (/[|&;`$<>(){}\n\r]/.test(trimmed)) {
    throw new Error("stdio command contains shell metacharacters.")
  }
  const parts = trimmed.split(/\s+/)
  const rawBin = parts[0] ?? ""
  if (rawBin.includes("/") || rawBin.includes("\\") || rawBin.includes("..")) {
    throw new Error("stdio command must be a bare allowlisted binary.")
  }
  const bin = rawBin.toLowerCase().replace(/\.(exe|cmd|bat)$/i, "")
  if (!ALLOWED_BINS.has(bin)) {
    throw new Error(`stdio binary "${rawBin}" is not allowlisted.`)
  }
  return { bin: rawBin, args: parts.slice(1) }
}
