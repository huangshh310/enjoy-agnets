import assert from "node:assert/strict"
import { test } from "node:test"
import { decodeWslList, parseWslDistroNames } from "./wsl-distros.ts"

test("解码 UTF-16 LE 的 wsl -l -q 并丢掉 docker 发行版", () => {
  const utf16 = Buffer.from("Ubuntu\r\ndocker-desktop\r\nDebian\r\n", "utf16le")
  const names = parseWslDistroNames(decodeWslList(utf16))
  assert.deepEqual(names, ["Ubuntu", "Debian"])
})

test("UTF-8 列表同样可用", () => {
  assert.deepEqual(parseWslDistroNames("Ubuntu-22.04\n"), ["Ubuntu-22.04"])
})
