/**
 * 「从这里重来」弹窗按 luna 定稿（= 实际行为）：
 * - Git 工作区：取消 · 连文件一起还原（描边）· 只改聊天（主按钮最右），正文下灰字。
 * - 二次确认删本轮新文件：N≤5 全列；N>5 列 5 个 +「还有 N 个」；拿不到 N 换不带数字的标题；删掉并还原是 danger。
 *   点「删掉并还原」后：新文件真的删了、这条消息和之后的对话移除、原话回到输入框。
 * - 还原失败（本轮开始前的记录被删掉 / 列记录出错）：弹窗里灰色兜底句，聊天没动。
 * - 还原中途出错（restoreCheckpoint 抛带原文的错）：琥珀色一句 +「去审查」，界面上看不到原文；截断抛原文只显示通用句。
 * - 取消 / Esc 后重开回到第一步；跑着的时候 Esc 不收窗。
 * - 非 Git 工作区：没有还原按钮，取消 · 从这里重来；点了只清对话，文件不动。
 * - 不知道是不是 Git（workspace.changes 不带 gitRepo）：同样隐藏还原按钮，中性正文。
 * - setComposer 与 #136 按会话保存草稿：重来后原话在输入框，切到新对话是空的，切回来原话还在。
 * 中英文都断言不出现 检查点 / HEAD / commit / 快照 / checkpoint。
 * 截图：设 ENJOY_E2E_SHOTS_DIR 时落盘（1440x900 与 733x480），文件名前缀 ENJOY_E2E_SHOT_TAG（默认 after）。
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type ElectronApplication, type Locator, type Page } from "@playwright/test"
import { closeForRelaunch, firstWindow, relaunchElectron, stubPath } from "./approval-restart-helpers"
import { sendComposer } from "./send-composer"

const shotsDir = process.env.ENJOY_E2E_SHOTS_DIR
const shotTag = process.env.ENJOY_E2E_SHOT_TAG ?? "after"
if (shotsDir) mkdirSync(shotsDir, { recursive: true })

const BANNED = /检查点|HEAD|commit|快照|checkpoint/i

const COPY = {
  zh: {
    action: "从这里重来",
    title: "从这条消息重来？",
    gitBody: "这条消息和它之后的对话会移除，这条消息的内容会放回输入框，改好再发。",
    gitHint: "文件也可以一起还原到这一轮开始前的样子。",
    gitButtons: ["取消", "连文件一起还原", "只改聊天"],
    notGitBody: "这条消息和它之后的对话会移除，内容放回输入框。这个文件夹没用 Git 管理，改过的文件不会还原。",
    notGitButtons: ["取消", "从这里重来"],
    untrackedTitle: (n: number) => `还要删掉 ${n} 个新文件？`,
    untrackedUnknown: "还要删掉这一轮开始后新出现的文件？",
    untrackedBody: "这些文件是这一轮开始后新出现的，包括你自己新建的。还原会把它们删掉，删了找不回。",
    more: (n: number) => `还有 ${n} 个`,
    untrackedButtons: ["取消", "删掉并还原"],
    failure: "没能还原文件：找不到这一轮开始前的记录。聊天没有改动。",
    partial: "文件只还原了一部分，有的可能已经改回去，有的还没有。聊天没有改动，请到「审查」里核对。",
    goReview: "去审查",
    neutralBody: "这条消息和它之后的对话会移除，内容放回输入框。改过的文件不会还原。",
    genericError: "从这里重来失败",
    review: "审查",
    // 修前（main）的按钮名，只用来在修前截图时走到同一个状态。
    oldRestore: "连文件一起还原",
    oldChatOnly: "只改聊天"
  },
  en: {
    action: "Edit from here",
    title: "Start over from this message?",
    gitBody: "This message and everything after it will be removed. Its text goes back into the input so you can edit and resend.",
    gitHint: "You can also restore files to how they were before this turn.",
    gitButtons: ["Cancel", "Restore files too", "Chat only"],
    notGitBody:
      "This message and everything after it will be removed. Its text goes back into the input. This folder isn't tracked by Git, so file changes won't be undone.",
    notGitButtons: ["Cancel", "Start over"],
    untrackedTitle: (n: number) => (n === 1 ? "Also delete 1 new file?" : `Also delete ${n} new files?`),
    untrackedUnknown: "Also delete files that appeared after this turn started?",
    untrackedBody:
      "These files appeared after this turn started, including any you created yourself. Restoring will delete them, and they can't be recovered.",
    more: (n: number) => `${n} more`,
    untrackedButtons: ["Cancel", "Delete and restore"],
    failure: "Couldn't restore files: there's no record of how they looked before this turn. The chat wasn't changed.",
    partial:
      "Files were only partly restored. Some may have changed back and some may not. The chat wasn't changed. Check Review to see where things stand.",
    goReview: "Go to Review",
    neutralBody:
      "This message and everything after it will be removed, and its text goes back into the input. File changes won't be undone.",
    genericError: "Could not rewind from here",
    review: "Review",
    oldRestore: "Revert files too",
    oldChatOnly: "Revert chat only"
  }
} as const

type Lang = keyof typeof COPY

function git(cwd: string, ...args: string[]) {
  return execFileSync("git", args, { cwd, encoding: "utf8" })
}

function makeWorkspace(withGit: boolean): string {
  const ws = mkdtempSync(join(tmpdir(), withGit ? "enjoy-e2e-rwd-git-" : "enjoy-e2e-rwd-plain-"))
  writeFileSync(join(ws, "readme.md"), "# e2e\n")
  if (withGit) {
    git(ws, "init", "-q")
    git(ws, "config", "user.name", "Enjoy E2E")
    git(ws, "config", "user.email", "e2e@example.com")
    git(ws, "add", "-A")
    git(ws, "commit", "-q", "-m", "init")
  }
  return ws
}

async function launch(lang: Lang, workspace: string) {
  const app = await relaunchElectron({
    ...process.env,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_LANG: lang,
    ENJOY_E2E_CHAT_READY: "key",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_USERDATA: mkdtempSync(join(tmpdir(), "enjoy-e2e-rwd-ud-"))
  })
  const page = await firstWindow(app)
  await page.setViewportSize({ width: 1440, height: 900 })
  return { app, page }
}

async function writeTurn(page: Page) {
  const composer = page.locator('[data-testid="composer-input"]')
  await sendComposer(page, composer, "please write a note")
  await page.locator('[data-testid="approval-allow"]').click({ timeout: 15_000 })
  await expect(page.getByText("stub-ok", { exact: false }).first()).toBeVisible({ timeout: 15_000 })
}

async function openDialog(page: Page, lang: Lang): Promise<Locator> {
  const bubble = page.locator('[data-testid="user-bubble"]').first()
  await bubble.hover()
  await page.getByRole("button", { name: COPY[lang].action, exact: true }).first().click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await page.waitForTimeout(350)
  return dialog
}

/** 1440x900 与 733x480 各截一张，回到 1440。 */
async function shots(page: Page, name: string) {
  if (!shotsDir) return
  await page.screenshot({ path: join(shotsDir, `${shotTag}-${name}-1440x900.png`) })
  await page.setViewportSize({ width: 733, height: 480 })
  await page.waitForTimeout(350)
  await page.screenshot({ path: join(shotsDir, `${shotTag}-${name}-733x480.png`) })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.waitForTimeout(200)
}

/** 页脚按钮：文案（左→右）、样式（data-variant），且在 733x480 也是左到右排列、整颗在窗内。 */
async function expectFooter(page: Page, dialog: Locator, tag: string, labels: readonly string[], variants: string[]) {
  const footer = dialog.locator('[data-slot="dialog-footer"] button')
  for (const size of [{ width: 1440, height: 900 }, { width: 733, height: 480 }]) {
    await page.setViewportSize(size)
    await page.waitForTimeout(250)
    const info = await footer.evaluateAll((els) =>
      els
        .map((el) => {
          const r = el.getBoundingClientRect()
          return { text: (el.textContent ?? "").trim(), variant: el.getAttribute("data-variant") ?? "", x: r.x, right: r.right, bottom: r.bottom }
        })
        .sort((a, b) => a.x - b.x)
    )
    expect.soft(info.map((b) => b.text), `${tag} ${size.width} button labels left→right`).toEqual([...labels])
    expect.soft(info.map((b) => b.variant), `${tag} ${size.width} button variants`).toEqual(variants)
    for (const b of info) {
      expect.soft(b.right <= size.width && b.bottom <= size.height, `${tag} ${size.width} ${b.text} inside`).toBe(true)
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 })
}

async function expectNoBanned(dialog: Locator, tag: string) {
  expect.soft(await dialog.innerText(), `${tag} banned words`).not.toMatch(BANNED)
}

function button(dialog: Locator, id: string, fallback: string): Locator {
  return dialog.getByTestId(`rewind-${id}`).or(dialog.getByRole("button", { name: fallback, exact: true })).first()
}

async function overrideRestore(app: ElectronApplication, result: unknown) {
  await app.evaluate(({ ipcMain }, value) => {
    ipcMain.removeHandler("workspace.restoreCheckpoint")
    ipcMain.handle("workspace.restoreCheckpoint", async () => value)
  }, result)
}

/** 让某个 ipc 通道抛出带原始文本的错误（主进程里 throw，渲染层收到 "Error invoking remote method …"）。 */
async function throwFrom(app: ElectronApplication, channel: string, raw: string) {
  await app.evaluate(
    ({ ipcMain }, { channel, raw }) => {
      ipcMain.removeHandler(channel)
      ipcMain.handle(channel, async () => {
        throw new Error(raw)
      })
    },
    { channel, raw }
  )
}

/** 第一步（还没点任何按钮时）的样子：标题、Git 正文、三钮，没有文件名单、没有失败提示。 */
async function expectFirstStep(page: Page, dialog: Locator, lang: Lang, tag: string) {
  const c = COPY[lang]
  await expect(dialog, `${tag} state kind`).toHaveAttribute("data-state-kind", "confirm")
  await expect(dialog.getByRole("heading").first(), `${tag} title`).toHaveText(c.title)
  await expect(dialog, `${tag} body`).toContainText(c.gitBody)
  await expect(dialog.getByTestId("rewind-files"), `${tag} no file list`).toHaveCount(0)
  await expect(dialog.getByTestId("rewind-failure"), `${tag} no failure line`).toHaveCount(0)
  await expect(dialog.getByTestId("rewind-error"), `${tag} no error line`).toHaveCount(0)
  await expectFooter(page, dialog, tag, c.gitButtons, ["outline", "outline", "default"])
}

for (const lang of ["zh", "en"] as const) {
  const c = COPY[lang]

  test(`Git 工作区：三钮 + 二次确认（N≤5 / N>5）+ 删掉并还原真的生效（${lang}）`, async () => {
    test.setTimeout(180_000)
    const ws = makeWorkspace(true)
    const { app, page } = await launch(lang, ws)
    try {
      await writeTurn(page)
      // 本轮新建：stub 写的 e2e-stub.txt + 再补两个 → 3 个。
      writeFileSync(join(ws, "new-a.txt"), "a\n")
      writeFileSync(join(ws, "new-b.txt"), "b\n")
      let dialog = await openDialog(page, lang)
      await shots(page, `git-${lang}`)
      await expect.soft(dialog.getByRole("heading").first()).toHaveText(c.title)
      await expect.soft(dialog).toContainText(c.gitBody)
      await expect.soft(dialog.getByTestId("rewind-hint")).toHaveText(c.gitHint)
      await expectFooter(page, dialog, `${lang} git`, c.gitButtons, ["outline", "outline", "default"])
      await expectNoBanned(dialog, `${lang} git`)

      await button(dialog, "restore-files", c.oldRestore).click()
      await page.waitForTimeout(500)
      await shots(page, `untracked3-${lang}`)
      await expect.soft(dialog.getByRole("heading").first()).toHaveText(c.untrackedTitle(3))
      await expect.soft(dialog).toContainText(c.untrackedBody)
      await expect.soft(dialog.getByTestId("rewind-files").locator("li")).toHaveCount(3)
      await expect.soft(dialog.getByTestId("rewind-files-more")).toHaveCount(0)
      await expectFooter(page, dialog, `${lang} untracked3`, c.untrackedButtons, ["outline", "destructive"])
      await expectNoBanned(dialog, `${lang} untracked3`)
      await page.keyboard.press("Escape")
      await expect(dialog).toBeHidden()

      // 再补 5 个 → 8 个：列 5 个 +「还有 3 个」。
      for (const name of ["c", "d", "e", "f", "g"]) writeFileSync(join(ws, `new-${name}.txt`), `${name}\n`)
      dialog = await openDialog(page, lang)
      await button(dialog, "restore-files", c.oldRestore).click()
      await page.waitForTimeout(500)
      await shots(page, `untracked8-${lang}`)
      await expect.soft(dialog.getByRole("heading").first()).toHaveText(c.untrackedTitle(8))
      await expect.soft(dialog.getByTestId("rewind-files").locator("li:not([data-testid])")).toHaveCount(5)
      await expect.soft(dialog.getByTestId("rewind-files-more")).toHaveText(c.more(3))
      await expectNoBanned(dialog, `${lang} untracked8`)

      // 删掉并还原：新文件删掉、这条消息和之后的对话移除、原话回到输入框。
      await dialog.getByTestId("rewind-delete-and-restore").click()
      await expect(dialog).toBeHidden({ timeout: 10_000 })
      expect(existsSync(stubPath(ws))).toBe(false)
      expect(existsSync(join(ws, "new-g.txt"))).toBe(false)
      expect(existsSync(join(ws, "readme.md"))).toBe(true)
      await expect(page.locator('[data-testid="user-bubble"]')).toHaveCount(0)
      await expect(page.locator('[data-testid="composer-input"]')).toContainText("please write a note")
    } finally {
      await closeForRelaunch(app)
    }
  })

  test(`Git 工作区：拿不到 N 的二次确认 + 还原失败灰字兜底（${lang}）`, async () => {
    test.setTimeout(180_000)
    const ws = makeWorkspace(true)
    const { app, page } = await launch(lang, ws)
    try {
      await writeTurn(page)
      // 拿不到名单：主进程这次只回「要确认」不带文件。
      await overrideRestore(app, { ok: false, code: "CHECKPOINT_CONFIRM_REQUIRED", untrackedToDelete: [] })
      let dialog = await openDialog(page, lang)
      await button(dialog, "restore-files", c.oldRestore).click()
      await page.waitForTimeout(500)
      await shots(page, `untracked-unknown-${lang}`)
      await expect.soft(dialog.getByRole("heading").first()).toHaveText(c.untrackedUnknown)
      await expect.soft(dialog).toContainText(c.untrackedBody)
      await expect.soft(dialog.getByTestId("rewind-files")).toHaveCount(0)
      await expectFooter(page, dialog, `${lang} unknown`, c.untrackedButtons, ["outline", "destructive"])
      await expectNoBanned(dialog, `${lang} unknown`)
      await page.keyboard.press("Escape")
      await expect(dialog).toBeHidden()

      // 本轮开始前的记录没了 → 还原失败：灰字兜底，聊天没动。
      // 去掉上面的假实现；真把 refs/enjoy/checkpoints 删掉，渲染层列不到本轮记录 → REWIND_NO_CHECKPOINT。
      await app.evaluate(({ ipcMain }) => ipcMain.removeHandler("workspace.restoreCheckpoint"))
      for (const ref of git(ws, "for-each-ref", "--format=%(refname)", "refs/enjoy/checkpoints").split("\n").filter(Boolean)) {
        git(ws, "update-ref", "-d", ref)
      }
      const before = await page.locator('[data-testid="user-bubble"]').count()
      dialog = await openDialog(page, lang)
      await button(dialog, "restore-files", c.oldRestore).click()
      await page.waitForTimeout(600)
      await shots(page, `restore-failed-${lang}`)
      await expect.soft(dialog.getByTestId("rewind-failure")).toHaveText(c.failure)
      await expect.soft(dialog).toBeVisible()
      await expectNoBanned(dialog, `${lang} failed`)
      expect.soft(await page.locator('[data-testid="user-bubble"]').count(), `${lang} chat unchanged`).toBe(before)
      expect.soft(existsSync(stubPath(ws)), `${lang} files unchanged`).toBe(true)
    } finally {
      await closeForRelaunch(app)
    }
  })

  test(`非 Git 工作区：没有还原按钮，从这里重来只清对话（${lang}）`, async () => {
    test.setTimeout(180_000)
    const ws = makeWorkspace(false)
    const { app, page } = await launch(lang, ws)
    try {
      await writeTurn(page)
      const dialog = await openDialog(page, lang)
      await shots(page, `notgit-${lang}`)
      await expect.soft(dialog.getByRole("heading").first()).toHaveText(c.title)
      await expect.soft(dialog).toContainText(c.notGitBody)
      await expect.soft(dialog.getByTestId("rewind-hint")).toHaveCount(0)
      await expectFooter(page, dialog, `${lang} notgit`, c.notGitButtons, ["outline", "default"])
      await expectNoBanned(dialog, `${lang} notgit`)
      await button(dialog, "start-over", c.oldChatOnly).click()
      await expect(dialog).toBeHidden({ timeout: 10_000 })
      await expect(page.locator('[data-testid="user-bubble"]')).toHaveCount(0)
      await expect(page.locator('[data-testid="composer-input"]')).toContainText("please write a note")
      // 文件不动。
      expect(existsSync(stubPath(ws))).toBe(true)
    } finally {
      await closeForRelaunch(app)
    }
  })
  test(`取消 / Esc 后重开回到第一步；跑着的时候 Esc 不收窗（${lang}）`, async () => {
    test.setTimeout(180_000)
    const ws = makeWorkspace(true)
    const { app, page } = await launch(lang, ws)
    try {
      await writeTurn(page)
      writeFileSync(join(ws, "new-a.txt"), "a\n")
      // 确认页 → 取消 → 重开 → 第一步。
      let dialog = await openDialog(page, lang)
      await dialog.getByTestId("rewind-restore-files").click()
      await expect(dialog).toHaveAttribute("data-state-kind", "untracked", { timeout: 10_000 })
      await expect(dialog.getByTestId("rewind-files")).toBeVisible()
      await dialog.getByTestId("rewind-cancel").click()
      await expect(dialog).toBeHidden()
      dialog = await openDialog(page, lang)
      await shots(page, `reopen-after-cancel-${lang}`)
      await expectFirstStep(page, dialog, lang, `${lang} after cancel`)

      // 确认页 → Esc → 重开 → 第一步。
      await dialog.getByTestId("rewind-restore-files").click()
      await expect(dialog).toHaveAttribute("data-state-kind", "untracked", { timeout: 10_000 })
      await page.keyboard.press("Escape")
      await expect(dialog).toBeHidden()
      dialog = await openDialog(page, lang)
      await expectFirstStep(page, dialog, lang, `${lang} after esc`)

      // 失败提示 → 取消 → 重开：提示不残留。
      await throwFrom(app, "workspace.restoreCheckpoint", "RAW-RESTORE-ERROR at /tmp/secret")
      await dialog.getByTestId("rewind-restore-files").click()
      await expect(dialog.getByTestId("rewind-failure")).toBeVisible({ timeout: 10_000 })
      await dialog.getByTestId("rewind-cancel").click()
      await expect(dialog).toBeHidden()
      dialog = await openDialog(page, lang)
      await expectFirstStep(page, dialog, lang, `${lang} failure then cancel`)
      await page.keyboard.press("Escape")
      await expect(dialog).toBeHidden()

      // 跑着的时候按 Esc：不收窗，结果回来照常进二次确认。
      await app.evaluate(({ ipcMain }) => {
        ipcMain.removeHandler("workspace.restoreCheckpoint")
        ipcMain.handle("workspace.restoreCheckpoint", async () => {
          await new Promise((resolve) => setTimeout(resolve, 2_000))
          return { ok: false, code: "CHECKPOINT_CONFIRM_REQUIRED", untrackedToDelete: ["slow.txt"] }
        })
      })
      dialog = await openDialog(page, lang)
      await dialog.getByTestId("rewind-restore-files").click()
      await page.waitForTimeout(300)
      await page.keyboard.press("Escape")
      await page.waitForTimeout(300)
      await expect(dialog, `${lang} esc while busy keeps dialog`).toBeVisible()
      await expect(dialog).toHaveAttribute("data-state-kind", "untracked", { timeout: 10_000 })
      await expect(dialog.getByTestId("rewind-files")).toContainText("slow.txt")
    } finally {
      await closeForRelaunch(app)
    }
  })

  test(`原始错误不进界面：还原中途出错琥珀色 + 去审查；列记录出错灰色兜底；截断出错只显示通用句（${lang}）`, async () => {
    test.setTimeout(180_000)
    const ws = makeWorkspace(true)
    const { app, page } = await launch(lang, ws)
    try {
      await writeTurn(page)
      const before = await page.locator('[data-testid="user-bubble"]').count()

      // ① restoreCheckpoint 抛原文 → REWIND_RESTORE_FAILED：琥珀色一句 +「去审查」。
      const rawRestore = "RAW-RESTORE-ERROR fatal: cannot lock ref refs/enjoy/abc /Users/me/secret"
      await throwFrom(app, "workspace.restoreCheckpoint", rawRestore)
      let dialog = await openDialog(page, lang)
      await dialog.getByTestId("rewind-restore-files").click()
      const partial = dialog.getByTestId("rewind-failure")
      await expect(partial).toBeVisible({ timeout: 10_000 })
      await shots(page, `restore-partial-${lang}`)
      await expect(partial).toHaveAttribute("data-failure-kind", "partial")
      await expect(partial).toContainText(c.partial)
      await expect(partial.getByTestId("rewind-go-review")).toHaveText(c.goReview)
      expect(await partial.evaluate((el) => getComputedStyle(el).color)).not.toBe(
        await dialog.getByTestId("rewind-hint").evaluate((el) => getComputedStyle(el).color)
      )
      let shown = await dialog.innerText()
      expect(shown).not.toContain("RAW-RESTORE-ERROR")
      expect(shown).not.toMatch(/fatal|secret|remote method/i)
      await expectNoBanned(dialog, `${lang} partial`)
      expect(await page.locator('[data-testid="user-bubble"]').count(), `${lang} chat unchanged`).toBe(before)
      // 去审查：关窗、打开右栏审查。
      await partial.getByTestId("rewind-go-review").click()
      await expect(dialog).toBeHidden()
      await expect(page.locator('[data-testid="right-pane-shell"]')).toBeVisible({ timeout: 10_000 })
      await expect(page.locator('[data-testid="right-pane-shell"]')).toContainText(c.review)
      await shots(page, `restore-partial-go-review-${lang}`)

      // ② listCheckpoints 抛原文 → 还没碰文件：灰色兜底句（和提示灰字样式不同）。
      await throwFrom(app, "workspace.listCheckpoints", "RAW-LIST-ERROR SQLITE_CORRUPT /tmp/secret.db")
      dialog = await openDialog(page, lang)
      await dialog.getByTestId("rewind-restore-files").click()
      const missing = dialog.getByTestId("rewind-failure")
      await expect(missing).toBeVisible({ timeout: 10_000 })
      await shots(page, `list-failed-${lang}`)
      await expect(missing).toHaveAttribute("data-failure-kind", "missing")
      await expect(missing).toHaveText(c.failure)
      const hint = dialog.getByTestId("rewind-hint")
      const [missingBg, hintBg] = await Promise.all([
        missing.evaluate((el) => getComputedStyle(el).backgroundColor),
        hint.evaluate((el) => getComputedStyle(el).backgroundColor)
      ])
      expect(missingBg, `${lang} failure line has its own background`).not.toBe(hintBg)
      shown = await dialog.innerText()
      expect(shown).not.toContain("RAW-LIST-ERROR")
      expect(shown).not.toMatch(/SQLITE|secret|remote method/i)
      await page.keyboard.press("Escape")
      await expect(dialog).toBeHidden()

      // ③ truncateFrom 抛原文（只改聊天）→ 只显示通用句。
      await throwFrom(app, "session.truncateFrom", "RAW-TRUNCATE-ERROR SQLITE_BUSY database is locked /tmp/secret.db")
      dialog = await openDialog(page, lang)
      await dialog.getByTestId("rewind-chat-only").click()
      const error = dialog.getByTestId("rewind-error")
      await expect(error).toBeVisible({ timeout: 10_000 })
      await shots(page, `truncate-raw-error-${lang}`)
      await expect(error).toHaveText(c.genericError)
      shown = await dialog.innerText()
      expect(shown).not.toContain("RAW-TRUNCATE-ERROR")
      expect(shown).not.toMatch(/SQLITE|secret|remote method/i)
      expect(await page.locator('[data-testid="user-bubble"]').count(), `${lang} chat unchanged`).toBe(before)
    } finally {
      await closeForRelaunch(app)
    }
  })

  test(`不知道是不是 Git（gitRepo 为 null）：隐藏还原按钮，中性正文，从这里重来只清对话（${lang}）`, async () => {
    test.setTimeout(180_000)
    const ws = makeWorkspace(true)
    const { app, page } = await launch(lang, ws)
    try {
      // workspace.changes 不带 gitRepo → 渲染层记成 null（不知道）。
      await app.evaluate(({ ipcMain }) => {
        ipcMain.removeHandler("workspace.changes")
        ipcMain.handle("workspace.changes", async () => ({ files: [] }))
      })
      await writeTurn(page)
      await page.evaluate(() => window.dispatchEvent(new Event("focus")))
      const dialog = await openDialog(page, lang)
      await expect(dialog.getByTestId("rewind-start-over")).toBeVisible({ timeout: 15_000 })
      await shots(page, `unknown-git-${lang}`)
      await expect.soft(dialog.getByRole("heading").first()).toHaveText(c.title)
      await expect.soft(dialog.getByTestId("rewind-body")).toHaveText(c.neutralBody)
      await expect.soft(dialog.getByTestId("rewind-hint")).toHaveCount(0)
      await expect(dialog.getByTestId("rewind-restore-files"), `${lang} restore hidden, not disabled`).toHaveCount(0)
      await expectFooter(page, dialog, `${lang} unknown-git`, c.notGitButtons, ["outline", "default"])
      await expectNoBanned(dialog, `${lang} unknown-git`)
      await dialog.getByTestId("rewind-start-over").click()
      await expect(dialog).toBeHidden({ timeout: 10_000 })
      await expect(page.locator('[data-testid="user-bubble"]')).toHaveCount(0)
      await expect(page.locator('[data-testid="composer-input"]')).toContainText("please write a note")
      expect(existsSync(stubPath(ws)), `${lang} files untouched`).toBe(true)
    } finally {
      await closeForRelaunch(app)
    }
  })
}

test("重来写回输入框 × #136 按会话保存草稿：切到新对话是空的，切回来原话还在（zh）", async () => {
  test.setTimeout(180_000)
  const ws = makeWorkspace(true)
  const { app, page } = await launch("zh", ws)
  try {
    await writeTurn(page)
    const original = await page.locator('[data-testid="sidebar-session-row"][data-active="true"]').first().getAttribute("data-session-id")
    expect(original).toBeTruthy()
    const dialog = await openDialog(page, "zh")
    await dialog.getByTestId("rewind-chat-only").click()
    await expect(dialog).toBeHidden({ timeout: 10_000 })
    const composer = page.locator('[data-testid="composer-input"]')
    await expect(composer).toContainText("please write a note")
    // 切到新对话：输入框是空的（重来写回的字没串过去）。
    await page.getByRole("button", { name: "新对话" }).first().click()
    await expect(page.locator('[data-testid="sidebar-session-row"][data-active="true"]')).not.toHaveAttribute(
      "data-session-id",
      original as string,
      { timeout: 10_000 }
    )
    await page.waitForTimeout(800)
    await expect(composer).not.toContainText("please write a note")
    // 切回原会话：草稿还是重来写回的原话。
    await page.locator(`[data-testid="sidebar-session-row"][data-session-id="${original}"]`).first().click()
    await expect(page.locator(`[data-testid="sidebar-session-row"][data-session-id="${original}"]`).first()).toHaveAttribute(
      "data-active",
      "true",
      { timeout: 10_000 }
    )
    await page.waitForTimeout(800)
    await expect(composer).toContainText("please write a note")
    await expect(page.locator('[data-testid="user-bubble"]')).toHaveCount(0)
    await shots(page, "set-composer-draft-switch-back-zh")
  } finally {
    await closeForRelaunch(app)
  }
})
