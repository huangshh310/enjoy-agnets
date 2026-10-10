/**
 * 每种 SourceBadgeKind 都能画出一行；未知 kind 回落问号，不抛 Element type is invalid。
 */
import assert from "node:assert/strict"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { test } from "node:test"
import type { SourceBadgeKind } from "./source-detail.ts"
import {
  SOURCE_BADGE_FALLBACK_ICON,
  SOURCE_BADGE_ICONS,
  SOURCE_BADGE_KINDS,
  SOURCE_BADGE_LABEL_KEYS,
  renderSourceBadgeRow,
  sourceBadgeIcon,
  sourceBadgeLabelKey
} from "./source-badge.ts"

const ALL_KINDS: SourceBadgeKind[] = ["file", "skill", "mcp", "knowledge"]

test("图标表覆盖全部 SourceBadgeKind，缺项是类型错误", () => {
  assert.deepEqual([...SOURCE_BADGE_KINDS].sort(), [...ALL_KINDS].sort())
  for (const kind of ALL_KINDS) {
    assert.equal(typeof SOURCE_BADGE_ICONS[kind], "function")
    assert.equal(typeof SOURCE_BADGE_LABEL_KEYS[kind], "string")
  }
})

test("每种 SourceBadgeKind 都能渲染来源行，图标不是 undefined", () => {
  for (const kind of ALL_KINDS) {
    const html = renderToStaticMarkup(renderSourceBadgeRow(kind, (key) => key))
    assert.match(html, /data-testid="turn-source-row"/)
    assert.match(html, new RegExp(`data-kind="${kind}"`))
    assert.doesNotMatch(html, /undefined/)
    assert.ok(html.includes("svg") || html.length > 40, `${kind} row too empty: ${html}`)
  }
})

test("未知 kind 回落问号标，渲染不抛", () => {
  assert.equal(sourceBadgeIcon("future-kind"), SOURCE_BADGE_FALLBACK_ICON)
  assert.equal(sourceBadgeLabelKey("future-kind"), SOURCE_BADGE_LABEL_KEYS.file)
  const html = renderToStaticMarkup(
    createElement(sourceBadgeIcon("future-kind"), { className: "size-3.5" })
  )
  assert.doesNotMatch(html, /undefined/)
  assert.ok(html.length > 0)
})
