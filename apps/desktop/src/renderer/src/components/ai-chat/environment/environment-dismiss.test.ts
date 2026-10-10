import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { shouldDismissEnvironment } from "./environment-dismiss.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("Esc 关环境卡；查找开着或已处理则让路", () => {
  assert.equal(shouldDismissEnvironment({ key: "Escape", defaultPrevented: false }), true)
  assert.equal(shouldDismissEnvironment({ key: "Escape", defaultPrevented: true }), false)
  assert.equal(
    shouldDismissEnvironment({ key: "Escape", defaultPrevented: false, findOpen: true }),
    false
  )
  assert.equal(shouldDismissEnvironment({ key: "Enter", defaultPrevented: false }), false)
})

test("舞台在 Esc / 换会话 / 换路由时关掉环境卡", () => {
  const hook = readFileSync(join(dir, "use-environment-dismiss.ts"), "utf8")
  const stage = readFileSync(join(dir, "../../app-shell/chat/chat-stage.tsx"), "utf8")
  assert.ok(hook.includes("shouldDismissEnvironment"))
  assert.ok(hook.includes("sessionId"))
  assert.ok(hook.includes("pathname"))
  assert.ok(stage.includes("useEnvironmentDismiss"))
})
