/**
 * P2 E8 提示收藏 soft · 源码不变式（leo Must×6 tip 自核）
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "../../../../../..")

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8")
}

/** 去掉块/行注释后再断言，避免「禁 XXX」说明句误伤。 */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
}

test("Must1 · 独立薄库 composer.prompt-library；.strict() + 禁授权键；≠ presets", () => {
  const schema = read("packages/ipc-contract/src/prompt-library.ts")
  assert.match(schema, /PROMPT_LIBRARY_ALLOWED_KEYS/)
  assert.match(schema, /PROMPT_LIBRARY_FORBIDDEN_KEYS/)
  assert.match(schema, /\.strict\(\)/)
  assert.match(schema, /PROMPT_LIBRARY_TEXT_MAX/)
  assert.match(schema, /alwaysAllow/)
  assert.match(schema, /allowlist/)
  assert.match(schema, /allowedTools/)
  assert.match(schema, /runtimeId/)
  assert.match(schema, /desktopBias/)
  assert.match(schema, /禁 strip-then-save|禁洗白|洗白/)
  assert.doesNotMatch(codeOnly(schema), /COMPOSER_PRESET_/)
  assert.doesNotMatch(codeOnly(schema), /from\s+".\/composer-preset"/)

  const main = read("apps/desktop/src/main/services/composer-prompt-library.ts")
  assert.match(main, /composer\.prompt-library/)
  assert.match(main, /PromptLibraryEntry\.safeParse/)
  assert.match(main, /PROMPT_LIBRARY_SOFT_CAP|MAX_ENTRIES/)
  assert.doesNotMatch(codeOnly(main), /composer\.presets/)
  assert.doesNotMatch(main, /stripForbidden|omit\(.*alwaysAllow|wash/)
})

test("Must2 · 面板 = 本会话召回 ∪ 库内星标；可搜；空态诚实；不做全库引擎", () => {
  const merge = read(
    "apps/desktop/src/renderer/src/components/ai-chat/composer/prompt-library/merge-prompt-library-rows.ts"
  )
  assert.match(merge, /sessionPrompts/)
  assert.match(merge, /starred/)
  assert.match(merge, /query/)
  assert.doesNotMatch(codeOnly(merge), /elastic|meilisearch|fullTextSearch/)

  const pop = read(
    "apps/desktop/src/renderer/src/components/ai-chat/composer/prompt-library/composer-prompt-library-popover.tsx"
  )
  assert.match(pop, /prompt-library-empty/)
  assert.match(pop, /prompt-library-search/)
  assert.match(pop, /promptLibrarySearch/)
  assert.match(pop, /promptLibraryEmpty|promptLibraryNoMatch/)
})

test("Must3 · 插入只写当前草稿；不 submit；允许 running 预填；勿套 preset 早退", () => {
  const insert = read(
    "apps/desktop/src/renderer/src/components/ai-chat/composer/prompt-library/insert-prompt-library.ts"
  )
  assert.match(insert, /setComposer/)
  assert.doesNotMatch(codeOnly(insert), /submitComposer|sendComposerMessage/)
  assert.doesNotMatch(codeOnly(insert), /running\s*\|\|\s*pendingApproval/)
  assert.doesNotMatch(codeOnly(insert), /clearComposerDraftChips|clearComposerAssets/)

  const btn = read(
    "apps/desktop/src/renderer/src/components/ai-chat/composer/prompt-library/composer-prompt-library-button.tsx"
  )
  assert.match(btn, /insertPromptLibraryText/)
  assert.doesNotMatch(codeOnly(btn), /submitComposer|applyComposerPreset/)
})

test("Must4 · 星标 ≠ 授权；禁 Always-allow / 已批准 / 跳过审批文案", () => {
  const zh = read("apps/desktop/src/renderer/src/i18n/catalogs/zh/chat.ts")
  assert.match(zh, /promptLibraryTitle:\s*"提示收藏"/)
  assert.match(zh, /promptLibraryInserted:\s*"已插入"/)
  assert.doesNotMatch(zh, /promptLibrary\w+:\s*"[^"]*(已批准|已放行|Always-allow|自动批准)/)

  const pop = read(
    "apps/desktop/src/renderer/src/components/ai-chat/composer/prompt-library/composer-prompt-library-popover.tsx"
  )
  assert.doesNotMatch(codeOnly(pop), /Always-allow|resolveToolApproval|allowed-tools/)

  const schema = read("packages/ipc-contract/src/prompt-library.ts")
  assert.match(schema, /alwaysAllow/)
})

test("Must5 · 与 Recipe 表面分开；Composer 旁 mute 书签；不进启动预设", () => {
  const footer = read("apps/desktop/src/renderer/src/components/ai-chat/composer/composer-footer.tsx")
  assert.match(footer, /ComposerPromptLibraryButton/)
  const attach = footer.indexOf("<ComposerAttachMenu")
  const library = footer.indexOf("<ComposerPromptLibraryButton")
  const picker = footer.indexOf("<AgentPicker")
  assert.ok(attach >= 0 && library > attach && picker > library)

  const btn = read(
    "apps/desktop/src/renderer/src/components/ai-chat/composer/prompt-library/composer-prompt-library-button.tsx"
  )
  assert.match(btn, /RiBookmarkLine/)
  assert.match(btn, /prompt-library-button/)
  assert.doesNotMatch(codeOnly(btn), /composer-preset|ComposerPreset|applyComposerPreset/)

  const main = read("apps/desktop/src/main/services/composer-prompt-library.ts")
  assert.doesNotMatch(codeOnly(main), /ComposerPreset|composer\.presets/)
})

test("Must6 · 无「设成每天跑」假入口；↑/↓ 零回归；禁空成功禁词", () => {
  const pop = read(
    "apps/desktop/src/renderer/src/components/ai-chat/composer/prompt-library/composer-prompt-library-popover.tsx"
  )
  assert.doesNotMatch(codeOnly(pop), /设成每天跑|requestAutomationDraft/)

  const btn = read(
    "apps/desktop/src/renderer/src/components/ai-chat/composer/prompt-library/composer-prompt-library-button.tsx"
  )
  assert.doesNotMatch(codeOnly(btn), /设成每天跑/)

  const zh = read("apps/desktop/src/renderer/src/i18n/catalogs/zh/chat.ts")
  assert.doesNotMatch(zh, /promptLibrary\w+:\s*"[^"]*(设成每天跑|全面提示库|Goose 兼容|技能自动批准)/)

  const history = read("apps/desktop/src/renderer/src/hooks/composer-prompt-history.ts")
  assert.match(history, /applyRecallUp/)
  assert.match(history, /applyRecallDown/)
  const hook = read("apps/desktop/src/renderer/src/hooks/use-composer-prompt-history.ts")
  assert.match(hook, /listRecallPrompts/)
  assert.match(hook, /ArrowUp/)
  assert.match(hook, /ArrowDown/)
})
