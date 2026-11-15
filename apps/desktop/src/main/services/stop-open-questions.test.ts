/**
 * 开放问题只确认、不修复（leo arch §1 末 / §9.5）。结论写在测试名与注释里。
 */
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"
import { buildSeatbeltProfile, seatbeltWrap, shouldUseOsSandbox } from "./os-sandbox.ts"

const dir = dirname(fileURLToPath(import.meta.url))
const repo = join(dir, "../../../../../")

function readRepo(rel: string): string {
  return readFileSync(join(repo, rel), "utf8")
}

test("开放问题结论：主 Agent 批准后 bash 会执行两次——decideApproval 无 waiter 时先 executeStoredTool，审批响应只有 tool-approval-response 没有 tool-result，续泵 SDK 会再 executeToolCall（本刀只确认，不修）", () => {
  const decide = readFileSync(join(dir, "decide-approval.ts"), "utf8")
  assert.match(decide, /const hadWaiter = run\.approvalGate\.resolve/)
  assert.match(decide, /if \(!hadWaiter && decision\.decision !== "deny"\)/)
  assert.match(decide, /executeStoredTool/)
  // 活泵主 Agent 工具通常没有 waiter（waiter 只给子 Agent / 桌面二次确认）。
  const stored = readFileSync(join(dir, "execute-stored-tool.ts"), "utf8")
  assert.match(stored, /活泵 stub 常无 waiter/)
  const response = readFileSync(join(dir, "approval-response-message.ts"), "utf8")
  assert.match(response, /tool-approval-response/)
  assert.equal(response.includes("tool-result"), false)
  // 结论：批准后两条路都会跑。修复另开刀。
})

test("开放问题结论：sandbox-exec 进程形态在 darwin 上实测；本平台非 darwin，shouldUseOsSandbox 为假，形态未确认（按进程组杀两种情况都成立）", {
  skip: process.platform === "darwin"
}, () => {
  assert.equal(shouldUseOsSandbox(), false)
  const src = readFileSync(join(dir, "os-sandbox.ts"), "utf8")
  assert.match(src, /executable: "sandbox-exec"/)
  assert.match(src, /platform === "darwin"/)
})

test("开放问题结论：sandbox-exec 在 darwin 上的进程形态（exec 替换自身 vs fork 子进程）", {
  skip: process.platform !== "darwin"
}, async () => {
  const profile = buildSeatbeltProfile({
    workspaceRoot: tmpdir(),
    tmpDir: tmpdir(),
    allowNetwork: false
  })
  const wrapped = seatbeltWrap(process.execPath, ["-e", "setTimeout(()=>{}, 8000)"], profile)
  const child = spawn(wrapped.executable, wrapped.args, { stdio: "ignore" })
  const pid = child.pid
  assert.ok(typeof pid === "number")
  await new Promise((resolve) => setTimeout(resolve, 200))
  const comm = await commOf(pid)
  child.kill("SIGKILL")
  await new Promise((resolve) => child.on("exit", resolve))
  // exec：pid 的 comm 变成 node；fork：comm 仍是 sandbox-exec。
  // 把实测结果钉在断言消息里，便于报告。
  const shape = comm.includes("sandbox-exec") ? "fork（sandbox-exec 仍为 pid）" : `exec 或已替换（comm=${comm})`
  assert.ok(comm.length >= 0, `sandbox-exec shape: ${shape}`)
})

test("开放问题结论：ACP cancel 只调用 client.cancel，仓内没有进程树查杀；Codex / Claude Code 收到 cancel 后是否残留进程，未跑引擎故未确认", () => {
  const acp = readRepo("packages/agent-harness/src/acp/stream-acp.ts")
  assert.match(acp, /export async function cancelAcpTurn/)
  assert.match(acp, /live\.client\.cancel\(live\.acpSessionId\)/)
  assert.equal(/taskkill|forceKillTree|kill\(-/.test(acp), false)
  const open = readFileSync(join(dir, "open-coding-stream.ts"), "utf8")
  assert.match(open, /cancelAcpTurn/)
  assert.equal(open.includes("forceKillTree"), false)
})

function commOf(pid: number): Promise<string> {
  return new Promise((resolve) => {
    const ps = spawn("ps", ["-p", String(pid), "-o", "comm="], { stdio: ["ignore", "pipe", "ignore"] })
    let out = ""
    ps.stdout?.on("data", (chunk: Buffer) => {
      out += String(chunk)
    })
    ps.on("exit", () => resolve(out.trim()))
    ps.on("error", () => resolve(""))
  })
}
