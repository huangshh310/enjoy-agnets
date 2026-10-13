/**
 * leo soft：真跑 prepareAndPump（子进程 transform-types），开泵前抛错 → runs 行 failed + error、活 run 撤、发 run.error。
 */
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

test("prepareAndPump 开泵前抛错 → runs 行 failed", () => {
  const desktop = fileURLToPath(new URL("../../../", import.meta.url))
  const out = execFileSync(
    process.execPath,
    [
      "--experimental-transform-types",
      "--no-warnings",
      "--import",
      "./src/main/services/test-hooks/register.mjs",
      "./src/main/services/agent-run-prepare.behavior.child.ts"
    ],
    { cwd: desktop, encoding: "utf8", timeout: 60_000 }
  )
  const line = out.split("\n").find((l) => l.startsWith("RESULT "))
  assert.ok(line, out)
  const r = JSON.parse(line.slice(7)) as { row: { status: string; error: string | null }; active: boolean; runError: boolean }
  assert.equal(r.row.status, "failed")
  assert.ok(r.row.error)
  assert.equal(r.active, false)
  assert.equal(r.runError, true)
})
