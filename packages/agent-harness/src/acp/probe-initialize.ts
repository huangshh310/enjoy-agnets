/**
 * 现场 ACP initialize 探测：确认 stdio JSON-RPC 能握手。
 * 不是 M4 PTY 登录兜底；auth_required 也算协议通。
 */
import { isAuthRequiredError } from "./auth.ts"
import type { SpawnOverride } from "../agent-tools/resolve-spawn.ts"

const DEFAULT_MS = 5_000

export type AcpInitializeProbe = {
  ok: boolean
  authRequired: boolean
  message: string
}

export async function probeAcpInitialize(input: {
  id: string
  cwd: string
  override?: SpawnOverride
  timeoutMs?: number
  /** 测试注入，不拉子进程。 */
  run?: () => Promise<unknown>
}): Promise<AcpInitializeProbe> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_MS
  if (input.run) return settleProbe(input.run(), timeoutMs)
  const { spawnAcpProcess } = await import("./spawn.ts")
  const { AcpClient } = await import("./client.ts")
  const spawned = spawnAcpProcess({
    id: input.id,
    cwd: input.cwd,
    override: input.override
  })
  const client = new AcpClient(spawned.child)
  try {
    return await settleProbe(client.initialize(), timeoutMs)
  } finally {
    client.dispose("kill")
  }
}

async function settleProbe(run: Promise<unknown>, timeoutMs: number): Promise<AcpInitializeProbe> {
  try {
    await withTimeout(run, timeoutMs)
    return { ok: true, authRequired: false, message: "ACP initialize succeeded." }
  } catch (error) {
    if (isAuthRequiredError(error)) {
      return { ok: true, authRequired: true, message: "ACP initialize reached auth_required." }
    }
    return {
      ok: false,
      authRequired: false,
      message: error instanceof Error ? error.message : "ACP initialize failed."
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`ACP initialize timed out after ${ms}ms.`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}
