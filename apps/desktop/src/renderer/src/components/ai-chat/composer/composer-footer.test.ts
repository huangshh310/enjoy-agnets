import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const dir = dirname(fileURLToPath(import.meta.url))

test("顶栏铬序是探索/执行 → 单一引擎芯片 → 思考小档", () => {
  const src = readFileSync(join(dir, "composer-top-chrome.tsx"), "utf8")
  const explore = src.indexOf("<ExploreExecuteToggle")
  const engine = src.indexOf("<AgentPicker")
  const thinking = src.indexOf("<ComposerThinkingChrome")
  assert.ok(explore > 0 && engine > explore && thinking > engine)
  assert.equal(src.includes("<ComposerModelChip"), false)
  assert.equal(src.includes("<SessionGoalChip"), false)
})

test("底栏溢出菜单收目标/阶段", () => {
  const src = readFileSync(join(dir, "composer-footer.tsx"), "utf8")
  assert.match(src, /ComposerOverflowMenu/)
})

test("Composer 脚注是 远程 · host:path，不叠远程≠引擎", () => {
  const src = readFileSync(join(dir, "composer-footer.tsx"), "utf8")
  assert.match(src, /formatComposerRemoteFootnote/)
  assert.match(src, /settings\.workspace\.remoteFootnote/)
  assert.equal(src.includes("remoteNotEngine"), false)
})
