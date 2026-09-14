/**
 * 把 Enjoy 白名单裸 bin 解析成 ACP 要求的绝对路径。
 */
import { parseStdioCommand } from "@enjoy-agents/mcp/stdio-command"
import { lookupOnPath } from "@enjoy-agents/agent-harness/probe"

export async function resolveStdioAbs(
  command: string,
  lookup: (name: string) => Promise<string | undefined> = lookupOnPath
): Promise<{ command: string; args: string[] } | undefined> {
  let parsed: { bin: string; args: string[] }
  try {
    parsed = parseStdioCommand(command)
  } catch {
    return undefined
  }
  const abs = await lookup(parsed.bin)
  if (!abs) return undefined
  return { command: abs, args: parsed.args }
}
