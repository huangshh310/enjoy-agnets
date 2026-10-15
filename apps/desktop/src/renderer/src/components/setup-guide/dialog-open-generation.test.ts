/**
 * 向导暂停后马上恢复，遮罩压在内容上（key-invalid-status:170 偶发卡 30s）的修复：每次从关到开换一代 key。
 * 回退成「开着也换代」会让向导每次重渲染都重挂（输入丢失）；回退成「不换代」或去掉 key 接线会复现遮罩压内容。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { nextOpenGeneration } from "./dialog-open-generation.ts"

const dir = dirname(fileURLToPath(import.meta.url))

function run(opens: boolean[]): number[] {
  let state = { open: false, generation: 0 }
  return opens.map((open) => {
    state = nextOpenGeneration(state, open)
    return state.generation
  })
}

test("只有从关到开才进下一代：暂停（关）→ 恢复（开）一定换代", () => {
  // 首开 → 开着重渲染 → 暂停去改密钥 → 关着重渲染 → 存完恢复 → 开着重渲染 → 再暂停 → 再恢复
  assert.deepEqual(run([true, true, false, false, true, true, false, true]), [1, 1, 1, 1, 2, 2, 2, 3])
})

test("开着反复重渲染不换代（否则步骤里的输入每次渲染都丢）；一直关着不换代", () => {
  assert.deepEqual(run([true, true, true, true]), [1, 1, 1, 1])
  assert.deepEqual(run([false, false, false]), [0, 0, 0])
})

test("向导 DialogContent 按本代换 key，且在渲染期同步取代（不是 effect 里）", () => {
  const dialog = readFileSync(join(dir, "setup-guide-dialog.tsx"), "utf8")
  assert.match(dialog, /const openGeneration = useOpenGeneration\(open\)/)
  assert.match(dialog, /<DialogContent\s+key=\{openGeneration\}/)
  const hook = readFileSync(join(dir, "dialog-open-generation.ts"), "utf8")
  assert.doesNotMatch(hook, /useEffect|useLayoutEffect|useState/)
})
