/**
 * WebGL 失败 / context loss 回落 DOM，不抛到调用方。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { attachWebglOrDom, type WebglAddonLike } from "./xterm-webgl.ts"

function fakeAddon(onLoss: (cb: () => void) => void): WebglAddonLike {
  return {
    onContextLoss: onLoss,
    dispose() {
      this.disposed = true
    },
    disposed: false
  } as WebglAddonLike & { disposed: boolean }
}

test("加载成功记 webgl；create 抛错回落 dom", () => {
  const loaded: WebglAddonLike[] = []
  const ok = attachWebglOrDom(
    (addon) => loaded.push(addon),
    () => fakeAddon(() => undefined)
  )
  assert.equal(ok, "webgl")
  assert.equal(loaded.length, 1)
  const failed = attachWebglOrDom(
    () => undefined,
    () => {
      throw new Error("WEBGL_UNAVAILABLE")
    }
  )
  assert.equal(failed, "dom")
})

test("context loss 会 dispose addon，并回报 DOM 回落", () => {
  let lost: (() => void) | undefined
  const modes: Array<"webgl" | "dom"> = []
  const addon = fakeAddon((cb) => {
    lost = cb
  }) as WebglAddonLike & { disposed: boolean }
  attachWebglOrDom(
    () => undefined,
    () => addon,
    (mode) => modes.push(mode)
  )
  assert.equal(addon.disposed, false)
  assert.deepEqual(modes, ["webgl"])
  lost?.()
  assert.equal(addon.disposed, true)
  assert.deepEqual(modes, ["webgl", "dom"])
})

test("loadAddon 抛错也回落 DOM", () => {
  const result = attachWebglOrDom(
    () => {
      throw new Error("LOAD_FAILED")
    },
    () => fakeAddon(() => undefined)
  )
  assert.equal(result, "dom")
})
