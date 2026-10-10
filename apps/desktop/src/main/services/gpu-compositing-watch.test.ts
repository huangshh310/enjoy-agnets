import assert from "node:assert/strict"
import { test } from "node:test"
import {
  attachGpuCompositingWatch,
  flagAfterGpuChildGone,
  isGpuChildProcessGone,
  pushGpuCompositingScript
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
