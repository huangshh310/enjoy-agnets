/**
 * leo：agent-run-start 的接线（modelMessagesForStart → withAttachmentFlags → toModelMessages）。
 * 本轮只贴图不打字：最后一条用户句必须留下（带占位）进模型，不被 prune 掉；拆掉 withAttachmentFlags 接线这条就挂。
 */
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

type Scene = { roles: string[]; lastPlaceholder: boolean }

function run(): { image: Scene; none: Scene } {
  const desktop = fileURLToPath(new URL("../../../", import.meta.url))
  const out = execFileSync(
    process.execPath,
    ["--experimental-transform-types", "--no-warnings", "--import", "./src/main/services/test-hooks/register.mjs",
      "./src/main/services/agent-run-start-image-only.behavior.child.ts"],
    { cwd: desktop, encoding: "utf8", timeout: 90_000,
      env: { ...process.env, ENJOY_E2E_USERDATA: mkdtempSync(join(tmpdir(), "enjoy-io-")) } }
  )
  const line = out.split("\n").find((l) => l.startsWith("RESULT "))
  assert.ok(line, out)
  return JSON.parse(line.slice(7))
}

const r = run()

test("本轮只图：开跑的模型消息以这条用户句（占位）结尾，不被剪掉", () => {
  assert.deepEqual(r.image.roles, ["user", "assistant", "user"])
  assert.equal(r.image.lastPlaceholder, true)
})

test("对照：本轮没附件的空句照旧剪掉", () => {
  assert.deepEqual(r.none.roles, ["user", "assistant"])
})
