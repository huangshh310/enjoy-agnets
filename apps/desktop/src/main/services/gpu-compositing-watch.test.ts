import assert from "node:assert/strict"
import { test } from "node:test"
import {
  attachGpuCompositingWatch,
  flagAfterGpuChildGone,
  isGpuChildProcessGone,
  pushGpuCompositingScript,
  pushGpuCompositingToWindows,
  shouldRequestCompleteGpuInfo
} from "./gpu-compositing-watch.ts"

test("只有 type=GPU 的子进程退出才算 GPU 挂了", () => {
  assert.equal(isGpuChildProcessGone({ type: "GPU" }), true)
  assert.equal(isGpuChildProcessGone({ type: "Renderer" }), false)
  assert.equal(isGpuChildProcessGone({}), false)
  assert.equal(isGpuChildProcessGone(undefined), false)
})

test("模拟 GPU child-process-gone 把旗标打成 off", () => {
  assert.equal(flagAfterGpuChildGone({ type: "GPU", }, "on"), "off")
  assert.equal(flagAfterGpuChildGone({ type: "GPU" }, "off"), "off")
  assert.equal(flagAfterGpuChildGone({ type: "Utility" }, "on"), "on")
})

test("watch：child-process-gone GPU 立刻 publish off，不重读 status", () => {
  const published: string[] = []
  const listeners = new Map<string, (...args: unknown[]) => void>()
  const watch = attachGpuCompositingWatch({
    on: (event, listener) => {
      listeners.set(event, listener)
    },
    readFlag: () => {
      throw new Error("gone 路径不得重读，避免启动瞬间的 enabled 把环加回来")
    },
    publish: (flag) => published.push(flag),
    current: "on"
  })
  assert.equal(watch.getFlag(), "on")
  listeners.get("child-process-gone")?.({}, { type: "GPU", reason: "crashed" })
  assert.equal(published.at(-1), "off")
  assert.equal(watch.getFlag(), "off")
})

test("页面还在加载时不把合成旗标排进 executeJavaScript", () => {
  const calls: string[] = []
  pushGpuCompositingToWindows("off", [
    {
      isDestroyed: () => false,
      webContents: {
        isDestroyed: () => false,
        isLoading: () => true,
        executeJavaScript: (code) => {
          calls.push(code)
          return Promise.resolve()
        }
      }
    }
  ])
  assert.deepEqual(calls, [])
})

test("页面加载完才把合成旗标写进 documentElement", () => {
  const calls: string[] = []
  pushGpuCompositingToWindows("on", [
    {
      isDestroyed: () => false,
      webContents: {
        isDestroyed: () => false,
        isLoading: () => false,
        executeJavaScript: (code) => {
          calls.push(code)
          return Promise.resolve()
        }
      }
    }
  ])
  assert.equal(calls.length, 1)
  assert.match(calls[0] ?? "", /data-gpu-compositing", "on"/)
})

test("complete info 进行中不再要第二次", () => {
  assert.equal(shouldRequestCompleteGpuInfo(false), true)
  assert.equal(shouldRequestCompleteGpuInfo(true), false)
})

test("加载中不排脚本，did-finish-load 只补写最新旗标", () => {
  const calls: string[] = []
  let loading = true
  let finish: (() => void) | undefined
  let armed = 0
  const webContents = {
    isDestroyed: () => false,
    isLoading: () => loading,
    once: (_event: "did-finish-load", listener: () => void) => {
      armed += 1
      finish = listener
    },
    executeJavaScript: (code: string) => {
      calls.push(code)
      return Promise.resolve()
    }
  }
  const win = { isDestroyed: () => false, webContents }
  pushGpuCompositingToWindows("off", [win])
  pushGpuCompositingToWindows("on", [win])
  assert.equal(armed, 1)
  assert.deepEqual(calls, [])
  loading = false
  finish?.()
  assert.equal(calls.length, 1)
  assert.match(calls[0] ?? "", /data-gpu-compositing", "on"/)
})

test("watch：gpu-info-update 再读一次并推给渲染层脚本", () => {
  const published: string[] = []
  const listeners = new Map<string, (...args: unknown[]) => void>()
  let live: "on" | "off" = "off"
  attachGpuCompositingWatch({
    on: (event, listener) => {
      listeners.set(event, listener)
    },
    readFlag: () => live,
    publish: (flag) => published.push(flag),
    current: "off"
  })
  live = "on"
  listeners.get("gpu-info-update")?.()
  assert.equal(published.at(-1), "on")
  assert.match(pushGpuCompositingScript("off"), /data-gpu-compositing", "off"/)
})
