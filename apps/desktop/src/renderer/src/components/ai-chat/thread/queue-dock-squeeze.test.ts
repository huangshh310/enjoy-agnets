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

test("#228 S2：挤压态喂 availPx（区高 + 对话区多出的那截）与改前喂 dockHeight，foldOnSqueeze 判定处处一致", () => {
  // 改前：区拿到 flex 分的 D，对话区压在 min-height（多出 0）。挤压态：区收到整行高 h，零头 D − h 还给对话区。
  let differsIfRaw = 0
  for (let D = 62; D <= 152; D += 0.5) {
    for (const count of [2, 3, 5]) {
      const layout = squeezedLayout(D, count)
      if (!layout) continue
      const h = layout.heightPx
      const availPx = h + Math.max(0, D - h)
      for (const seenRoomy of [false, true]) {
        for (const hidden of [0, 1, 3]) {
          for (const autoFolded of [false, true]) {
            assert.equal(
              foldOnSqueeze(seenRoomy, availPx, hidden, autoFolded),
              foldOnSqueeze(seenRoomy, D, hidden, autoFolded),
              `D=${D} count=${count} seen=${seenRoomy} hidden=${hidden} af=${autoFolded}`
            )
            if (foldOnSqueeze(seenRoomy, h, hidden, autoFolded) !== foldOnSqueeze(seenRoomy, D, hidden, autoFolded)) differsIfRaw += 1
          }
        }
      }
    }
  }
  assert.ok(differsIfRaw > 0, "对照：若直接喂收缩后的区高，会在部分几何下改变判定（所以要喂 availPx）")
})
