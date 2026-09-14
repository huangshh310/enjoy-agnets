/**
 * ACP stdio 命令解析：本机 abs，或 SSH 远端 which。
 */
import { parseStdioCommand } from "@enjoy-agents/mcp/stdio-command"
import { resolveStdioAbs } from "./resolve-stdio-abs.ts"

export async function projectStdioCommand(
  command: string,
  input: { ssh: boolean; lookupRemoteBin?: (bin: string) => Promise<string | undefined> }
): Promise<{ command: string; args: string[] } | undefined> {
  if (input.ssh) return resolveRemoteStdio(command, input.lookupRemoteBin)
  return resolveStdioAbs(command)
}

async function resolveRemoteStdio(
  command: string,
  lookup?: (bin: string) => Promise<string | undefined>
): Promise<{ command: string; args: string[] } | undefined> {
  if (!lookup) return undefined
  let parsed: { bin: string; args: string[] }
  try {
    parsed = parseStdioCommand(command)
  } catch {
    return undefined
  }
  const abs = await lookup(parsed.bin)
  if (!abs?.startsWith("/")) return undefined
  return { command: abs, args: parsed.args }
}
