import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { openDatabaseOrExit } from "./migration-conflict-guard.ts"

test("leo S1：迁移同号异名 → 弹错误框并退出；其它错误照抛；正常打开继续", () => {
  const calls: string[] = []
  const deps = (open: () => unknown) => ({
    open,
    showErrorBox: (title: string, body: string) => void calls.push(`box:${title}:${body.includes("v17") ? "v17" : ""}`),
    exit: (code: number) => void calls.push(`exit:${code}`)
  })
  assert.equal(
    openDatabaseOrExit(
      deps(() => {
        throw new Error("MIGRATION_VERSION_CONFLICT: v17 applied as x, expected y")
      })
    ),
    false
  )
  assert.deepEqual(calls, ["box:数据库版本冲突:v17", "exit:1"])
  assert.throws(() =>
    openDatabaseOrExit(
      deps(() => {
        throw new Error("disk I/O error")
      })
    )
  )
  assert.equal(openDatabaseOrExit(deps(() => undefined)), true)
  const index = readFileSync(new URL("../index.ts", import.meta.url), "utf8")
  assert.match(index, /openDatabaseOrExit\(\{[\s\S]*?open: getDatabase,[\s\S]*?showErrorBox[\s\S]*?\}\)\s*\) return/)
})
