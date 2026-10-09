/**
 * 向 AppSnap helper 发一条 JSON，然后结束进程。渲染进程不碰截图框架。
 */
import { spawn } from "node:child_process"
import { appsnapHelperSigned, resolveAppsnapBinary } from "./appsnap-binary"

const TIMEOUT_MS = 8_000

export async function appsnapDoctor(): Promise<Record<string, unknown>> {
  if (process.platform !== "darwin") {
    return { ok: false, platform: process.platform, helperSigned: false, code: "unsupported", line: "unsupported" }
  }
  const binary = resolveAppsnapBinary()
  const helperSigned = appsnapHelperSigned(binary)
  if (!binary) {
    return { ok: false, platform: "darwin", helperSigned: false, code: "executor_missing", line: "missing" }
  }
  if (!helperSigned) {
    return { ok: false, platform: "darwin", helperSigned: false, code: "executor_unsigned", line: "unsigned" }
  }
  const rpc = await appsnapCall("doctor", {})
  return {
    ok: rpc.ok === true,
    platform: "darwin",
    helperSigned: true,
    screenCapture: rpc.screenCapture === true,
    inputMonitoring: rpc.inputMonitoring === true,
    code: typeof rpc.code === "string" ? rpc.code : undefined,
    line: rpc.ok === true ? "ready" : "denied"
  }
}

export async function appsnapList(): Promise<Record<string, unknown>> {
  const gate = await requireHelper()
  if (gate) return { ok: false, windows: [], ...gate }
  const rpc = await appsnapCall("list_windows", {})
  const windows = Array.isArray(rpc.windows) ? rpc.windows.slice(0, 50) : []
  return { ok: rpc.ok === true, windows, code: rpc.code, line: rpc.line }
}

export async function appsnapCapture(windowId?: number): Promise<Record<string, unknown>> {
  const gate = await requireHelper()
  if (gate) return { ok: false, ...gate }
  const params = windowId ? { windowId } : {}
  return appsnapCall("capture", params)
}

async function requireHelper(): Promise<{ code: string; line: string } | null> {
  if (process.platform !== "darwin") return { code: "unsupported", line: "unsupported" }
  if (!resolveAppsnapBinary()) return { code: "executor_missing", line: "missing" }
  return null
}

function appsnapCall(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const binary = resolveAppsnapBinary()
  if (!binary) return Promise.resolve({ ok: false, code: "executor_missing", line: "missing" })
  return new Promise((resolve) => {
    const child = spawn(binary, [], { stdio: ["pipe", "pipe", "ignore"] })
    let stdout = ""
    const timer = setTimeout(() => finish({ ok: false, code: "timeout", line: "timeout" }), TIMEOUT_MS)
    const finish = (row: Record<string, unknown>) => {
      clearTimeout(timer)
      child.kill()
      resolve(row)
    }
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8")
      const line = stdout.split("\n").find((item) => item.trim())
      if (!line) return
      finish(parseLine(line))
    })
    child.on("error", () => finish({ ok: false, code: "spawn_failed", line: "spawn_failed" }))
    child.stdin.write(`${JSON.stringify({ id: "1", method, params })}\n`)
  })
}

function parseLine(line: string): Record<string, unknown> {
  try {
    const row = JSON.parse(line) as { result?: Record<string, unknown>; error?: { code?: string } }
    if (row.error) return { ok: false, code: row.error.code ?? "capture_failed", line: row.error.code ?? "capture_failed" }
    return { ok: true, ...row.result }
  } catch {
    return { ok: false, code: "bad_response", line: "bad_response" }
  }
}
