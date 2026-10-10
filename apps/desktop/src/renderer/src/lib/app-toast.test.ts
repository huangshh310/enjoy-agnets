/**
 * 统一 toast 接线：三处入口走同一函数，时长 2400。
 */
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { APP_TOAST_MS } from "./app-toast-policy.ts"

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

test("三处入口遵守停留规则：成功 2400，漏更是错误驻留", () => {
  const skill = read("apps/desktop/src/renderer/src/components/skills/lib/skill-source-toast.ts")
  const helper = read("apps/desktop/src/renderer/src/lib/app-toast.ts")
  const curated = read(
    "apps/desktop/src/renderer/src/components/settings/extensions/curated/use-curated-add.ts"
  )
  const preview = read(
    "apps/desktop/src/renderer/src/components/ai-chat/composer/session-review/preview-open/use-open-session-preview.ts"
  )
  assert.ok(helper.includes("closeButton: persist"))
  assert.ok(helper.includes("resolveAppToastDuration"))
  assert.ok(skill.includes('tone: kind === "missed" ? "error" : "success"'))
  assert.ok(curated.includes('tone: "success"'))
  assert.ok(preview.includes('tone: "success"'))
  assert.ok(!curated.includes("action:"))
  assert.ok(!preview.includes("action:"))
  const toaster = read("packages/ui/components/ui/sonner.tsx")
  assert.ok(toaster.includes("closeButton:"))
  assert.ok(toaster.includes("border-border-button-default"))
  assert.ok(toaster.includes("bg-background-primary-default"))
  assert.ok(toaster.includes("APP_TOAST_BOTTOM_OFFSET = 56"))
  assert.ok(toaster.includes("offset={{ bottom: APP_TOAST_BOTTOM_OFFSET }}"))
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
