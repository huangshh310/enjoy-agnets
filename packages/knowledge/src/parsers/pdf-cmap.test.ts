import assert from "node:assert/strict"
import { test } from "node:test"
import { mapBytesThroughCmap, parseToUnicodeCmap } from "./pdf-cmap.ts"

test("bfchar 把 CID 映射成 Unicode", () => {
  const cmap = parseToUnicodeCmap(`
begincmap
2 beginbfchar
<0001> <4F60>
<0002> <597D>
endbfchar
endcmap
`)
  assert.equal(cmap.get(1), "你")
  assert.equal(cmap.get(2), "好")
  const bytes = Uint8Array.from([0, 1, 0, 2])
  assert.equal(mapBytesThroughCmap(bytes, cmap), "你好")
})

test("bfrange 递增与数组", () => {
  const cmap = parseToUnicodeCmap(`
beginbfrange
<0041> <0043> <0041>
<0001> <0002> [<4F60> <597D>]
endbfrange
`)
  assert.equal(cmap.get(0x41), "A")
  assert.equal(cmap.get(0x43), "C")
  assert.equal(cmap.get(1), "你")
  assert.equal(cmap.get(2), "好")
})

test("没有映射返回 null，不把 CID 装成正文", () => {
  const cmap = parseToUnicodeCmap("begincmap endcmap")
  assert.equal(mapBytesThroughCmap(Uint8Array.from([0, 1]), cmap), null)
})
