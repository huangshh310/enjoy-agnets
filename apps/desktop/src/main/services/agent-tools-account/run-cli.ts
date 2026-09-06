/**
 * 账号探测只 spawn 该 CLI 白名单路径，限制超时与输出；cwd 必须是工作区。
 */
import { spawn } from "node:child_process"
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import { assertSafeAgentCommand } from "../agent-tools-guard"
import { agentToolsCwd } from "./cwd"

const OUT_CAP = 64_000
export const ACCOUNT_PROBE_MS = 3_500

export async function runSafeCli(
  id: AgentToolId,
  command: string,
  args: string[],
  options?: { timeoutMs?: number; cwd?: string }
): Promise<string | null> {
  try {
    assertSafeAgentCommand(id, command)
  } catch {
    return null
  }
  const cwd = options?.cwd ?? (await agentToolsCwd())
  const timeoutMs = options?.timeoutMs ?? ACCOUNT_PROBE_MS
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: false, windowsHide: true })
    let out = ""
    let settled = false
    const take = (chunk: Buffer | string) => {
      if (out.length >= OUT_CAP) return
      out += String(chunk)
      if (out.length > OUT_CAP) out = out.slice(0, OUT_CAP)
    }
    const finish = (value: string | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }
    const timer = setTimeout(() => {
      child.kill("SIGTERM")
      const force = setTimeout(() => child.kill("SIGKILL"), 1200)
      force.unref?.()
      finish(out.trim() || null)
    }, timeoutMs)
    child.stdout?.on("data", take)
    child.stderr?.on("data", take)
    child.on("error", () => finish(null))
    child.on("close", () => finish(out.trim() || null))
  })
}
