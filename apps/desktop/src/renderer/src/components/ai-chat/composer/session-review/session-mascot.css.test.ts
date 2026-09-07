import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "session-mascot.css"), "utf8")

test("走动盒子不定死 animation，left 交给 WAAPI", () => {
  assert.match(css, /\.session-mascot-walk\s*\{[^}]*position:\s*absolute/s)
  assert.doesNotMatch(css, /@keyframes session-mascot-walk/)
})

test("有马里奥起跳，降动效不能 animation:none 冻住", () => {
  assert.match(css, /@keyframes session-mascot-leap/)
  const reduce = css.split("prefers-reduced-motion")[1] ?? ""
  assert.doesNotMatch(reduce, /animation:\s*none/)
})
