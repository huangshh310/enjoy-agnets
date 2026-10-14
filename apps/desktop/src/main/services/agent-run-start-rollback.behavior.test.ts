/**
 * leo（#135 条件过）：首字前回滚归属——真走开跑链路（runAgent / resumeAgentRun → prepareAndPump → failAgentPump）。
 * agent-run-start :243 / :284 只删本轮新插入的用户句；:274 / :297 续跑不回滚。
 */
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

type Scene = { ok: boolean; code?: string; rows: string[]; err?: { preOutput?: boolean; keptUserMessage?: boolean }; status?: string }

function run(): Record<string, Scene> {
  const desktop = fileURLToPath(new URL("../../../", import.meta.url))
  const out = execFileSync(
    process.execPath,
    ["--experimental-transform-types", "--no-warnings", "--import", "./src/main/services/test-hooks/register.mjs",
      "./src/main/services/agent-run-start-rollback.behavior.child.ts"],
    { cwd: desktop, encoding: "utf8", timeout: 90_000,
      env: { ...process.env, ENJOY_E2E_USERDATA: mkdtempSync(join(tmpdir(), "enjoy-sr-")) } }
  )
  const line = out.split("\n").find((l) => l.startsWith("RESULT "))
  assert.ok(line, out)
  return JSON.parse(line.slice(7))
}

const r = run()

test("全新一轮（:284）：新插入的用户句首字前失败被回滚，旧行不动", () => {
  assert.equal(r.fresh.ok, true, JSON.stringify(r.fresh))
  assert.deepEqual(r.fresh.rows, ["u1:q1", "a1:a1"])
  assert.equal(r.fresh.err?.preOutput, true)
  assert.notEqual(r.fresh.err?.keptUserMessage, true)
})

test("重新生成（:243 UPDATE 已有行）：u1 保留，keptUserMessage=true", () => {
  assert.equal(r.regen.ok, true, JSON.stringify(r.regen))
  assert.deepEqual(r.regen.rows, ["u1:q1"])
  assert.equal(r.regen.err?.preOutput, true)
  assert.equal(r.regen.err?.keptUserMessage, true)
})

test("截断路径新插入（:243 inserted）：新句被回滚", () => {
  assert.equal(r.truncNew.ok, true, JSON.stringify(r.truncNew))
  assert.deepEqual(r.truncNew.rows, ["u1:q1", "a1:a1"])
  assert.equal(r.truncNew.err?.preOutput, true)
})

test("续跑（:274 / :297）：沿用 rollbackEligible 的 run 也不回滚，行全在，runs 落 failed", () => {
  assert.equal(r.resume.ok, true, JSON.stringify(r.resume))
  assert.deepEqual(r.resume.rows, ["u1:q1", "a1:a1"])
  assert.notEqual(r.resume.err?.preOutput, true)
  assert.equal(r.resume.status, "failed")
})

test("非截断但用户句已在库（:284 UPDATE）：不删，keptUserMessage=true", () => {
  assert.equal(r.retry.ok, true, JSON.stringify(r.retry))
  assert.deepEqual(r.retry.rows, ["u1:q1", "a1:a1", "u2:q2"])
  assert.equal(r.retry.err?.preOutput, true)
  assert.equal(r.retry.err?.keptUserMessage, true)
})
