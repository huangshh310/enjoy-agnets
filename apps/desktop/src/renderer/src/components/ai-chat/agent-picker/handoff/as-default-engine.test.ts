/**
 * 「设为主引擎」：noop / 确认交接都要把 asDefault 写进偏好。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const dir = dirname(fileURLToPath(import.meta.url))

test("noop 与 confirm 都把 asDefault 传给 persistRuntimeId", () => {
  const store = readFileSync(join(dir, "engine-handoff-store.ts"), "utf8")
  const persist = readFileSync(
    join(dir, "../../../../hooks/persist-runtime.ts"),
    "utf8"
  )
  assert.match(store, /if \(plan\.kind === "noop"\)/)
  assert.match(store, /opts\?\.asDefault/)
  assert.match(store, /persistRuntimeId\(to, modelId, opts\)/)
  assert.match(store, /state\.asDefault \? \{ asDefault: true \}/)
  assert.match(persist, /if \(opts\?\.asDefault\)/)
  assert.match(persist, /applyPreferredRuntime\(store, runtimeId\)/)
  assert.match(persist, /patchPreferences\(\{ runtimeId \}\)/)
})
