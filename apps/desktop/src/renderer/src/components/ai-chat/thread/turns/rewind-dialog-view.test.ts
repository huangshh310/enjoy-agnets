/**
 * 「改到这里」弹窗（luna rewind-here）：单主钮 + 勾选默认关；中英文都不出现禁词。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { zhChat } from "../../../../i18n/catalogs/zh/chat.ts"
import { enChat } from "../../../../i18n/catalogs/en/chat.ts"
import { zhCommon } from "../../../../i18n/catalogs/zh/common.ts"
import { enCommon } from "../../../../i18n/catalogs/en/common.ts"
import { translate } from "../../../../i18n/lookup.ts"
import {
  rewindDialogView,
  rewindErrorKey,
  rewindFailureKind,
  rewindOutcome,
  settleRewind,
  REWIND_THREW,
  type RewindDialogState,
  type RewindDialogView
} from "./rewind-dialog-view.ts"

const catalogs = {
  zh: { chat: zhChat, common: zhCommon },
  en: { chat: enChat, common: enCommon }
} as const
const tFor = (lang: "zh" | "en") => (key: string, vars?: Record<string, string | number>) =>
  translate(catalogs[lang], key, vars)

const BANNED = /检查点|HEAD|commit|快照|checkpoint|撤销全部|回滚全部/i
const text = (v: RewindDialogView) =>
  [
    v.title,
    v.body,
    v.hint,
    v.checkbox?.label,
    v.checkbox?.hint,
    v.checkbox?.risk,
    v.checkbox?.note,
    v.failure?.text,
    v.failure?.reviewLabel,
    ...v.buttons.map((b) => b.label)
  ]
    .filter(Boolean)
    .join("\n")
const buttons = (v: RewindDialogView) => v.buttons.map((b) => `${b.id}:${b.variant}:${b.label}`)

const git = (checked = false, available: boolean | null = null): RewindDialogState => ({
  kind: "confirm",
  canRestoreFiles: true,
  gitRepo: true,
  failure: null,
  restoreFilesChecked: checked,
  fileRestoreAvailable: available
})
const notGit: RewindDialogState = {
  kind: "confirm",
  canRestoreFiles: true,
  gitRepo: false,
  failure: null,
  restoreFilesChecked: false,
  fileRestoreAvailable: null
}
const unknownGit: RewindDialogState = {
  kind: "confirm",
  canRestoreFiles: true,
  gitRepo: null,
  failure: null,
  restoreFilesChecked: false,
  fileRestoreAvailable: null
}
const NEUTRAL_ZH = "该点之后的对话会移除。这条助手回合对应的用户原话（若有）会放回输入框。改过的文件不会还原。"
const NEUTRAL_EN =
  "Everything after this point will be removed. The user message for this assistant turn (if any) goes back into the message box. File changes won't be undone."
const PARTIAL_ZH = "文件可能只还原了一部分。聊天没有改动，请到「审查」里核对。"
const PARTIAL_EN =
  "Files may have been only partly restored. The chat wasn't changed. Check Review to see where things stand."
const MISSING_ZH = "没能还原文件：找不到这一轮开始前的记录。聊天没有改动。"
const MISSING_EN =
  "Couldn't restore files: there's no record of how they looked before this turn. The chat wasn't changed."
const files = (n: number) => Array.from({ length: n }, (_, i) => `new-${i + 1}.txt`)

test("Git 工作区：单主钮「改到这里」+ 勾选默认关；无风险句", () => {
  const zh = rewindDialogView(git(false), tFor("zh"))
  assert.equal(zh.title, "改到这里？")
  assert.equal(
    zh.body,
    "该点之后的对话会移除。这条助手回合对应的用户原话（若有）会放回输入框，改好再发。"
  )
  assert.equal(zh.hint, null)
  assert.ok(zh.checkbox)
  assert.equal(zh.checkbox.checked, false)
  assert.equal(zh.checkbox.label, "连本轮文件一起还原")
  assert.equal(zh.checkbox.hint, "只动本轮相关改动，不是整仓回退。")
  assert.equal(zh.checkbox.risk, null)
  assert.equal(zh.checkbox.disabled, false)
  assert.deepEqual(buttons(zh), ["cancel:outline:取消", "confirm:default:改到这里"])
  const en = rewindDialogView(git(false), tFor("en"))
  assert.equal(en.title, "Edit from here?")
  assert.equal(en.checkbox?.label, "Also restore this turn's files")
  assert.deepEqual(buttons(en), ["cancel:outline:Cancel", "confirm:default:Edit from here"])
})

test("Git 勾选开：同层风险句 + 主钮「改到这里并还原文件」", () => {
  const zh = rewindDialogView(git(true), tFor("zh"))
  assert.equal(zh.checkbox?.checked, true)
  assert.equal(
    zh.checkbox?.risk,
    "会按本轮记录还原相关文件；新建的未跟踪文件可能被删掉（删前还会再问）。"
  )
  assert.deepEqual(buttons(zh), ["cancel:outline:取消", "confirm:default:改到这里并还原文件"])
  const en = rewindDialogView(git(true), tFor("en"))
  assert.deepEqual(buttons(en), ["cancel:outline:Cancel", "confirm:default:Edit from here and restore files"])
})

test("无本轮文件记录：勾选禁用 + 诚实说明，主钮仍只撤对话", () => {
  const zh = rewindDialogView(git(true, false), tFor("zh"))
  assert.equal(zh.checkbox?.disabled, true)
  assert.equal(zh.checkbox?.checked, false)
  assert.equal(zh.checkbox?.note, "这轮没有可还原的文件记录，只能撤对话。")
  assert.equal(zh.checkbox?.risk, null)
  assert.deepEqual(buttons(zh), ["cancel:outline:取消", "confirm:default:改到这里"])
})

test("gitRepo 还不知道（null）：隐藏勾选，取消 · 改到这里，中性正文", () => {
  const zh = rewindDialogView(unknownGit, tFor("zh"))
  assert.equal(zh.title, "改到这里？")
  assert.equal(zh.body, NEUTRAL_ZH)
  assert.equal(zh.checkbox, null)
  assert.deepEqual(buttons(zh), ["cancel:outline:取消", "confirm:default:改到这里"])
  const en = rewindDialogView(unknownGit, tFor("en"))
  assert.equal(en.body, NEUTRAL_EN)
  assert.deepEqual(buttons(en), ["cancel:outline:Cancel", "confirm:default:Edit from here"])
})

test("引擎不支持文件还原：隐藏勾选，中性正文；明确非 Git 仍用「没用 Git 管理」那句", () => {
  for (const gitRepo of [true, null] as const) {
    const zh = rewindDialogView(
      {
        kind: "confirm",
        canRestoreFiles: false,
        gitRepo,
        failure: null,
        restoreFilesChecked: false,
        fileRestoreAvailable: null
      },
      tFor("zh")
    )
    assert.equal(zh.body, NEUTRAL_ZH, String(gitRepo))
    assert.equal(zh.checkbox, null, String(gitRepo))
    assert.deepEqual(buttons(zh), ["cancel:outline:取消", "confirm:default:改到这里"], String(gitRepo))
  }
  const plain = rewindDialogView(
    {
      kind: "confirm",
      canRestoreFiles: false,
      gitRepo: false,
      failure: null,
      restoreFilesChecked: false,
      fileRestoreAvailable: null
    },
    tFor("zh")
  )
  assert.match(plain.body, /没用 Git 管理/)
})

test("非 Git 工作区：没有勾选，取消 · 改到这里", () => {
  const zh = rewindDialogView(notGit, tFor("zh"))
  assert.equal(zh.title, "改到这里？")
  assert.match(zh.body, /没用 Git 管理/)
  assert.equal(zh.checkbox, null)
  assert.deepEqual(buttons(zh), ["cancel:outline:取消", "confirm:default:改到这里"])
})

test("二次确认：固定人话标题 + 删掉并还原是 danger", () => {
  const zh = rewindDialogView({ kind: "untracked", files: files(3) }, tFor("zh"))
  assert.equal(zh.title, "这些新文件会删掉，删了找不回")
  assert.equal(zh.body, "本轮开始后新出现的文件（含你自己新建的），还原时会删掉：")
  assert.deepEqual(zh.files, files(3))
  assert.equal(zh.moreCount, 0)
  assert.deepEqual(buttons(zh), ["cancel:outline:取消", "delete-and-restore:destructive:删掉并还原"])
  const en = rewindDialogView({ kind: "untracked", files: files(3) }, tFor("en"))
  assert.equal(en.title, "These new files will be deleted and can't be recovered")
  assert.deepEqual(buttons(en), ["cancel:outline:Cancel", "delete-and-restore:destructive:Delete and restore"])
})

test("二次确认 N>5：只列 5 个，其余折成「还有 N 个」", () => {
  const v = rewindDialogView({ kind: "untracked", files: files(8) }, tFor("zh"))
  assert.deepEqual(v.files, files(5))
  assert.equal(v.moreCount, 3)
})

test("二次确认拿不到 N：标题仍是固定人话", () => {
  for (const missing of [null, []]) {
    const zh = rewindDialogView({ kind: "untracked", files: missing }, tFor("zh"))
    assert.equal(zh.title, "这些新文件会删掉，删了找不回")
    assert.deepEqual(zh.files, [])
  }
})

test("找不到记录（什么都没改）：灰色兜底句，没有「去审查」", () => {
  const zh = rewindDialogView({ ...git(), failure: "missing" }, tFor("zh"))
  assert.deepEqual(zh.failure, { kind: "missing", text: MISSING_ZH, reviewLabel: null, reviewDisabled: false })
})

test("还原中途出错：琥珀色 +「去审查」", () => {
  const zh = rewindDialogView({ ...git(), failure: "partial" }, tFor("zh"))
  assert.deepEqual(zh.failure, { kind: "partial", text: PARTIAL_ZH, reviewLabel: "去审查", reviewDisabled: false })
  assert.equal(rewindFailureKind("REWIND_RESTORE_FAILED"), "partial")
  for (const code of ["REWIND_NO_CHECKPOINT", "REWIND_NO_WORKSPACE", "REWIND_LIST_FAILED", "CHECKPOINT_RESTORE_FAILED"]) {
    assert.equal(rewindFailureKind(code), "missing", code)
  }
})

test("rewindOutcome：结果 → 弹窗下一步", () => {
  assert.deepEqual(rewindOutcome({ ok: true }, true), { kind: "close" })
  assert.deepEqual(
    rewindOutcome({ ok: false, code: "CHECKPOINT_CONFIRM_REQUIRED", untrackedToDelete: ["a.txt"] }, true),
    { kind: "untracked", files: ["a.txt"] }
  )
  assert.deepEqual(rewindOutcome({ ok: false, code: "REWIND_RESTORE_FAILED" }, true), {
    kind: "failure",
    failure: "partial"
  })
  assert.deepEqual(rewindOutcome({ ok: false, code: "REWIND_NO_CHECKPOINT" }, true), {
    kind: "failure",
    failure: "missing"
  })
  assert.deepEqual(rewindOutcome({ ok: false, code: "REWIND_BUSY" }, true), {
    kind: "error",
    messageKey: "chat.rewindBusy"
  })
})

test("原始错误文本当成 code：界面只拿到固定文案", () => {
  const raw = "Error invoking remote method 'session.truncateFrom': Error: SQLITE_BUSY"
  const outcome = rewindOutcome({ ok: false, code: raw }, false)
  assert.deepEqual(outcome, { kind: "error", messageKey: "chat.rewindFailed" })
  assert.equal(tFor("zh")("chat.rewindFailed"), "改到这里失败")
  assert.equal(rewindErrorKey("whatever"), "chat.rewindFailed")
})

test("中英文所有状态都不出现禁词", () => {
  const states: RewindDialogState[] = [
    git(false),
    git(true),
    git(false, false),
    notGit,
    unknownGit,
    { ...git(), failure: "missing" },
    { ...git(), failure: "partial" },
    { kind: "untracked", files: files(3) },
    { kind: "untracked", files: files(8) },
    { kind: "untracked", files: null }
  ]
  for (const lang of ["zh", "en"] as const) {
    for (const s of states) {
      assert.doesNotMatch(text(rewindDialogView(s, tFor(lang))), BANNED, `${lang} ${JSON.stringify(s)}`)
    }
    for (const [key, value] of Object.entries(catalogs[lang].chat)) {
      if (!key.startsWith("rewind") || typeof value !== "string") continue
      assert.doesNotMatch(value, BANNED, `${lang} chat.${key}`)
    }
  }
})

test("S1 重试跑着的时候「去审查」不能点", () => {
  const busy = rewindDialogView({ ...git(), failure: "partial" }, tFor("zh"), true)
  assert.equal(busy.failure?.reviewDisabled, true)
  const idle = rewindDialogView({ ...git(), failure: "partial" }, tFor("zh"), false)
  assert.equal(idle.failure?.reviewDisabled, false)
})

test("settleRewind 抛错收成 REWIND_THREW → 通用失败句", async () => {
  const warn = console.warn
  console.warn = () => undefined
  try {
    const result = await settleRewind(() => Promise.reject(new Error("secret")))
    assert.deepEqual(result, { ok: false, code: REWIND_THREW })
    assert.deepEqual(rewindOutcome(result, false), { kind: "error", messageKey: "chat.rewindFailed" })
  } finally {
    console.warn = warn
  }
})

test("入口文案：改到这里 / Edit from here", () => {
  assert.equal(tFor("zh")("chat.rewindTitle"), "改到这里")
  assert.equal(tFor("en")("chat.rewindTitle"), "Edit from here")
})

test("REWIND_PROVIDER_UNSUPPORTED 走通用失败句", () => {
  assert.deepEqual(rewindOutcome({ ok: false, code: "REWIND_PROVIDER_UNSUPPORTED" }, false), {
    kind: "error",
    messageKey: "chat.rewindFailed"
  })
  assert.equal("rewindUnsupported" in zhChat, false)
})
