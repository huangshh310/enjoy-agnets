import assert from "node:assert/strict"
import { test } from "node:test"
import { encodePnm } from "./pdf-pnm.ts"

test("RGB 像素写成 P6，长度不够则放弃", () => {
  const pnm = encodePnm(Uint8Array.of(255, 0, 0, 0, 255, 0), 2, 1, 3)
  assert.ok(pnm)
  const text = Buffer.from(pnm).toString("latin1")
  assert.match(text, /^P6\n2 1\n255\n/)
  assert.equal(pnm[pnm.length - 3], 0)
  assert.equal(encodePnm(Uint8Array.of(1, 2), 2, 2, 3), null)
})
