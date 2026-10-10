/**
 * 审查 ⋯ 菜单：复制全部改动在主层；git apply 只进「高级」。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { zh } from "../../../../../../i18n/catalogs/zh/index.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("审查更多菜单把 git apply 收进高级，主层只留复制全部改动", () => {
  const src = readFileSync(join(dir, "review-more-menu.tsx"), "utf8")
  const chat = zh.chat as Record<string, string>
  assert.equal(chat.reviewCopyUnifiedDiff, "复制全部改动")
  assert.equal(chat.reviewAdvanced, "高级")
  assert.equal(chat.reviewCopyGitApply, "复制 git apply 命令")
  assert.match(src, /DropdownMenuSub/)
  assert.match(src, /chat\.reviewAdvanced/)
  assert.match(src, /chat\.reviewCopyGitApply/)
  assert.match(src, /chat\.reviewCopyUnifiedDiff/)
  const applyAt = src.indexOf("chat.reviewCopyGitApply")
  const advancedAt = src.indexOf("chat.reviewAdvanced")
  const copyAt = src.indexOf("chat.reviewCopyUnifiedDiff")
  assert.ok(copyAt >= 0 && advancedAt >= 0 && applyAt >= 0)
  assert.ok(copyAt < advancedAt, "复制全部改动应在高级之前")
  assert.ok(advancedAt < applyAt, "git apply 必须写在高级子菜单里")
})
