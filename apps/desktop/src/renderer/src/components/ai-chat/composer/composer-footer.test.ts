import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const dir = dirname(fileURLToPath(import.meta.url))

test("Composer 脚注是 远程 · host:path，不叠远程≠引擎", () => {
  const src = readFileSync(join(dir, "composer-footer.tsx"), "utf8")
  assert.match(src, /formatComposerRemoteFootnote/)
  assert.match(src, /settings\.workspace\.remoteFootnote/)
  assert.equal(src.includes("remoteNotEngine"), false)
})
