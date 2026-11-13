/**
 * 隔离组件夹具：已有真正 Composer 知识 Chip 时，收藏插入只改正文、不清 Chip。
 *
 * 种入走测试内 addSessionContextChip（kind=knowledge 完整形态）；
 * 插入必须走生产 insertPromptLibraryText。
 *
 * 渲染核对：队列深比较 + ComposerContextChips 对 listSessionContextChips 的纯投影关系
 *（chips.map → <ContextChipPill key={chip.id} chip={chip} />）。
 * 这只证明身份/内容和渲染数据源未变，不等于「渲染保留已证」。
 * 本文件未做 TSX markup / 浏览器 DOM 实绘。
 *
 * 本用例是组件级，不证明用户能经产品 UI 放入该 Chip。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { afterEach, beforeEach, test } from "node:test"
import {
  addSessionContextChip,
  listSessionContextChips,
  setSessionContextChips,
  type SessionContextChip
} from "../../../../hooks/session-context-chips.ts"
import { useChatStore } from "./insert-prompt-library-keeps-knowledge-chip.store.ts"
import { insertPromptLibraryText } from "./insert-prompt-library.ts"

const SEEDED: SessionContextChip = {
  id: "fixture-knowledge-chip-1",
  kind: "knowledge",
  label: "fixture-doc.md",
  path: "docs/fixture-doc.md",
  snippet: "pinned knowledge snippet that must remain",
  enabled: true
}

const OLD_DRAFT = "待替换的旧草稿"
const INSERTED = "召回验证插入句 unique-library-text"

function resetFixtureState() {
  setSessionContextChips([])
  useChatStore.setState({
    composer: "",
    running: false,
    pendingApproval: null
  } as never)
}

function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
}

beforeEach(() => {
  resetFixtureState()
})

afterEach(() => {
  resetFixtureState()
})

test("已有知识 Chip 时插入收藏只改正文、身份与内容深比较保留、无发送无审批", () => {
  assert.notEqual(INSERTED, OLD_DRAFT)

  addSessionContextChip(SEEDED)
  const beforeChips = listSessionContextChips()
  assert.equal(beforeChips.length, 1)
  assert.equal(beforeChips[0]?.kind, "knowledge")
  assert.deepEqual(beforeChips[0], SEEDED)

  useChatStore.getState().setComposer(OLD_DRAFT)
  assert.equal(useChatStore.getState().composer, OLD_DRAFT)

  const chipSnapshot = structuredClone(beforeChips)
  const runningBefore = useChatStore.getState().running
  const pendingApprovalBefore = useChatStore.getState().pendingApproval

  const result = insertPromptLibraryText(INSERTED)

  assert.equal(useChatStore.getState().composer, INSERTED)
  assert.notEqual(useChatStore.getState().composer, OLD_DRAFT)

  const afterChips = listSessionContextChips()
  assert.equal(afterChips.length, 1)
  assert.deepEqual(afterChips, chipSnapshot)
  assert.deepEqual(afterChips[0], SEEDED)
  assert.equal(afterChips[0]?.id, SEEDED.id)
  assert.equal(afterChips[0]?.kind, SEEDED.kind)
  assert.equal(afterChips[0]?.label, SEEDED.label)
  assert.equal(afterChips[0]?.path, SEEDED.path)
  assert.equal(afterChips[0]?.snippet, SEEDED.snippet)
  assert.equal(afterChips[0]?.enabled, SEEDED.enabled)

  assert.equal(useChatStore.getState().running, runningBefore)
  assert.equal(useChatStore.getState().pendingApproval, pendingApprovalBefore)
  assert.equal(result.running, Boolean(runningBefore))
})

test("insert-prompt-library.ts 源码不含发送或审批写口（互补不变式）", () => {
  const src = readFileSync(new URL("./insert-prompt-library.ts", import.meta.url), "utf8")
  const code = codeOnly(src)
  assert.doesNotMatch(code, /submitComposer/)
  assert.doesNotMatch(code, /sendComposerMessage/)
  assert.doesNotMatch(code, /takeComposerText/)
  assert.doesNotMatch(code, /takeSessionContextChips/)
  assert.doesNotMatch(code, /clearComposerDraftChips/)
  assert.doesNotMatch(code, /setPendingApproval/)
})
