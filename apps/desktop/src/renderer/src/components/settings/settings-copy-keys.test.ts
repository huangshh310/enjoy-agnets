/**
 * 设置页不得把 t() 缺键路径摊上默认面。
 */
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { en } from "../../i18n/catalogs/en/index.ts"
import { zh } from "../../i18n/catalogs/zh/index.ts"

const dir = dirname(fileURLToPath(import.meta.url))
const CALL_RE = /\bt\(\s*["']((?:pages|chat)\.[^"']+)["']/g

function walk(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const next = join(root, name)
    if (statSync(next).isDirectory()) return walk(next)
    return next.endsWith(".ts") || next.endsWith(".tsx") ? [next] : []
  })
}

function lookup(tree: unknown, path: string): unknown {
  return path.split(".").reduce((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined
    return (acc as Record<string, unknown>)[key]
  }, tree)
}

test("设置与遥测页用到的 pages./chat. 键都在词表里，且不是裸路径", () => {
  const keys = new Set<string>()
  for (const root of [dir, join(dir, "../observability"), join(dir, "../account")]) {
    for (const file of walk(root)) {
      const src = readFileSync(file, "utf8")
      for (const match of src.matchAll(CALL_RE)) keys.add(match[1])
    }
  }
  assert.ok(keys.has("pages.observability.allHealthy"))
  for (const key of keys) {
    const zhValue = lookup(zh, key)
    const enValue = lookup(en, key)
    assert.equal(typeof zhValue, "string", `zh missing ${key}`)
    assert.equal(typeof enValue, "string", `en missing ${key}`)
    assert.equal(String(zhValue).startsWith("pages."), false, `zh ${key} is a raw path`)
    assert.equal(String(zhValue).startsWith("chat."), false, `zh ${key} is a raw path`)
  }
})
