import assert from "node:assert/strict"
import { test } from "node:test"
import { hashBase64, hashBytes } from "./hash.ts"

test("相同字节相同哈希", () => {
  const a = hashBytes(new Uint8Array([1, 2, 3]))
  const b = hashBytes(new Uint8Array([1, 2, 3]))
  assert.equal(a, b)
  assert.equal(a.length, 64)
})

test("base64 与原始字节一致", () => {
  const raw = Buffer.from("hello")
  assert.equal(hashBytes(raw), hashBase64(raw.toString("base64")))
})
