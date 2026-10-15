/**
 * 「从这里重来」弹窗（luna 定稿）：各状态的文案、按钮顺序与样式；中英文都不出现禁词。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { zhChat } from "../../../../i18n/catalogs/zh/chat.ts"
import { enChat } from "../../../../i18n/catalogs/en/chat.ts"
import { zhCommon } from "../../../../i18n/catalogs/zh/common.ts"
import { enCommon } from "../../../../i18n/catalogs/en/common.ts"
import { translate } from "../../../../i18n/lookup.ts"
import {
  isRewindRestoreFailure,
  rewindDialogView,
  type RewindDialogState,
  type RewindDialogView
} from "./rewind-dialog-view.ts"

const catalogs = {
  zh: { chat: zhChat, common: zhCommon },
  en: { chat: enChat, common: enCommon }
} as const
const tFor = (lang: "zh" | "en") => (key: string, vars?: Record<string, string | number>) =>
  translate(catalogs[lang], key, vars)

const BANNED = /检查点|HEAD|commit|快照|checkpoint/i
const text = (v: RewindDialogView) => [v.title, v.body, v.hint, v.failure, ...v.buttons.map((b) => b.label)].join("\n")
const buttons = (v: RewindDialogView) => v.buttons.map((b) => `${b.id}:${b.variant}:${b.label}`)

const git: RewindDialogState = { kind: "confirm", canRestoreFiles: true, gitRepo: true, restoreFailed: false }
const notGit: RewindDialogState = { kind: "confirm", canRestoreFiles: true, gitRepo: false, restoreFailed: false }
const files = (n: number) => Array.from({ length: n }, (_, i) => `new-${i + 1}.txt`)

test("Git 工作区：标题 / 正文 / 灰字 / 取消 · 连文件一起还原（描边）· 只改聊天（主按钮最右）", () => {
  const zh = rewindDialogView(git, tFor("zh"))
  assert.equal(zh.title, "从这条消息重来？")
  assert.equal(zh.body, "这条消息和它之后的对话会移除，这条消息的内容会放回输入框，改好再发。")
  assert.equal(zh.hint, "文件也可以一起还原到这一轮开始前的样子。")
  assert.equal(zh.failure, null)
  assert.deepEqual(buttons(zh), ["cancel:outline:取消", "restore-files:outline:连文件一起还原", "chat-only:default:只改聊天"])
  const en = rewindDialogView(git, tFor("en"))
  assert.equal(en.title, "Start over from this message?")
  assert.equal(en.body, "This message and everything after it will be removed. Its text goes back into the input so you can edit and resend.")
  assert.equal(en.hint, "You can also restore files to how they were before this turn.")
  assert.deepEqual(buttons(en), ["cancel:outline:Cancel", "restore-files:outline:Restore files too", "chat-only:default:Chat only"])
})

test("gitRepo 还不知道（null）按 Git 处理：给还原按钮，失败有兜底", () => {
  const v = rewindDialogView({ ...git, gitRepo: null }, tFor("zh"))
  assert.deepEqual(v.buttons.map((b) => b.id), ["cancel", "restore-files", "chat-only"])
})

test("非 Git 工作区：没有还原按钮，取消 · 从这里重来", () => {
  const zh = rewindDialogView(notGit, tFor("zh"))
  assert.equal(zh.title, "从这条消息重来？")
  assert.equal(zh.body, "这条消息和它之后的对话会移除，内容放回输入框。这个文件夹没用 Git 管理，改过的文件不会还原。")
  assert.equal(zh.hint, null)
  assert.deepEqual(buttons(zh), ["cancel:outline:取消", "start-over:default:从这里重来"])
  const en = rewindDialogView(notGit, tFor("en"))
  assert.equal(en.body, "This message and everything after it will be removed. Its text goes back into the input. This folder isn't tracked by Git, so file changes won't be undone.")
  assert.deepEqual(buttons(en), ["cancel:outline:Cancel", "start-over:default:Start over"])
})

test("二次确认 N≤5：标题带 N、列全部文件、删掉并还原是 danger", () => {
  const zh = rewindDialogView({ kind: "untracked", files: files(3) }, tFor("zh"))
  assert.equal(zh.title, "还要删掉 3 个新文件？")
  assert.equal(zh.body, "这些文件是这一轮里新建的，还原会把它们删掉，删了找不回。")
  assert.deepEqual(zh.files, files(3))
  assert.equal(zh.moreCount, 0)
  assert.deepEqual(buttons(zh), ["cancel:outline:取消", "delete-and-restore:destructive:删掉并还原"])
  const en = rewindDialogView({ kind: "untracked", files: files(3) }, tFor("en"))
  assert.equal(en.title, "Also delete 3 new files?")
  assert.equal(en.body, "These were created in this turn. Restoring will delete them, and they can't be recovered.")
  assert.deepEqual(buttons(en), ["cancel:outline:Cancel", "delete-and-restore:destructive:Delete and restore"])
  assert.equal(rewindDialogView({ kind: "untracked", files: files(1) }, tFor("en")).title, "Also delete 1 new file?")
  assert.equal(rewindDialogView({ kind: "untracked", files: files(5) }, tFor("zh")).moreCount, 0)
})

test("二次确认 N>5：只列 5 个，其余折成「还有 N 个」", () => {
  const v = rewindDialogView({ kind: "untracked", files: files(8) }, tFor("zh"))
  assert.equal(v.title, "还要删掉 8 个新文件？")
  assert.deepEqual(v.files, files(5))
  assert.equal(v.moreCount, 3)
  assert.equal(translate(catalogs.zh, "chat.rewindConfirmUntrackedMore", { n: v.moreCount }), "还有 3 个")
  assert.equal(translate(catalogs.en, "chat.rewindConfirmUntrackedMore", { n: 3 }), "3 more")
})

test("二次确认拿不到 N：标题不带数字", () => {
  for (const missing of [null, []]) {
    const zh = rewindDialogView({ kind: "untracked", files: missing }, tFor("zh"))
    assert.equal(zh.title, "还要删掉这一轮新建的文件？")
    assert.deepEqual(zh.files, [])
    assert.equal(rewindDialogView({ kind: "untracked", files: missing }, tFor("en")).title, "Also delete the files created in this turn?")
  }
})

test("还原失败：灰字兜底，不带原始错误", () => {
  const zh = rewindDialogView({ ...git, restoreFailed: true }, tFor("zh"))
  assert.equal(zh.failure, "没能还原文件：找不到这一轮开始前的记录。聊天没有改动。")
  const en = rewindDialogView({ ...git, restoreFailed: true }, tFor("en"))
  assert.equal(en.failure, "Couldn't restore files: there's no record of how they looked before this turn. The chat wasn't changed.")
  for (const code of ["REWIND_NO_CHECKPOINT", "REWIND_NO_WORKSPACE", "REWIND_RESTORE_FAILED", "CHECKPOINT_RESTORE_FAILED"]) {
    assert.equal(isRewindRestoreFailure(code), true, code)
  }
  for (const code of ["CHECKPOINT_CONFIRM_REQUIRED", "REWIND_BUSY", "TRUNCATE_TAIL_CHANGED"]) {
    assert.equal(isRewindRestoreFailure(code), false, code)
  }
})

test("中英文所有状态都不出现 检查点 / HEAD / commit / 快照 / checkpoint", () => {
  const states: RewindDialogState[] = [
    git,
    notGit,
    { ...git, restoreFailed: true },
    { ...notGit, restoreFailed: true },
    { kind: "confirm", canRestoreFiles: false, gitRepo: true, restoreFailed: false },
    { kind: "untracked", files: files(3) },
    { kind: "untracked", files: files(8) },
    { kind: "untracked", files: null }
  ]
  for (const lang of ["zh", "en"] as const) {
    for (const s of states) {
      const v = rewindDialogView(s, tFor(lang))
      assert.doesNotMatch(text(v), BANNED, `${lang} ${JSON.stringify(s)}`)
    }
    for (const [key, value] of Object.entries(catalogs[lang].chat)) {
      if (!key.startsWith("rewind") || typeof value !== "string") continue
      assert.doesNotMatch(value, BANNED, `${lang} chat.${key}`)
    }
  }
})
