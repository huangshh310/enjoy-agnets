import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const dir = dirname(fileURLToPath(import.meta.url))

test("顶栏铬序是探索/执行 → 思考 → 引擎 → 模型芯片", () => {
  const src = readFileSync(join(dir, "composer-top-chrome.tsx"), "utf8")
  const explore = src.indexOf("<ExploreExecuteToggle")
  const thinking = src.indexOf("<ComposerThinkingChrome")
  const engine = src.indexOf("<AgentPicker")
  const chip = src.indexOf("<ComposerModelChip")
  assert.ok(explore > 0 && thinking > explore && engine > thinking && chip > engine)
})

test("Composer 脚注是 远程 · host:path，不叠远程≠引擎", () => {
  const src = readFileSync(join(dir, "composer-footer.tsx"), "utf8")
  assert.match(src, /formatComposerRemoteFootnote/)
  assert.match(src, /settings\.workspace\.remoteFootnote/)
  assert.equal(src.includes("remoteNotEngine"), false)
})
