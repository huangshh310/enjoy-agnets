/**
 * 「从这里重来」弹窗接线（leo MUST-FIX）：组件的按钮 disabled / onClick、错误句都从 controller 出，这里直接驱动 controller。
 * - 重试跑着的时候：「去审查」disabled，且直接调 goReview / 点它都什么都不做（S1b / S1c / S1d）。
 * - 重来抛错：界面只有通用句「从这里重来失败」，原始错误不出现在任何渲染内容里，只进一次日志（S7a + 不重复打日志）。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { zhChat } from "../../../../i18n/catalogs/zh/chat.ts"
import { enChat } from "../../../../i18n/catalogs/en/chat.ts"
import { zhCommon } from "../../../../i18n/catalogs/zh/common.ts"
import { enCommon } from "../../../../i18n/catalogs/en/common.ts"
import { translate } from "../../../../i18n/lookup.ts"
import type { RewindRunResult } from "./rewind-dialog-view.ts"
import { createRewindDialogController, type RewindDialogModel } from "./rewind-dialog-controller.ts"

const catalogs = {
  zh: { chat: zhChat, common: zhCommon },
  en: { chat: enChat, common: enCommon }
} as const
const tFor = (lang: "zh" | "en") => (key: string, vars?: Record<string, string | number>) =>
  translate(catalogs[lang], key, vars)

const GENERIC = { zh: "从这里重来失败", en: "Could not rewind from here" } as const

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function harness(rewind: (input: { restoreFiles: boolean; confirmDeleteUntracked?: boolean }) => Promise<RewindRunResult>) {
  const calls = { close: 0, review: 0, rewind: 0 }
  const controller = createRewindDialogController({
    rewind: (input) => {
      calls.rewind += 1
      return rewind(input)
    },
    onClose: () => {
      calls.close += 1
    },
    revealReview: () => {
      calls.review += 1
    }
  })
  return { controller, calls }
}

const gitModel = (c: ReturnType<typeof harness>["controller"], lang: "zh" | "en" = "zh"): RewindDialogModel =>
  c.model({ canRestoreFiles: true, gitRepo: true, t: tFor(lang) })

const footer = (m: RewindDialogModel, id: string) => {
  const button = m.buttons.find((b) => b.id === id)
  assert.ok(button, `button ${id}`)
  return button
}

async function quietly<T>(fn: (warns: unknown[][]) => Promise<T>): Promise<T> {
  const warn = console.warn
  const warns: unknown[][] = []
  console.warn = (...args: unknown[]) => {
    warns.push(args)
  }
  try {
    return await fn(warns)
  } finally {
    console.warn = warn
  }
}

test("S1 重试跑着的时候：「去审查」disabled，点它 / 直接调 goReview 都不收窗、不开右栏；结果回来后恢复可点", async () => {
  await quietly(async () => {
    const pending = deferred<RewindRunResult>()
    let first = true
    const { controller, calls } = harness(() => {
      if (first) {
        first = false
        return Promise.resolve({ ok: false, code: "REWIND_RESTORE_FAILED" })
      }
      return pending.promise
    })

    // 第一次：还原中途出错 → 琥珀色 +「去审查」，可点。
    footer(gitModel(controller), "restore-files").buttonProps.onClick()
    await new Promise((r) => setImmediate(r))
    let m = gitModel(controller)
    assert.equal(m.failure?.kind, "partial")
    assert.equal(m.failure?.review?.label, "去审查")
    assert.equal(m.failure?.review?.buttonProps.disabled, false, "idle: go-review enabled")

    // 重试：在跑。
    footer(m, "restore-files").buttonProps.onClick()
    m = gitModel(controller)
    assert.equal(controller.getSnapshot().busy, true)
    assert.equal(m.failure?.kind, "partial", "partial line stays while retrying")
    assert.equal(m.failure?.review?.buttonProps.disabled, true, "retrying: go-review disabled")
    for (const b of m.buttons) assert.equal(b.buttonProps.disabled, true, `retrying: ${b.id} disabled`)
    const enM = gitModel(controller, "en")
    assert.equal(enM.failure?.review?.buttonProps.disabled, true, "retrying: go-review disabled (en)")

    // 跑着的时候点「去审查」或直接调 goReview：什么都不做。
    m.failure?.review?.buttonProps.onClick()
    controller.goReview()
    assert.equal(calls.review, 0, "retrying: review pane not opened")
    assert.equal(calls.close, 0, "retrying: dialog not closed")
    // 跑着的时候再点也不会再跑一次。
    footer(m, "restore-files").buttonProps.onClick()
    assert.equal(calls.rewind, 2)

    // 结果回来（又是部分还原）→ 恢复可点，点了收窗 + 开右栏审查。
    pending.resolve({ ok: false, code: "REWIND_RESTORE_FAILED" })
    await new Promise((r) => setImmediate(r))
    m = gitModel(controller)
    assert.equal(controller.getSnapshot().busy, false)
    assert.equal(m.failure?.review?.buttonProps.disabled, false, "settled: go-review enabled")
    m.failure?.review?.buttonProps.onClick()
    assert.equal(calls.review, 1)
    assert.equal(calls.close, 1)
  })
})

test("S7 重来抛错：只显示通用句「从这里重来失败」，原始错误不在任何渲染内容里；原始错误只进一次日志", async () => {
  const secret = "EACCES: permission denied, open '/Users/me/secret/.git/index'"
  for (const lang of ["zh", "en"] as const) {
    for (const [label, rewind] of [
      ["reject", () => Promise.reject(new Error(secret))],
      [
        "sync throw",
        () => {
          throw new Error(secret)
        }
      ]
    ] as const) {
      await quietly(async (warns) => {
        const { controller, calls } = harness(rewind as () => Promise<RewindRunResult>)
        for (const id of ["chat-only", "restore-files"] as const) {
          // 不会变成未处理的 rejection：run 正常结束。
          await controller.run(id === "restore-files")
          const m = gitModel(controller, lang)
          assert.equal(m.error, GENERIC[lang], `${lang} ${label} ${id}: generic copy`)
          assert.equal(m.failure, null, `${lang} ${label} ${id}: no failure line`)
          assert.equal(m.stateKind, "confirm")
          const rendered = JSON.stringify(m)
          assert.ok(!rendered.includes("EACCES"), `${lang} ${label} ${id}: raw error not rendered`)
          assert.ok(!/secret|permission denied/i.test(rendered), `${lang} ${label} ${id}: raw error not rendered`)
          for (const b of m.buttons) assert.equal(b.buttonProps.disabled, false)
        }
        assert.equal(calls.close, 0, "dialog stays open")
        // 两次抛错 → 正好两条日志，每次一条，且带原始错误（只给开发者看）。
        assert.equal(warns.length, 2, `${lang} ${label}: logged once per failure, got ${JSON.stringify(warns.map(String))}`)
        for (const args of warns) {
          assert.ok(args.some((a) => a instanceof Error && a.message === secret), "raw error goes to the log")
        }
      })
    }
  }
})

test("其它失败（ok:false）也只打一次日志，只打 code", async () => {
  await quietly(async (warns) => {
    const { controller } = harness(async () => ({ ok: false, code: "TRUNCATE_RUN_ACTIVE" }))
    await controller.run(false)
    assert.equal(warns.length, 1)
    assert.deepEqual(warns[0], ["[rewind] failed: TRUNCATE_RUN_ACTIVE"])
    // 要二次确认不算失败，不打日志。
    const confirm = harness(async () => ({ ok: false, code: "CHECKPOINT_CONFIRM_REQUIRED", untrackedToDelete: ["a.txt"] }))
    await confirm.controller.run(true)
    assert.equal(warns.length, 1)
    assert.equal(gitModel(confirm.controller).stateKind, "untracked")
  })
})

test("成功：清回第一步并收窗；取消在跑的时候不收窗", async () => {
  const pending = deferred<RewindRunResult>()
  const { controller, calls } = harness(() => pending.promise)
  const run = controller.run(false)
  controller.close()
  assert.equal(calls.close, 0, "busy: cancel does not close")
  pending.resolve({ ok: true })
  await run
  assert.equal(calls.close, 1)
  assert.deepEqual(controller.getSnapshot(), { busy: false, untracked: undefined, failure: null, errorKey: null })
})

test("组件接线：按钮的 disabled / onClick 来自 controller", () => {
  const src = readFileSync(new URL("./rewind-from-here-dialog.tsx", import.meta.url), "utf8")
  // 弹窗只照 controller.model 摆，不自己拼 disabled / onClick / 错误句。
  assert.match(src, /createRewindDialogController\(/)
  assert.match(src, /controller\.model\(/)
  assert.match(src, /data-testid="rewind-go-review"[\s\S]*?\{\.\.\.view\.failure\.review\?\.buttonProps\}/)
  assert.match(src, /\{\.\.\.button\.buttonProps\}/)
  assert.match(src, /\{view\.error\}/)
  assert.doesNotMatch(src, /settleRewind|rewindDialogView|rewindOutcome|busyRef/, "run logic lives in the controller")
  assert.doesNotMatch(src, /disabled=\{busy\}|onClick=\{goReview\}/)
})
