/**
 * K6（luna §15）：停着的排队区点开后被挤 → 挤压态，整行、说明行钉顶、零头还给对话区。只看区自己的实测。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  DOCK_SQUEEZE_OFF,
  foldOnSqueeze,
  nextDockSqueeze,
  pillFitsBelow,
  squeezedDockHeight,
  squeezedLayout,
  squeezedRowsFor
} from "./queue-dock-layout.ts"

const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8")

test("算账：733×480 区 62 → 62 − 4 − 24 − 4 = 30，正好 1 整行（n 不写死）", () => {
  assert.equal(squeezedRowsFor(62), 1)
  assert.equal(squeezedDockHeight(1), 62)
  assert.deepEqual(squeezedLayout(62, 2), { rows: 1, heightPx: 62 })
  assert.equal(squeezedRowsFor(61), 0, "差 1px 放不下一整行")
  assert.equal(squeezedRowsFor(61.6), 1, "0.5px 亚像素容差")
})

test("零头还给对话区：可用 80 仍只取 1 行（区高 62），不露半行", () => {
  assert.deepEqual(squeezedLayout(80, 3), { rows: 1, heightPx: 62 })
  // n×30 + (n−1)×4 + 4 + 24 + 4
  for (const n of [1, 2, 3]) assert.equal(squeezedDockHeight(n), 32 + n * 30 + (n - 1) * 4)
})

test("底下还有行且区 ≥ 64：现网「还有 N 条」会画（pillFitsBelow 不动），先给它留一行再算 n", () => {
  assert.equal(pillFitsBelow(squeezedDockHeight(2)), true)
  // 可用 100：不留胶囊能放 2 行（96），留了胶囊 → 1 行 + 胶囊 28 = 90
  assert.deepEqual(squeezedLayout(100, 4), { rows: 1, heightPx: 90 })
  // 可用 130：不留胶囊 3 行（130），留了胶囊 → 2 行 + 28 = 124
  assert.deepEqual(squeezedLayout(130, 4), { rows: 2, heightPx: 124 })
  // 可用再多也按 max-h 152 封顶
  assert.deepEqual(squeezedLayout(400, 5), { rows: 2, heightPx: 124 })
  // 条数放得下就全放，不留胶囊
  assert.deepEqual(squeezedLayout(130, 2), { rows: 2, heightPx: 96 })
})

test("n < 1 不进挤压态（照现网 foldOnSqueeze 那套，不新增行为）", () => {
  assert.equal(squeezedLayout(40, 2), null)
  const s = nextDockSqueeze(DOCK_SQUEEZE_OFF, { open: true, contentPx: 97, visiblePx: 30, availPx: 40, descPx: 29, count: 2 })
  assert.equal(s.squeezed, false)
})

test("触发只看区自己的实测：内容高 > 可视高才进；放得下（1024 / 1440）不进，像素零变化", () => {
  const fits = nextDockSqueeze(DOCK_SQUEEZE_OFF, { open: true, contentPx: 97, visiblePx: 97, availPx: 300, descPx: 29, count: 2 })
  assert.equal(fits, DOCK_SQUEEZE_OFF)
  const closed = nextDockSqueeze(DOCK_SQUEEZE_OFF, { open: false, contentPx: 200, visiblePx: 30, availPx: 62, descPx: 29, count: 2 })
  assert.equal(closed.squeezed, false)
  const on = nextDockSqueeze(DOCK_SQUEEZE_OFF, { open: true, contentPx: 97, visiblePx: 54, availPx: 62, descPx: 29, count: 2 })
  assert.deepEqual(on, { squeezed: true, needPx: 105, rows: 1, heightPx: 62, blockedBelowPx: null })
})

test("释放留 8px 回滞：可用回到 正常需要 + 8 才退，之前保持（不来回抖）", () => {
  const on = nextDockSqueeze(DOCK_SQUEEZE_OFF, { open: true, contentPx: 97, visiblePx: 54, availPx: 62, descPx: 29, count: 2 })
  const m = (availPx: number) => ({ open: true, contentPx: 92, visiblePx: 58, availPx, descPx: 24, count: 2 })
  assert.equal(nextDockSqueeze(on, m(62)), on, "同一可用高：不写")
  assert.equal(nextDockSqueeze(on, m(112)).squeezed, true, "105 + 8 之前不退")
  assert.equal(nextDockSqueeze(on, m(113)).squeezed, false)
})

test("挤压态里说明行变高（窄到按钮折行）→ 放不下一行就退，并记下可用高，回滞前不再进", () => {
  const on = nextDockSqueeze(DOCK_SQUEEZE_OFF, { open: true, contentPx: 97, visiblePx: 54, availPx: 62, descPx: 29, count: 2 })
  const off = nextDockSqueeze(on, { open: true, contentPx: 110, visiblePx: 58, availPx: 62, descPx: 44, count: 2 })
  assert.equal(off.squeezed, false)
  assert.equal(off.blockedBelowPx, 62)
  const still = nextDockSqueeze(off, { open: true, contentPx: 120, visiblePx: 54, availPx: 66, descPx: 44, count: 2 })
  assert.equal(still.squeezed, false, "回滞 8px 前不再进")
})

test("接线：挤压态 py-0.5、整行高、说明行 sticky 钉顶不透明 24、排队行 snap-start；max-h / 行高 / 判定不动", () => {
  const dock = src("./queued-followups.tsx")
  assert.match(dock, /data-squeezed=\{squeeze\.squeezed \? squeeze\.rows : undefined\}/)
  assert.match(dock, /expanded \? "max-h-\[9\.5rem\] min-h-9 shrink-\[1000\] py-1" : "shrink-0"/)
  assert.match(dock, /expanded && squeeze\.squeezed && "!py-0\.5"/)
  assert.match(dock, /style=\{squeeze\.squeezed \? \{ height: squeeze\.heightPx \} : undefined\}/)
  assert.match(dock, /"snap-y snap-mandatory"/)
  assert.match(dock, /\[&>\[data-testid=queued-user-turn\]\]:snap-start/)
  assert.match(dock, /\[&>\[data-testid=queue-paused-row\]\]:sticky \[&>\[data-testid=queue-paused-row\]\]:top-0/)
  assert.match(dock, /\[&>\[data-testid=queue-paused-row\]\]:bg-background-primary-default/)
  assert.match(dock, /\[&>\[data-testid=queue-paused-row\]>div\]:min-h-6 \[&>\[data-testid=queue-paused-row\]>div\]:py-0/)
  assert.match(dock, /scrollPaddingTop: squeeze\.descPx \+ DOCK_ROW_GAP_PX/)
  // 只在停着（有说明行）且点开时进；不看窗宽 / 语言
  assert.match(dock, /useDockSqueeze\(ref, scrollRef, expanded && paused != null && mode === "all", items\.length\)/)
  assert.doesNotMatch(dock.slice(dock.indexOf("function useDockSqueeze")), /innerWidth|matchMedia|useShortWindow|lang/)
  // 挤压态区高是自己收的：foldOnSqueeze 判定不动，喂可用高（不然「零头还给对话区」会被当成被挤、折回去）
  assert.match(dock, /useFoldOnSqueeze\(expanded, squeeze\.squeezed \? squeeze\.availPx : dockHeight, hiddenBelow, autoFolded, foldSqueezed\)/)
  // 不加渐隐
  assert.doesNotMatch(dock, /mask-image|bg-gradient|fade/i)
  // 排队行组件本身不动（行高 30 = py-0.5 + 行内钮）
  const turn = src("./turns/queued-user-turn.tsx")
  assert.doesNotMatch(turn, /snap-/)
})

test("#228 S2（跟进 ③）：用 useDockSqueeze 源码里真实的 availPx / slack 式子闭环求值——挤压后零头还给对话区，下一帧可用高仍 = 改前 D；挤压态不抖、foldOnSqueeze 处处与改前一致", () => {
  // 旧写法在测试里自己拼 availPx = h + max(0, D − h)，D ≥ h 时恒等于 D，hook 的式子改成什么都不会红。
  // 这里直接取 hook 源码里的式子求值：区高 dockPx、对话区多出 min-height 的那截 slack 都按真实排法喂。
  const dock = src("./queued-followups.tsx")
  const hook = dock.slice(dock.indexOf("function useDockSqueeze"), dock.indexOf("const SQUEEZE_VIEW_OFF"))
  // slack 只读对话区（data-thread-root）实测高 − 它的 min-height（不读窗宽、不读排队区自己）
  assert.match(hook, /const thread = column\?\.querySelector<HTMLElement>\(":scope > \[data-thread-root\]"\)/)
  assert.equal(
    /const slack = (.+)\n/.exec(hook)?.[1],
    "thread.getBoundingClientRect().height - (parseFloat(getComputedStyle(thread).minHeight) || 0)"
  )
  assert.match(hook, /const dockPx = el\.getBoundingClientRect\(\)\.height\n/)
  const expr = /\bavailPx: (.+),\n/.exec(hook)?.[1]
  assert.ok(expr, "useDockSqueeze 里有 availPx: … 这一项")
  const hookAvail = new Function("dockPx", "slack", `return ${expr}`) as (dockPx: number, slack: number) => number
  // 挤压态才把 availPx 交给 foldOnSqueeze（第 203 行），不在挤压态时清零
  assert.match(hook, /const availPx = next\.squeezed \? m\.availPx : 0/)
  assert.match(dock, /useFoldOnSqueeze\(expanded, squeeze\.squeezed \? squeeze\.availPx : dockHeight, hiddenBelow, autoFolded, foldSqueezed\)/)
  // 对话区比 min-height 还矮（slack < 0，比如刚换窗高的那一帧）：不从区高里倒扣
  assert.equal(hookAvail(62, -12), 62, "slack < 0 时可用高 = 区高")
  assert.equal(hookAvail(62, 0), 62)

  const MIN_H = 56
  let squeezedN = 0
  let differsIfRaw = 0
  for (let D = 62; D <= 152; D += 0.5) {
    for (const count of [2, 3, 5]) {
      // 帧 1：还没挤压，区拿到 flex 分的 D，对话区压在 min-height（slack 0）；内容比可视高高 → 进挤压态
      const contentPx = D + 40
      const m1 = { open: true, contentPx, visiblePx: D - 8, availPx: hookAvail(D, 0), descPx: 24, count }
      const s1 = nextDockSqueeze(DOCK_SQUEEZE_OFF, m1)
      if (!s1.squeezed) continue
      squeezedN += 1
      const h = s1.heightPx!
      assert.ok(h <= D + 0.5, `D=${D} 区高取整行、不超过分到的 ${D}（h=${h}）`)
      // 帧 2：区收到整行高 h，零头 D − h 还给对话区（对话区 = min-height + (D − h)）→ hook 再量一次
      const a2 = hookAvail(h, MIN_H + (D - h) - MIN_H)
      // 整行高可比 D 多 0.5px 亚像素容差：那时对话区反而矮了 0.5（slack < 0），可用高按区高 h 算
      assert.equal(a2, Math.max(D, h), `D=${D} count=${count}：挤压后 hook 量到的可用高仍 = 改前 D（零头要得回来）`)
      const s2 = nextDockSqueeze(s1, { ...m1, availPx: a2, visiblePx: h - 8 })
      assert.equal(s2, s1, `D=${D} count=${count}：挤压态下一帧不变（不抖、不释放）`)
      for (const seenRoomy of [false, true]) {
        for (const hidden of [0, 1, 3]) {
          for (const autoFolded of [false, true]) {
            assert.equal(
              foldOnSqueeze(seenRoomy, a2, hidden, autoFolded),
              foldOnSqueeze(seenRoomy, D, hidden, autoFolded),
              `D=${D} count=${count} seen=${seenRoomy} hidden=${hidden} af=${autoFolded}`
            )
            if (foldOnSqueeze(seenRoomy, h, hidden, autoFolded) !== foldOnSqueeze(seenRoomy, D, hidden, autoFolded)) differsIfRaw += 1
          }
        }
      }
    }
  }
  assert.ok(squeezedN > 100, `闭环里真有挤压态（${squeezedN}）`)
  assert.ok(differsIfRaw > 0, "对照：若直接喂收缩后的区高，会在部分几何下改变判定（所以要喂 availPx）")
})
