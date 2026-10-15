/**
 * 「从这里重来」弹窗按 luna 定稿（= 实际行为）：
 * - Git 工作区：取消 · 连文件一起还原（描边）· 只改聊天（主按钮最右），正文下灰字。
 * - 二次确认删本轮新文件：N≤5 全列；N>5 列 5 个 +「还有 N 个」；拿不到 N 换不带数字的标题；删掉并还原是 danger。
 *   点「删掉并还原」后：新文件真的删了、这条消息和之后的对话移除、原话回到输入框。
 * - 还原失败（本轮开始前的记录被删掉）：弹窗里灰字兜底，聊天没动。
 * - 非 Git 工作区：没有还原按钮，取消 · 从这里重来；点了只清对话，文件不动。
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
    untrackedUnknown: "还要删掉这一轮新建的文件？",
    untrackedBody: "这些文件是这一轮里新建的，还原会把它们删掉，删了找不回。",
    more: (n: number) => `还有 ${n} 个`,
    untrackedButtons: ["取消", "删掉并还原"],
    failure: "没能还原文件：找不到这一轮开始前的记录。聊天没有改动。",
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
    untrackedUnknown: "Also delete the files created in this turn?",
    untrackedBody: "These were created in this turn. Restoring will delete them, and they can't be recovered.",
    more: (n: number) => `${n} more`,
    untrackedButtons: ["Cancel", "Delete and restore"],
    failure: "Couldn't restore files: there's no record of how they looked before this turn. The chat wasn't changed.",
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
}
