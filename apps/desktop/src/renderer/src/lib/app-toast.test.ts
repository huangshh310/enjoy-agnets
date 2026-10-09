/**
 * 统一 toast 接线：三处入口走同一函数，时长 2400。
 */
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { APP_TOAST_MS } from "./app-toast.ts"

const dir = dirname(fileURLToPath(import.meta.url))
const root = join(dir, "../../../../../..")

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8")
}

test("默认时长对齐旧手写条 2400ms", () => {
  assert.equal(APP_TOAST_MS, 2400)
})

test("App 只挂全局 Toaster，不再挂手写 Host", () => {
  const app = read("apps/desktop/src/renderer/src/App.tsx")
  assert.ok(app.includes("<Toaster"))
  assert.ok(!app.includes("SkillSourceToastHost"))
})

test("三套手写 toast 文件已删除", () => {
  const gone = [
    "apps/desktop/src/renderer/src/components/skills/components/skill-source-toast-host.tsx",
    "apps/desktop/src/renderer/src/components/settings/extensions/curated/curated-toast.tsx",
    "apps/desktop/src/renderer/src/components/ai-chat/composer/session-review/preview-open/session-preview-toast.tsx"
  ]
  for (const rel of gone) assert.equal(existsSync(join(root, rel)), false, rel)
})

test("三处入口走 showAppToast，手写实现已删", () => {
  const skill = read("apps/desktop/src/renderer/src/components/skills/lib/skill-source-toast.ts")
  const pull = read("apps/desktop/src/renderer/src/components/skills/hooks/use-skill-source-pull.ts")
  const curated = read(
    "apps/desktop/src/renderer/src/components/settings/extensions/curated/use-curated-add.ts"
  )
  const preview = read(
    "apps/desktop/src/renderer/src/components/ai-chat/composer/session-review/preview-open/use-open-session-preview.ts"
  )
  assert.ok(skill.includes("showAppToast"))
  assert.ok(pull.includes("showSkillSourceToast"))
  assert.ok(curated.includes("showAppToast"))
  assert.ok(preview.includes("showAppToast"))
  assert.ok(skill.includes("t(") || pull.includes("useT"))
  assert.ok(curated.includes("useT") || curated.includes("t("))
  assert.ok(preview.includes("useT") || preview.includes("t("))
})
