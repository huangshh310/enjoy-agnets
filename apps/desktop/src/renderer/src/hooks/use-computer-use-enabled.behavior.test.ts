/**
 * #228 leo M1：useComputerUseEnabled 共享读。真把 hook 挂到 React 上跑（无 jsdom，假容器），锁住：
 * - 一个窗口最多一次 builtinTools.getState()，并发挂载共用进行中的读；
 * - 已读过之后重新挂载，首帧就是已知值、不再发 IPC（chip 不再先画「关」）；
 * - 广播 enjoy:computer-use-changed 更新所有订阅者，且之后的挂载首帧用新值；
 * - 读失败不缓存，下次挂载重试。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const g = globalThis as any
let reads = 0
let mode: "fail" | "ok" = "fail"
let enabledInMain = true
const resolvers: Array<() => void> = []
const noop = () => undefined
const fakeDocument: any = { nodeType: 9, addEventListener: noop, removeEventListener: noop }
const container: any = { nodeType: 1, nodeName: "DIV", tagName: "DIV", namespaceURI: "http://www.w3.org/1999/xhtml", ownerDocument: fakeDocument, addEventListener: noop, removeEventListener: noop }
fakeDocument.documentElement = container
const target = new EventTarget()
g.window = {
  ide: {
    builtinTools: {
      getState: () => {
        reads += 1
        if (mode === "fail") return Promise.reject(new Error("bridge down"))
        // 手动放行，便于在读进行中再挂第二个订阅者。
        return new Promise((resolve) => resolvers.push(() => resolve({ computerUse: { enabled: enabledInMain } })))
      }
    }
  },
  document: fakeDocument,
  addEventListener: target.addEventListener.bind(target),
  removeEventListener: target.removeEventListener.bind(target),
  dispatchEvent: target.dispatchEvent.bind(target),
  HTMLIFrameElement: class {},
  event: undefined
}
g.document = fakeDocument
g.IS_REACT_ACT_ENVIRONMENT = true

const React = await import("react")
const { createRoot } = await import("react-dom/client")
const { useComputerUseEnabled, publishComputerUseEnabled } = await import("./use-computer-use-enabled.ts")
const { act } = React

function mount() {
  const frames: boolean[] = []
  function Probe() {
    frames.push(useComputerUseEnabled())
    return null
  }
  const root = createRoot(container)
  return {
    frames,
    async render() {
      await act(async () => root.render(React.createElement(Probe)))
    },
    async unmount() {
      await act(async () => root.unmount())
    }
  }
}

async function flush() {
  await act(async () => {
    while (resolvers.length) resolvers.shift()!()
    await Promise.resolve()
    await Promise.resolve()
  })
}

test("共享读：失败不缓存；并发挂载只读一次；重挂首帧即已知值、0 次 IPC；广播更新订阅者与后续首帧", async () => {
  // 1) 读失败：值为关，不缓存
  const a0 = mount()
  await a0.render()
  await flush()
  assert.equal(reads, 1)
  assert.deepEqual([...new Set(a0.frames)], [false])
  await a0.unmount()

  // 2) 重新挂载会重试；读进行中再挂一个订阅者，共用同一次读
  mode = "ok"
  const a = mount()
  await a.render()
  assert.equal(reads, 2)
  assert.equal(a.frames[0], false, "首次未知时首帧为关（与改前一致）")
  await a.unmount()
  const b = mount()
  await b.render()
  assert.equal(reads, 2, "读进行中的挂载不再发 IPC")
  await flush()
  assert.equal(b.frames.at(-1), true)
  await b.unmount()

  // 3) 已知之后重挂：首帧就是 true，不发 IPC
  for (let i = 0; i < 5; i += 1) {
    const c = mount()
    await c.render()
    assert.equal(c.frames[0], true, `第 ${i + 1} 次重挂首帧`)
    await flush()
    assert.deepEqual([...new Set(c.frames)], [true], "重挂期间不出现「关」的中间帧")
    await c.unmount()
  }
  assert.equal(reads, 2, "重挂 5 次 IPC 仍为 2（其中 1 次是失败重试）")

  // 4) 广播：在挂的订阅者跟着变；之后的挂载首帧用新值；仍不发 IPC
  const d = mount()
  await d.render()
  await act(async () => publishComputerUseEnabled(false))
  assert.equal(d.frames.at(-1), false)
  await d.unmount()
  const e = mount()
  await e.render()
  assert.equal(e.frames[0], false)
  await act(async () => publishComputerUseEnabled(true))
  assert.equal(e.frames.at(-1), true)
  await e.unmount()
  assert.equal(reads, 2)
})
