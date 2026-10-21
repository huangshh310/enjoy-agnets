/**
 * 「从这里重来」弹窗接线（leo MUST-FIX）：组件的按钮 disabled / onClick、错误句都从 controller 出，这里直接驱动 controller。
 * - 重试跑着的时候：「去审查」disabled，且直接调 goReview / 点它都什么都不做（S1b / S1c / S1d）。
 * - 重来抛错：界面只有通用句「从这里重来失败」，原始错误不出现在任何渲染内容里，只进一次日志（S7a + 不重复打日志）。
 * - 引擎不支持回滚：消息上的入口整个不出，不是置灰、没有提示（luna）。
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
import {
  createRewindDialogController,
  REWIND_HANG_TIMEOUT_MS,
  rewindDialogDeps,
  rewindEntryAction,
  type RewindDialogModel
} from "./rewind-dialog-controller.ts"

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

function harness(
  rewind: (input: { restoreFiles: boolean; confirmDeleteUntracked?: boolean }) => Promise<RewindRunResult>,
  timeoutMs?: number
) {
  const calls = { close: 0, review: 0, rewind: 0 }
  const controller = createRewindDialogController({
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
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
  assert.deepEqual(controller.getSnapshot(), { busy: false, busyButton: null, pending: false, untracked: undefined, failure: null, errorKey: null })
})

test("引擎不支持回滚：消息上的「从这里重来」入口不出（不是置灰、没有提示）；支持时出且可点", () => {
  for (const lang of ["zh", "en"] as const) {
    const t = tFor(lang)
    assert.equal(rewindEntryAction({ canRewind: false, disabled: false, t }), null, `${lang} unsupported: hidden`)
    assert.equal(rewindEntryAction({ canRewind: false, disabled: true, t }), null, `${lang} unsupported+disabled: hidden`)
    const entry = rewindEntryAction({ canRewind: true, disabled: false, t })
    assert.ok(entry, `${lang} supported: visible`)
    assert.equal(entry.disabled, false)
    assert.equal(entry.label, t("chat.rewindTitle"))
    assert.equal(entry.tooltip, t("chat.rewindTitle"))
  }
})

test("组件接线：按钮的 disabled / onClick 来自 controller，入口按 rewindEntryAction 决定出不出", () => {
  const src = readFileSync(new URL("./rewind-from-here-dialog.tsx", import.meta.url), "utf8")
  // 弹窗只照 controller.model 摆，不自己拼 disabled / onClick / 错误句。
  assert.match(src, /createRewindDialogController\(/)
  assert.match(src, /controller\.model\(/)
  assert.match(src, /data-testid="rewind-go-review"[\s\S]*?\{\.\.\.view\.failure\.review\?\.buttonProps\}/)
  assert.match(src, /\{\.\.\.button\.buttonProps\}/)
  assert.match(src, /\{view\.error\}/)
  assert.doesNotMatch(src, /settleRewind|rewindDialogView|rewindOutcome|busyRef/, "run logic lives in the controller")
  assert.doesNotMatch(src, /disabled=\{busy\}|onClick=\{goReview\}/)
  // 入口：不支持就 return null，不再有「当前引擎不能回滚对话」的置灰提示。
  assert.match(src, /const entry = rewindEntryAction\(\{ canRewind, disabled, t \}\)\s*\n\s*if \(!entry\) return null/)
  assert.doesNotMatch(src, /rewindUnsupported/)
})

test("组件接线（leo soft 6）：展开 controller 的 buttonProps 之后，同一个元素上不准再写 onClick / disabled（会盖掉 controller）", () => {
  const src = readFileSync(new URL("./rewind-from-here-dialog.tsx", import.meta.url), "utf8")
  for (const spread of ["\\{\\.\\.\\.button\\.buttonProps\\}", "\\{\\.\\.\\.view\\.failure\\.review\\?\\.buttonProps\\}"]) {
    // 从展开处到这个元素的开标签结束（第一个不在花括号里的 >）之间，不能有 onClick= / disabled=。
    const at = new RegExp(spread).exec(src)
    assert.ok(at, `spread ${spread} present`)
    const rest = src.slice(at.index + at[0].length)
    const tagEnd = rest.search(/^\s*\/?>/m)
    const afterSpread = rest.slice(0, tagEnd >= 0 ? tagEnd + rest.slice(tagEnd).indexOf(">") : rest.length)
    assert.doesNotMatch(afterSpread, /\b(onClick|disabled|onPointerDown|onMouseDown)\s*=/, `nothing overrides ${spread}`)
  }
  // 两颗按钮各只有一处 onClick / disabled 来源：controller 的展开（tsx 里不出现字面的 disabled= / onClick=，入口除外）。
  const footer = src.slice(src.indexOf("<DialogFooter"), src.indexOf("</DialogFooter>"))
  assert.doesNotMatch(footer, /\b(onClick|disabled)\s*=/, "footer buttons take onClick / disabled only from the spread")
  const review = src.slice(src.indexOf('data-testid="rewind-go-review"'), src.indexOf("{view.failure.review?.label}"))
  assert.doesNotMatch(review, /\b(onClick|disabled)\s*=/, "go-review takes onClick / disabled only from the spread")
})

test("组件接线（leo soft 7）：deps 来自 rewindDialogDeps，rewind 接到这一条消息的 rewindFromUserTurn", () => {
  const src = readFileSync(new URL("./rewind-from-here-dialog.tsx", import.meta.url), "utf8")
  assert.match(src, /const deps = rewindDialogDeps\(\{\s*messageId,\s*rewindFromUserTurn,\s*onOpenChange,/)
  assert.match(src, /createRewindDialogController\(deps\)/)
  assert.match(src, /controller\.setDeps\(deps\)/)
  assert.doesNotMatch(src, /rewind:\s*\(/, "no hand-rolled rewind dep in the component")
})

test("deps.rewind：userMessageId 固定为这条消息，restoreFiles / confirmDeleteUntracked 原样透传；onClose 收窗；revealReview 透传", async () => {
  const seen: unknown[] = []
  const open: boolean[] = []
  let reviews = 0
  const deps = rewindDialogDeps({
    messageId: "msg_42",
    rewindFromUserTurn: async (input) => {
      seen.push(input)
      return { ok: false, code: "CHECKPOINT_CONFIRM_REQUIRED", untrackedToDelete: ["a.txt"] }
    },
    onOpenChange: (next) => void open.push(next),
    revealReview: () => {
      reviews += 1
    }
  })
  assert.deepEqual(await deps.rewind({ restoreFiles: true }), {
    ok: false,
    code: "CHECKPOINT_CONFIRM_REQUIRED",
    untrackedToDelete: ["a.txt"]
  })
  await deps.rewind({ restoreFiles: true, confirmDeleteUntracked: true })
  await deps.rewind({ restoreFiles: false })
  assert.deepEqual(seen, [
    { userMessageId: "msg_42", restoreFiles: true, confirmDeleteUntracked: undefined },
    { userMessageId: "msg_42", restoreFiles: true, confirmDeleteUntracked: true },
    { userMessageId: "msg_42", restoreFiles: false, confirmDeleteUntracked: undefined }
  ])
  deps.onClose()
  assert.deepEqual(open, [false])
  deps.revealReview()
  assert.equal(reviews, 1)

  // 经 controller 点按钮：每颗按钮把对的参数交给这条消息。
  const viaButtons: unknown[] = []
  const controller = createRewindDialogController(
    rewindDialogDeps({
      messageId: "msg_7",
      rewindFromUserTurn: async (input) => {
        viaButtons.push(input)
        return { ok: false, code: "CHECKPOINT_CONFIRM_REQUIRED", untrackedToDelete: ["n.txt"] }
      },
      onOpenChange: () => undefined,
      revealReview: () => undefined
    })
  )
  footer(gitModel(controller), "restore-files").buttonProps.onClick()
  await new Promise((r) => setImmediate(r))
  footer(gitModel(controller), "delete-and-restore").buttonProps.onClick()
  await new Promise((r) => setImmediate(r))
  assert.deepEqual(viaButtons, [
    { userMessageId: "msg_7", restoreFiles: true, confirmDeleteUntracked: undefined },
    { userMessageId: "msg_7", restoreFiles: true, confirmDeleteUntracked: true }
  ])
})

test("跑着的时候：点的那颗按钮转圈 +「正在还原…」/ Restoring…，其余按钮 disabled 且不转圈；结束后复原", async () => {
  const pending = deferred<RewindRunResult>()
  const { controller } = harness(() => pending.promise)
  footer(gitModel(controller), "restore-files").buttonProps.onClick()
  for (const [lang, label] of [["zh", "正在还原…"], ["en", "Restoring…"]] as const) {
    const m = gitModel(controller, lang)
    const restore = footer(m, "restore-files")
    assert.equal(restore.busy, true, `${lang} clicked button busy`)
    assert.equal(restore.label, label)
    assert.equal(restore.buttonProps.disabled, true)
    for (const id of ["cancel", "chat-only"]) {
      const b = footer(m, id)
      assert.equal(b.busy, false, `${lang} ${id} not spinning`)
      assert.equal(b.buttonProps.disabled, true, `${lang} ${id} disabled`)
      assert.notEqual(b.label, label)
    }
  }
  pending.resolve({ ok: false, code: "CHECKPOINT_CONFIRM_REQUIRED", untrackedToDelete: ["a.txt"] })
  await new Promise((r) => setImmediate(r))
  const m = gitModel(controller)
  assert.equal(controller.getSnapshot().busyButton, null)
  for (const b of m.buttons) assert.equal(b.busy, false)
})

test("重来的 IPC 卡住不回：超时后 busy 放开、显示通用失败句、弹窗能关；第一次没回来前只有「取消」能点（leo #167），晚到的失败不改界面、之后按钮恢复", async () => {
  assert.ok(REWIND_HANG_TIMEOUT_MS >= 10_000 && REWIND_HANG_TIMEOUT_MS <= 60_000, "default timeout sensible")
  await quietly(async (warns) => {
    const hang = deferred<RewindRunResult>()
    const { controller, calls } = harness(() => hang.promise, 20)
    const run = controller.run(false, undefined, "chat-only")
    assert.equal(controller.getSnapshot().busy, true)
    controller.close()
    assert.equal(calls.close, 0, "busy: cannot close yet")
    await run
    assert.equal(controller.getSnapshot().busy, false, "busy reset after timeout")
    let m = gitModel(controller)
    assert.equal(m.error, GENERIC.zh)
    assert.equal(controller.getSnapshot().pending, true, "first call still in flight")
    for (const b of m.buttons) {
      assert.equal(b.buttonProps.disabled, b.id !== "cancel", `${b.id}: only cancel clickable while first call runs`)
    }
    assert.deepEqual(warns, [["[rewind] failed: REWIND_TIMEOUT"]])
    // 晚到的失败：不改界面；之后按钮恢复。
    hang.resolve({ ok: false, code: "TRUNCATE_RUN_ACTIVE" })
    await new Promise((r) => setImmediate(r))
    m = gitModel(controller)
    assert.equal(m.error, GENERIC.zh)
    assert.equal(controller.getSnapshot().pending, false)
    for (const b of m.buttons) assert.equal(b.buttonProps.disabled, false, `${b.id} enabled after first call settled`)
    controller.close()
    assert.equal(calls.close, 1, "dialog can close")
  })
})

test("卡住超时之后晚到的成功：对话已截、原话已写回 → 收窗", async () => {
  await quietly(async () => {
    const hang = deferred<RewindRunResult>()
    const { controller, calls } = harness(() => hang.promise, 10)
    await controller.run(false)
    assert.equal(controller.getSnapshot().busy, false)
    hang.resolve({ ok: true })
    await new Promise((r) => setImmediate(r))
    assert.equal(calls.close, 1)
  })
})

test("消息上的入口（leo E5）：user-turn 按当前会话引擎的能力算 canRewind，不准写死", () => {
  const src = readFileSync(new URL("./user-turn.tsx", import.meta.url), "utf8")
  assert.match(src, /const runtimeId = useChatStore\(\(s\) => s\.runtimeId\)/)
  assert.match(src, /const canRewind = canRewindConversation\(runtimeId\)/)
  const entries = [...src.matchAll(/<RewindFromHereAction[^>]*>/g)].map((m) => m[0])
  assert.equal(entries.length, 1)
  assert.match(entries[0]!, /canRewind=\{canRewind\}/)
  assert.doesNotMatch(src, /canRewind=\{(true|!0|1)\}|canRewind\s*\/?>|canRewind=\{[^}]*\|\|/, "no hard-coded / defaulted canRewind")
  assert.doesNotMatch(src, /const canRewind = (true|!0)/)
})

// r3（leo）：写回抛错时原话还在「待放回」记录里、不在草稿里——toast 不能说「原话在草稿里」。
const FINISH_TOAST = {
  zh: "已回到这里，但还没能放回输入框。原话已保存，会放回这个对话的输入框或草稿。",
  en: "Rewound to here, but your message isn't back in the composer yet. It's saved and will go back into this chat's composer or draft."
} as const

/** 接上 rewindDialogDeps（真实接线），toast 记下来。 */
function wiredHarness(rewind: () => Promise<RewindRunResult>, lang: "zh" | "en", timeoutMs?: number) {
  const calls = { close: 0, rewind: 0, review: 0, toasts: [] as string[] }
  const deps = rewindDialogDeps({
    messageId: "u2",
    rewindFromUserTurn: () => {
      calls.rewind += 1
      return rewind()
    },
    onOpenChange: (open) => {
      if (!open) calls.close += 1
    },
    revealReview: () => {
      calls.review += 1
    },
    toast: (message) => void calls.toasts.push(message),
    t: tFor(lang)
  })
  const controller = createRewindDialogController({ ...deps, ...(timeoutMs !== undefined ? { timeoutMs } : {}) })
  return { controller, calls }
}

test("#167 ③：截断成功但原话没放回输入框（REWIND_FINISH_FAILED）→ 收窗 + toast（中英定稿），不显示「从这里重来失败」", async () => {
  for (const lang of ["zh", "en"] as const) {
    await quietly(async () => {
      const { controller, calls } = wiredHarness(async () => ({ ok: false, code: "REWIND_FINISH_FAILED" }), lang)
      await controller.run(false, undefined, "chat-only")
      assert.equal(calls.close, 1, `${lang}: dialog closed`)
      assert.deepEqual(calls.toasts, [FINISH_TOAST[lang]], `${lang}: toast copy`)
      const m = controller.model({ canRestoreFiles: true, gitRepo: true, t: tFor(lang) })
      assert.equal(m.error, null, `${lang}: no generic failure line`)
      assert.notEqual(m.error, GENERIC[lang])
    })
  }
})

test("#167 ③：超时之后晚到的 REWIND_FINISH_FAILED 也收窗 + toast", async () => {
  await quietly(async () => {
    const hang = deferred<RewindRunResult>()
    const { controller, calls } = wiredHarness(() => hang.promise, "zh", 10)
    await controller.run(false)
    assert.equal(calls.close, 0)
    hang.resolve({ ok: false, code: "REWIND_FINISH_FAILED" })
    await new Promise((r) => setImmediate(r))
    assert.equal(calls.close, 1)
    assert.deepEqual(calls.toasts, [FINISH_TOAST.zh])
  })
})

test("#167：原话进了原来那个对话的草稿（draftSessionId）→ 收窗 + 小 toast；普通成功不弹", async () => {
  const a = wiredHarness(async () => ({ ok: true, draftSessionId: "ses_a" }), "zh")
  await a.controller.run(false)
  assert.equal(a.calls.close, 1)
  assert.deepEqual(a.calls.toasts, ["原话放回了原来那个对话的草稿里。"])
  const b = wiredHarness(async () => ({ ok: true }), "en")
  await b.controller.run(false)
  assert.equal(b.calls.close, 1)
  assert.deepEqual(b.calls.toasts, [])
})

test("#167：超时后第一次调用没回来前，再点「连文件一起还原」/「删掉并还原」/「只改聊天」/ 去审查都不会再跑（不并发还原）；只有取消能关", async () => {
  await quietly(async () => {
    const hang = deferred<RewindRunResult>()
    const { controller, calls } = harness(() => hang.promise, 10)
    await controller.run(true, undefined, "restore-files")
    assert.equal(calls.rewind, 1)
    for (const id of ["restore-files", "chat-only", "delete-and-restore", "start-over"] as const) controller.onButton(id)
    await controller.run(true, true, "delete-and-restore")
    controller.goReview()
    await new Promise((r) => setImmediate(r))
    assert.equal(calls.rewind, 1, "no second rewind while the first is in flight")
    assert.equal(calls.review, 0, "review blocked while the first is in flight")
    const m = gitModel(controller)
    assert.deepEqual(
      m.buttons.map((b) => [b.id, b.buttonProps.disabled]),
      [["cancel", false], ["restore-files", true], ["chat-only", true]]
    )
    // 第一次回来之后才能再跑。
    hang.resolve({ ok: false, code: "TRUNCATE_RUN_ACTIVE" })
    await new Promise((r) => setImmediate(r))
    const again = controller.run(false, undefined, "chat-only")
    assert.equal(calls.rewind, 2)
    await again
    controller.onButton("cancel")
    assert.equal(calls.close, 1)
  })
})

test("#167：超时后第一次没回来前点取消能关窗", async () => {
  await quietly(async () => {
    const hang = deferred<RewindRunResult>()
    const { controller, calls } = harness(() => hang.promise, 10)
    await controller.run(false, undefined, "chat-only")
    controller.onButton("cancel")
    assert.equal(calls.close, 1)
    hang.resolve({ ok: true })
    await new Promise((r) => setImmediate(r))
  })
})

test("#167 r3：同会话正在输入、原话稍后放回（writebackPending）→ 立刻收窗 + 中性 toast，不显示失败句", async () => {
  for (const [lang, copy] of [
    ["zh", "已回到这里，原话稍后放回输入框。"],
    ["en", "Rewound to here. Your message will go back into the composer in a moment."]
  ] as const) {
    const { controller, calls } = wiredHarness(async () => ({ ok: true, writebackPending: true }), lang)
    await controller.run(false, undefined, "chat-only")
    assert.equal(calls.close, 1, `${lang}: closed`)
    assert.deepEqual(calls.toasts, [copy])
    assert.equal(controller.model({ canRestoreFiles: true, gitRepo: true, t: tFor(lang) }).error, null)
  }
})
