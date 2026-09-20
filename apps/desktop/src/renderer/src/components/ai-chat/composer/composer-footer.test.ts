import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const dir = dirname(fileURLToPath(import.meta.url))

test("顶栏只留探索/执行分段，模型与思考下沉至底栏", () => {
  const src = readFileSync(join(dir, "composer-top-chrome.tsx"), "utf8")
  const footerSrc = readFileSync(join(dir, "composer-footer.tsx"), "utf8")
  assert.ok(src.includes("<ExploreExecuteToggle"))
  assert.equal(src.includes("<ComposerModelChip"), false)
  assert.equal(src.includes("<SessionGoalChip"), false)
  assert.ok(footerSrc.includes("<AgentPicker"))
  assert.ok(footerSrc.includes("<ComposerThinkingChrome"))
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
