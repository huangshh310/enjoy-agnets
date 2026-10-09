/**
 * 验收：白名单 basename 的自定义 ACP 进程能走 initialize / session/new / 审批 / 文本。
 * 不 import AcpClient（parameter property 无法在 strip-types 下加载）。
 */
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { chmodSync, copyFileSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { pickAcpPermissionOption } from "./permissions.ts"
import { resolveCustomSpawn } from "../agent-tools/custom-spawn.ts"

const fixture = fileURLToPath(new URL("./fixtures/mock-acp-stdio.mjs", import.meta.url))

test("自定义 opencode：spawn + initialize + session/new + 审批 + 文本", async () => {
  const dir = mkdtempSync(join(tmpdir(), "enjoy-custom-acp-"))
  const command = join(dir, "opencode")
  copyFileSync(fixture, command)
  chmodSync(command, 0o755)
  const resolved = resolveCustomSpawn(command, [])
  assert.equal(resolved.command, command)

  // 桩是 .mjs；Windows 不能 spawn 无扩展名脚本，用当前 node 跑 fixture。
  const child = spawn(process.execPath, [fixture], {
    cwd: dir,
    shell: false,
    stdio: ["pipe", "pipe", "pipe"]
  })
  const lines: string[] = []
  let wake: (() => void) | undefined
  child.stdout?.setEncoding("utf8")
  child.stdout?.on("data", (chunk: string) => {
    for (const line of chunk.split("\n")) {
      if (line.trim()) lines.push(line.trim())
    }
    wake?.()
  })

  const send = (payload: Record<string, unknown>) => {
    child.stdin?.write(`${JSON.stringify(payload)}\n`)
  }
  const waitFor = async (count: number) => {
    const deadline = Date.now() + 3000
    while (lines.length < count && Date.now() < deadline) {
      await new Promise<void>((resolve) => {
        wake = resolve
        setTimeout(resolve, 50)
      })
    }
  }

  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: 1 } })
  await waitFor(1)
  send({ jsonrpc: "2.0", id: 2, method: "session/new", params: { cwd: dir, mcpServers: [] } })
  await waitFor(2)
  send({ jsonrpc: "2.0", id: 3, method: "session/prompt", params: { sessionId: "sess_custom", prompt: [{ type: "text", text: "hi" }] } })
  await waitFor(3)

  const perm = JSON.parse(lines[2] ?? "{}") as {
    method?: string
    params?: { options?: Array<{ optionId: string; kind?: string }> }
  }
  assert.equal(perm.method, "session/request_permission")
  const outcome = pickAcpPermissionOption("allow", perm.params?.options ?? [])
  send({ jsonrpc: "2.0", id: 9001, result: { outcome } })
  await waitFor(5)

  const update = JSON.parse(lines[3] ?? "{}") as { method?: string; params?: { content?: { text?: string } } }
  const done = JSON.parse(lines[4] ?? "{}") as { id?: number; result?: { stopReason?: string } }
  child.kill("SIGKILL")

  assert.equal(update.method, "session/update")
  assert.equal(update.params?.content?.text, "custom-acp-ok")
  assert.equal(done.id, 3)
  assert.equal(done.result?.stopReason, "end_turn")
})
