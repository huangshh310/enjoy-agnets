import assert from "node:assert/strict"
import { test } from "node:test"
import { sanitizeInstallLog } from "./agent-tools-install-log.ts"

test("安装日志丢掉堆栈，保留短人话", () => {
  assert.equal(sanitizeInstallLog("   added 12 packages in 3s  "), "added 12 packages in 3s")
  assert.equal(sanitizeInstallLog("    at Module._compile (node:internal)"), null)
  assert.ok(sanitizeInstallLog("npm ERR! code EACCES")?.includes("EACCES"))
})
