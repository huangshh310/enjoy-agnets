/**
 * 用户词表守门：默认面禁止裸工具名、bundle id、§ 章节号。
 * 开发者文案档（HMAC / TTL / 裸动作）走显式白名单。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { en } from "./catalogs/en/index.ts"
import { zh } from "./catalogs/zh/index.ts"

/** 仅开发者文案档可留 HMAC / TTL / § / 裸动作模板。 */
const DEV_COPY_ALLOWLIST = new Set([
  "chat.hmacBoundNotice",
  "chat.desktopApprovalTtlFrozen",
  "chat.desktopApprovalDevMeta",
  "chat.desktopBiasAppKey",
  "chat.paneDesktopAppKey"
])

const TOOL_ID_RE = buildToolIdPattern()
const BUNDLE_ID_RE = /\b(?:com|org|net|io)\.[a-z][a-z0-9-]*\.[a-z0-9._-]+\b/i
const SECTION_RE = /§/

test("zh/en 默认词表不含裸工具名、bundle id、§", () => {
  for (const [locale, tree] of [
    ["zh", zh],
    ["en", en]
  ] as const) {
    for (const { key, value } of flattenEntries(tree)) {
      if (DEV_COPY_ALLOWLIST.has(key)) continue
      assert.doesNotMatch(value, TOOL_ID_RE, `${locale} ${key} leaks a tool id: ${value}`)
      assert.doesNotMatch(value, BUNDLE_ID_RE, `${locale} ${key} leaks a bundle id: ${value}`)
      assert.doesNotMatch(value, SECTION_RE, `${locale} ${key} leaks a section mark: ${value}`)
    }
  }
})

test("开发者文案白名单短且都在词表里", () => {
  assert.ok(DEV_COPY_ALLOWLIST.size <= 8)
  const keys = new Set(flattenEntries(zh).map((row) => row.key))
  for (const key of DEV_COPY_ALLOWLIST) {
    assert.ok(keys.has(key), `missing allowlisted key ${key}`)
  }
})

function buildToolIdPattern(): RegExp {
  const names = [
    "read_file",
    "list_dir",
    "repo_outline",
    "todo_write",
    "ask_user_questions",
    "submit_plan",
    "edit_file",
    "write_file",
    "code_mode",
    "git_status",
    "git_diff",
    "git_log",
    "git_commit",
    "git_branch",
    "git_push",
    "browser_navigate",
    "browser_extract_content",
    "desktop_\\w+",
    "desktop_\\*"
  ]
  return new RegExp(`\\b(?:${names.join("|")})\\b`)
}

function flattenEntries(node: unknown, prefix = ""): Array<{ key: string; value: string }> {
  if (typeof node === "string") return prefix ? [{ key: prefix, value: node }] : []
  if (typeof node !== "object" || node === null) return []
  return Object.entries(node).flatMap(([key, value]) => {
    const next = prefix ? `${prefix}.${key}` : key
    return flattenEntries(value, next)
  })
}
