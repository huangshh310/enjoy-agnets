/**
 * luna #144：命令卡 4 行收起 + 渐隐、「展开全部（共 {n} 字）」/「收起」、展开后 40cqh 区内滚。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { en } from "../../../../i18n/catalogs/en/index.ts"
import { zh } from "../../../../i18n/catalogs/zh/index.ts"
import { translate } from "../../../../i18n/lookup.ts"
import {
  COMMAND_COLLAPSED_LINES,
  COMMAND_COMPACT_LINES,
  COMMAND_EXPANDED_MAX_HEIGHT,
  commandCharCount,
  commandToggleLabel,
  estimateCommandOverflow,
  renderCommandBlock
} from "./approval-command-collapse.ts"

const tZh = (key: string, vars?: Record<string, string | number>) => translate(zh, key, vars)
const tEn = (key: string, vars?: Record<string, string | number>) => translate(en, key, vars)
const LONG = `echo ${"a".repeat(4200)}`

test("字数按码点数；run long 夹具是 4205 字", () => {
  assert.equal(commandCharCount(LONG), 4205)
  assert.equal(commandCharCount("ls"), 2)
  assert.equal(commandCharCount("echo 你好😀"), 8)
})

test("链接文案：收起态带字数，展开态是收起（zh / en）", () => {
  assert.equal(commandToggleLabel(false, LONG, tZh), "展开全部（共 4205 字）")
  assert.equal(commandToggleLabel(true, LONG, tZh), "收起")
  assert.equal(commandToggleLabel(false, LONG, tEn), "Show all (4205 characters)")
  assert.equal(commandToggleLabel(true, LONG, tEn), "Collapse")
})

test("首帧估计：短命令不出链接，超过 4 行或很长才出", () => {
  assert.equal(estimateCommandOverflow("ls"), false)
  assert.equal(estimateCommandOverflow("ls -la"), false)
  assert.equal(estimateCommandOverflow("a\nb\nc\nd"), false)
  assert.equal(estimateCommandOverflow("a\nb\nc\nd\ne"), true)
  assert.equal(estimateCommandOverflow(LONG), true)
})

test("收起态：最多 4 行、隐藏溢出、有渐隐和「展开全部（共 n 字）」", () => {
  const html = renderToStaticMarkup(
    renderCommandBlock({ cwd: "/ws", command: LONG, expanded: false, overflowing: true, t: tZh })
  )
  assert.match(html, /data-testid="approval-command"/)
  assert.match(html, /data-expanded="false"/)
  assert.match(html, new RegExp(`max-h-\\[${COMMAND_COLLAPSED_LINES}lh\\]`))
  // 小窗收起态至少 2 行，不被压缩到 0。
  assert.match(html, new RegExp(`\\[@media\\(max-height:600px\\)\\]:max-h-\\[${COMMAND_COMPACT_LINES}lh\\]`))
  assert.match(html, /overflow-hidden/)
  assert.match(html, /data-testid="approval-command-block" class="flex min-w-0 shrink-0/)
  assert.match(html, /data-testid="approval-command-fade"/)
  assert.match(html, /data-testid="approval-command-toggle"/)
  assert.match(html, /aria-expanded="false"/)
  assert.match(html, /展开全部（共 4205 字）/)
  assert.match(html, /font-mono/)
})

test("展开态：最高 40cqh、区内滚、链接变「收起」、没有渐隐", () => {
  const html = renderToStaticMarkup(
    renderCommandBlock({ cwd: "/ws", command: LONG, expanded: true, overflowing: true, t: tZh })
  )
  assert.equal(COMMAND_EXPANDED_MAX_HEIGHT, "40cqh")
  assert.match(html, /data-expanded="true"/)
  assert.match(html, /max-h-\[40cqh\] overflow-y-auto \[@media\(max-height:600px\)\]:max-h-\[2lh\]/)
  assert.doesNotMatch(html, /approval-command-fade/)
  assert.match(html, />收起</)
  assert.match(html, /aria-expanded="true"/)
})

test("不超过 4 行：不出链接、不出渐隐", () => {
  const html = renderToStaticMarkup(
    renderCommandBlock({ cwd: "/ws", command: "ls", expanded: false, overflowing: false, t: tZh })
  )
  assert.doesNotMatch(html, /approval-command-toggle/)
  assert.doesNotMatch(html, /approval-command-fade/)
  assert.match(html, /<span class="mr-1\.5 select-none text-text-tertiary">\$<\/span>ls/)
})

test("组件接线：量真实溢出、换命令重置收起；太长提示文案不变", () => {
  const body = readFileSync(new URL("./approval-command-body.tsx", import.meta.url), "utf8")
  assert.match(body, /pre\.scrollHeight > pre\.clientHeight \+ 1/)
  assert.match(body, /new ResizeObserver\(measure\)/)
  assert.match(body, /setExpanded\(false\)/)
  assert.equal(zh.chat.alwaysAllowTooLongHint, "命令太长，只允许这一次，不会记下。")
})

test("小窗：路径行让位、命令区与链接 shrink-0", () => {
  const html = renderToStaticMarkup(
    renderCommandBlock({ cwd: "/ws", command: LONG, expanded: false, overflowing: true, t: tZh })
  )
  assert.equal(COMMAND_COMPACT_LINES, 2)
  assert.match(html, /<p class="truncate font-mono[^"]*\[@media\(max-height:600px\)\]:hidden">\/ws<\/p>/)
  assert.match(html, /<pre[^>]*class="m-0 shrink-0 /)
  assert.match(html, /data-testid="approval-command-toggle"[^>]*class="shrink-0 self-start/)
})

test("小窗卡片：标题挪到底栏一行，拒绝 / 运行同组，本会话落第二行（wrap-reverse）", () => {
  const chrome = readFileSync(new URL("./approval-chrome.tsx", import.meta.url), "utf8")
  const actions = readFileSync(new URL("./approval-actions.tsx", import.meta.url), "utf8")
  assert.match(chrome, /data-testid="approval-compact-title"/)
  assert.match(chrome, /hidden max-w-\[45%\] shrink-0 truncate[^"]*\[@media\(max-height:600px\)\]:block/)
  assert.match(chrome, /leading-6 text-text-primary \[@media\(max-height:600px\)\]:hidden/)
  assert.match(actions, /flex min-w-0 flex-wrap-reverse items-center justify-end/)
  const session = actions.indexOf('data-testid="approval-session"')
  const group = actions.indexOf('data-testid="approval-primary-actions"')
  const deny = actions.indexOf("data-testid={denyTestId}")
  const allow = actions.indexOf("data-testid={allowTestId}")
  assert.ok(session > 0 && session < group && group < deny && deny < allow)
  assert.match(actions, /approval-primary-actions" className="flex shrink-0 flex-nowrap/)
})
