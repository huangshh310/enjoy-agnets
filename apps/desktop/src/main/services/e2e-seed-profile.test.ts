/**
 * stub 夹具档案重启复用：同一 userData 重开不新增档案、不换 activeId。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { existingSeedProfileId } from "./e2e-seed-profile.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("按名 + 类型找到旧档 id；类型不同不算", () => {
  const rows = [
    { id: "prv_a", name: "E2E Stub", kind: "ollama" },
    { id: "prv_b", name: "E2E Stub Key", kind: "openai" },
    { id: "prv_c", name: "E2E Stub", kind: "openai" }
  ]
  assert.equal(existingSeedProfileId(rows, { name: "E2E Stub", kind: "ollama" }), "prv_a")
  assert.equal(existingSeedProfileId(rows, { name: "E2E Stub Key", kind: "openai" }), "prv_b")
  assert.equal(existingSeedProfileId(rows, { name: "E2E Stub Key", kind: "ollama" }), undefined)
  assert.equal(existingSeedProfileId([], { name: "E2E Stub", kind: "ollama" }), undefined)
})

test("两处种档都先查旧档再 upsert；账本会话不重复种", () => {
  const boot = readFileSync(join(dir, "e2e-bootstrap.ts"), "utf8")
  const ready = readFileSync(join(dir, "e2e-chat-ready-seed.ts"), "utf8")
  const ledger = readFileSync(join(dir, "e2e-stub-ledger.ts"), "utf8")
  assert.match(boot, /id: existingSeedProfileId\(vault\.profiles, \{ name: "E2E Stub", kind: "ollama" \}\)/)
  assert.match(ready, /existingSeedProfileId\(vault\.profiles, \{ name: "E2E Stub Key", kind: "openai" \}\)/)
  assert.match(ledger, /row\.title === E2E_LEDGER_SESSION_TITLE\)\) return/)
})
