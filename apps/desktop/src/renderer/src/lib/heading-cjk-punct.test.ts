import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))

test("标题档关掉 palt，避免 Linux 全角问号被挤窄", () => {
  const typography = readFileSync(
    join(dir, "../../../../../../packages/ui/styles/typography.css"),
    "utf8"
  )
  assert.match(typography, /"palt" 0/)
  assert.match(typography, /text-title-/)
  const globals = readFileSync(join(dir, "../../../../../../packages/ui/styles/globals.css"), "utf8")
  assert.doesNotMatch(globals, /"palt"\s*1/)
})
