import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("自定义 ACP 在 SSH 上拒绝本机 cwd，catalog ACP 走 pool 闸", () => {
  const src = readFileSync(new URL("./open-acp-stream.ts", import.meta.url), "utf8")
  assert.match(src, /自定义助手暂不支持远程工作区/)
  assert.match(src, /looksLikeSshRoot/)
  assert.match(src, /resolveAcpSpawnDirect/)
  assert.match(src, /thoughtLevel: input.thoughtLevel/)
  assert.equal(src.includes("thoughtLevel: input.thoughtLevel ?? input.effort"), false)
})
