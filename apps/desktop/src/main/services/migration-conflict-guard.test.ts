import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  BUTTON_COPY,
  BUTTON_OPEN_FOLDER,
  BUTTON_QUIT,
  conflictDialogOptions,
  conflictLocale,
  openDatabaseOrExit,
  type MessageBoxOptions
} from "./migration-conflict-guard.ts"

const RAW = "MIGRATION_VERSION_CONFLICT: v17 applied as other-pr-v17, expected misbackfilled-file-parts"

function run(choices: number[], open: () => unknown = () => { throw new Error(RAW) }) {
  const calls: string[] = []
  const shown: MessageBoxOptions[] = []
  let clip = ""
  const ok = openDatabaseOrExit({
    open,
    showMessageBoxSync: (o) => {
      shown.push(o)
      const next = choices.shift()
      assert.notEqual(next, undefined, "对话框应在退出后停止")
      return next!
    },
    writeClipboard: (t) => {
      clip = t
      calls.push("copy")
    },
    openPath: (p) => void calls.push(`open:${p}`),
    exit: (c) => void calls.push(`exit:${c}`),
    userDataPath: "/ud",
    dbPath: "/ud/app.db",
    appVersion: "0.1.8",
    locale: "zh"
  })
  return { ok, calls, shown, clip }
}

test("luna：对话框文案 / 按钮 / 回车=退出；正文不含「迁移」和原始错误", () => {
  const zh = conflictDialogOptions("zh")
  assert.equal(zh.title, "Enjoy 打不开本地数据")
  assert.equal(zh.message, "Enjoy 打不开本地数据")
  assert.equal(
    zh.detail,
    "这份数据来自另一个测试版，和当前版本对不上。为了保护你的对话，已停止打开。数据没有被改动。可以换回原来的版本打开，或把详情发给我们。"
  )
  assert.equal(zh.type, "warning")
  for (const b of zh.buttons) assert.match(b, /^[\u4e00-\u9fff]+$/, `中文按钮：${b}`)
  assert.deepEqual(zh.buttons, ["复制详情", "打开数据文件夹", "退出"])
  assert.equal(zh.buttons[zh.defaultId], "退出")
  assert.equal(zh.cancelId, BUTTON_QUIT)
  for (const opts of [zh, conflictDialogOptions("en")]) {
    const text = `${opts.title}\n${opts.message}\n${opts.detail ?? ""}`
    assert.doesNotMatch(text, /迁移|migration|MIGRATION_VERSION_CONFLICT|v17/i)
  }
  const en = conflictDialogOptions("en")
  assert.equal(en.title, "Enjoy can't open your local data")
  assert.match(en.detail, /To protect your conversations, Enjoy stopped opening\./)
  for (const opts of [zh, en]) {
    assert.ok(opts.title && !/^error$/i.test(opts.title), "窗口标题显式给出，不是 Error")
    assert.ok(!opts.buttons.some((b) => /^ok$/i.test(b)))
  }
  assert.deepEqual(en.buttons, ["Copy details", "Open data folder", "Quit"])
  assert.equal(en.buttons[en.defaultId], "Quit")
  assert.equal(conflictLocale(undefined, "en-US"), "en")
  assert.equal(conflictLocale(undefined, "zh-CN"), "zh")
  assert.equal(conflictLocale("zh", "en-US"), "zh")
})

test("luna：复制详情 → 剪贴板拿到原始错误 + 版本 + 库路径，回到对话框；打开文件夹后也回来；退出 → exit 1", () => {
  const r = run([BUTTON_COPY, BUTTON_OPEN_FOLDER, BUTTON_QUIT])
  assert.equal(r.ok, false)
  assert.equal(r.shown.length, 3)
  assert.deepEqual(r.calls, ["copy", "open:/ud", "exit:1"])
  assert.match(r.clip, /MIGRATION_VERSION_CONFLICT: v17 applied as other-pr-v17, expected misbackfilled-file-parts/)
  assert.match(r.clip, /app version: 0\.1\.8/)
  assert.match(r.clip, /database: \/ud\/app\.db/)
})

test("直接退出 / 关窗（cancelId）→ exit 1；其它错误照抛；正常打开继续", () => {
  assert.deepEqual(run([BUTTON_QUIT]).calls, ["exit:1"])
  assert.throws(() => run([], () => { throw new Error("disk I/O error") }))
  assert.equal(run([], () => undefined).ok, true)
  const index = readFileSync(new URL("../index.ts", import.meta.url), "utf8")
  assert.match(index, /openDatabaseOrExit\(\{[\s\S]*?open: getDatabase,[\s\S]*?showMessageBoxSync[\s\S]*?clipboard\.writeText[\s\S]*?shell\.openPath[\s\S]*?\}\)\s*\) return/)
  assert.doesNotMatch(index, /showErrorBox/)
})
