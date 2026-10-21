/**
 * mike P3（#163 巡检）：紧凑排队区——点开后底下藏着的行要有「还有 N 条」；拉矮到 ≤600 重新折起；
 * 停着 + 失败卡时对话区保底（「再发一次」整颗露出）。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { foldOnSqueeze, keepThreadForFailureCard, PILL_BELOW_MIN_DOCK_PX, pillFitsBelow, refoldOnShort, rowsHiddenBelow, showHiddenBelowPill } from "./queue-dock-layout.ts"
import { PREVIOUS_STILL_PREPARING } from "../../../lib/usage/classify-thread-error.ts"
import { zhChat } from "../../../i18n/catalogs/zh/chat.ts"
import { enChat } from "../../../i18n/catalogs/en/chat.ts"

const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8")

test("5 条排队、区内只露 3 条：底下藏 2 条（被裁一半的也算），1px 内的取整误差不算", () => {
  // 区底 300；行底 220 / 254 / 288 都在里面，322 / 356 被裁掉。
  assert.equal(rowsHiddenBelow([220, 254, 288, 322, 356], 300), 2)
  assert.equal(rowsHiddenBelow([220, 254, 301], 300), 0, "超出 ≤1px 是取整误差")
  assert.equal(rowsHiddenBelow([220, 254, 310], 300), 1, "露一半也算藏着")
  assert.equal(rowsHiddenBelow([], 300), 0)
})

test("「还有 N 条」复用 runtimeQueueMore 文案（中英）", () => {
  assert.equal(zhChat.runtimeQueueMore, "还有 {n} 条")
  assert.match(enChat.runtimeQueueMore, /\{n\}/)
})

test("fold-at-height：从高变矮（跨过 600 线）的那一刻收起；本来就矮时用户点开不被收回去；变高不动", () => {
  assert.equal(refoldOnShort(false, true), true)
  assert.equal(refoldOnShort(true, true), false)
  assert.equal(refoldOnShort(true, false), false)
  assert.equal(refoldOnShort(false, false), false)
})

test("停着 + 对话里有失败卡才给对话区保底；输入框帽檐的「上一条还在准备」不算；没停不算", () => {
  assert.equal(keepThreadForFailureCard(true, "PROVIDER_UNREACHABLE"), true)
  assert.equal(keepThreadForFailureCard(true, null), false)
  assert.equal(keepThreadForFailureCard(true, ""), false)
  assert.equal(keepThreadForFailureCard(true, PREVIOUS_STILL_PREPARING), false)
  assert.equal(keepThreadForFailureCard(false, "PROVIDER_UNREACHABLE"), false)
})

test("接线：排队区用 refoldOnShort / rowsHiddenBelow，挂 data-keep-thread；chat-stage 按它给对话区 min-h，且盖过 min-h-0", () => {
  const dock = src("./queued-followups.tsx")
  assert.match(dock, /refoldOnShort\(wasShort\.current, short\)\) setExpanded\(false\)/)
  assert.match(dock, /data-keep-thread=\{keepThread \? "true" : undefined\}/)
  assert.match(dock, /testId="queued-hidden-below"/)
  assert.match(dock, /label=\{t\("chat\.runtimeQueueMore", \{ n: hiddenBelow \}\)\}/)
  // 小胶囊靠左、不铺满；leo #170 soft-5：画在滚动区（scrollRef）外面、下面单独一行，不盖任何一行；
  // luna #170 01d：挤到一行高（审批卡 + 733×480）放不下就不画，不再贴区底（sticky）盖行。藏行计数和「滚到底」都按里面的滚动区算。
  assert.match(dock, /className="mt-1 w-auto max-w-\[45%\] self-start border-solid bg-background-secondary-default pr-1\.5"/)
  assert.match(dock, /const pill = showHiddenBelowPill\(hiddenBelow, dockHeight\) \?/)
  assert.match(dock, /setHeight\(el\.clientHeight\)/)
  assert.ok(!/sticky bottom-0/.test(dock), "「还有 N 条」不再 sticky 贴区底")
  assert.match(dock, /useRowsHiddenBelow\(scrollRef, mode === "all", items\.length\)/)
  assert.match(dock, /scrollRef\.current\?\.scrollTo\(\{ top: scrollRef\.current\.scrollHeight/)
  assert.match(dock, /<\/>\s+\)\}\s+<\/div>\s+(\{\/\*[^*]*\*\/\}\s+)?\{pill\}\s+<\/div>/, "只在滚动区闭合之后画（不进滚动区）")
  assert.equal(dock.match(/\{pill\}/g)?.length, 1, "只有一处画胶囊")
  // 点开后最少一行（min-h-9）不变：审批卡 + 733×480 时不能为小胶囊把排队区撑高（会压到审批三钮）。
  assert.match(dock, /expanded \? "max-h-\[9\.5rem\] min-h-9 shrink-\[1000\] py-1"/)
  const stage = src("../../app-shell/chat/chat-stage.tsx")
  const base = stage.indexOf("[&:has(>[data-testid=queued-followups-docked])>[data-thread-root]]:min-h-0")
  const keep = stage.indexOf("[&:has(>[data-testid=queued-followups-docked][data-keep-thread=true])>[data-thread-root]]:min-h-[5.5rem]")
  assert.ok(base >= 0 && keep > base, "保底那条在 min-h-0 后面、选择器多一个属性")
  // luna #170 02：保底要放下整张失败卡（说明行 + 按钮 ≈ 74px + 矮窗底边 4px），4.5rem（72px）会把说明行裁掉半行。
  assert.ok(!stage.includes("[data-keep-thread=true])>[data-thread-root]]:min-h-[4.5rem]"))
})

test("leo soft-5：「还有 N 条」单独一行要 64px（padding 8 + 一行 28 + 间距 4 + 胶囊 24），够就画在下面，不够就不画（luna 01d，不再贴区底）", () => {
  assert.equal(PILL_BELOW_MIN_DOCK_PX, 64)
  assert.equal(pillFitsBelow(152), true) // max-h-[9.5rem]
  assert.equal(pillFitsBelow(64), true)
  assert.equal(pillFitsBelow(63), false)
  assert.equal(pillFitsBelow(36), false) // min-h-9：挤到一行高
})

test("luna #170 01d：排队区不到 64px 时不画「还有 N 条」（不盖那一行的字；用户自己在挤的时候点开、没被折回时的兜底）；够高且真有藏行才画", () => {
  assert.equal(showHiddenBelowPill(3, 152), true)
  assert.equal(showHiddenBelowPill(1, 64), true)
  assert.equal(showHiddenBelowPill(3, 63), false)
  assert.equal(showHiddenBelowPill(3, 36), false) // 审批卡 + 733×480：挤到一行高
  assert.equal(showHiddenBelowPill(0, 152), false) // 没藏行
  assert.equal(showHiddenBelowPill(0, 36), false)
  assert.equal(showHiddenBelowPill(2, Number.POSITIVE_INFINITY), true) // 还没量到高度：按放得下
})

test("luna #170 r-luna ①：点开后够高过（≥64px），又被挤到 <64px 且底下藏着行 → 折回一行；本来就挤时用户点开不折；没藏行不折", () => {
  // 点开时 152px，审批卡 / 输入框长高把排队区挤到 36px（733×480）：折。
  assert.equal(foldOnSqueeze(true, 36, 2), true)
  assert.equal(foldOnSqueeze(true, 63, 1), true)
  // 64 还放得下「还有 N 条」那一行：不折。
  assert.equal(foldOnSqueeze(true, 64, 2), false)
  // 本来就挤（这次点开后从没够高过）：用户自己点开的不收回（和 refoldOnShort 一个规矩）。
  assert.equal(foldOnSqueeze(false, 36, 2), false)
  // 全露着（1 条）：不折。
  assert.equal(foldOnSqueeze(true, 36, 0), false)
})

test("luna #170 r-luna ① 接线：挤到 <64px 折成一行（squeezed）；空间回来不自己展开，只有用户点；停着时用「已暂停 · 排队 N 条」那一行", () => {
  const dock = src("./queued-followups.tsx")
  // 折回：收起 + 记 squeezed；用户点开（expand）才清。
  assert.match(dock, /const foldSqueezed = useCallback\(\(\) => \{\s+setExpanded\(false\)\s+setSqueezed\(true\)/)
  assert.match(dock, /const expand = useCallback\(\(\) => \{\s+setSqueezed\(false\)\s+setExpanded\(true\)/)
  assert.equal(dock.match(/setSqueezed\(false\)/g)?.length, 1, "只有用户点开清 squeezed（审批处理完 / 空间回来都不清）")
  assert.doesNotMatch(dock, /setExpanded\(true\)\s*\}?\s*,\s*\[approvalId/, "审批换了不自己展开")
  assert.equal(dock.match(/setExpanded\(true\)/g)?.length, 1, "展开只有 expand 这一处")
  assert.match(dock, /if \(paused && \(pausedCollapsed\(short, expanded\) \|\| squeezed\)\)/)
  assert.match(dock, /const mode = dockMode\(items\.length, tight, expanded, squeezed\)/)
  assert.match(dock, /useFoldOnSqueeze\(expanded, dockHeight, hiddenBelow, foldSqueezed\)/)
  assert.match(dock, /const dockHeight = useDockHeight\(ref, expanded \|\| hiddenBelow > 0\)/)
  assert.match(dock, /if \(foldOnSqueeze\(seenRoomy\.current, dockHeight, hiddenBelow\)\) \{\s+seenRoomy\.current = false\s+fold\(\)/)
  assert.match(dock, /if \(pillFitsBelow\(dockHeight\)\) seenRoomy\.current = true/)
  assert.match(dock, /if \(!expanded\) \{\s+seenRoomy\.current = false/)
  // 不量了就忘掉旧高度：下次点开不拿上回的 152px 当「够高过」。
  assert.match(dock, /if \(!enabled \|\| !el\) \{[^}]*setHeight\(Number\.POSITIVE_INFINITY\)/)
  // 审批时（说明行让位）折起来的那一行：队列停着也说「已暂停 · 排队 N 条」。
  assert.match(dock, /label=\{t\(queuePaused \? "chat\.queuePausedCollapsed" : "chat\.runtimeQueueCount", \{ n: items\.length \}\)\}/)
})
