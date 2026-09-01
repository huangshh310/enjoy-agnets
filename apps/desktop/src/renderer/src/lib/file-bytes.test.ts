import assert from "node:assert/strict"
import { test } from "node:test"
import { bytesToBase64 } from "./file-bytes.ts"

test("循环编码不因大数组 spread 炸掉", () => {
  const bytes = Uint8Array.from({ length: 80_000 }, (_, index) => index % 256)
  const encoded = bytesToBase64(bytes)
  assert.equal(Buffer.from(encoded, "base64").equals(Buffer.from(bytes)), true)
})
