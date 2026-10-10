/**
 * 离开设置后齿轮 / 返回设置必须回到原分段，不要落到通用。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  LAST_SETTINGS_SECTION_KEY,
  readLastSettingsSection,
  settingsReturnSection,
  withSettingsOrigin,
  writeLastSettingsSection
} from "./last-settings-section.ts"

function memory() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    }
  }
}

test("未写入时齿轮落到通用", () => {
  assert.equal(readLastSettingsSection(memory()), "general")
})

test("读写上次设置分段", () => {
  const storage = memory()
  writeLastSettingsSection("extensions", storage)
  assert.equal(storage.getItem(LAST_SETTINGS_SECTION_KEY), "extensions")
  assert.equal(readLastSettingsSection(storage), "extensions")
})

test("非法分段回落通用", () => {
  const storage = memory()
  storage.setItem(LAST_SETTINGS_SECTION_KEY, "studio")
  assert.equal(readLastSettingsSection(storage), "general")
})

test("返回设置优先用查询里的原分段", () => {
  const storage = memory()
  writeLastSettingsSection("skills", storage)
  assert.equal(settingsReturnSection("settings", "extensions", "skills", storage), "extensions")
  assert.equal(settingsReturnSection("settings", undefined, "skills", storage), "skills")
  writeLastSettingsSection("extensions", storage)
  assert.equal(settingsReturnSection("settings", undefined, "skills", storage), "extensions")
  assert.equal(settingsReturnSection("settings", undefined, "mcp", memory()), "mcp")
  assert.equal(settingsReturnSection(undefined, "extensions", "skills", storage), null)
})

test("扩展深链带上 from 与原分段", () => {
  assert.equal(withSettingsOrigin("#/mcp", "extensions"), "#/mcp?from=settings&section=extensions")
  assert.equal(
    withSettingsOrigin("#/skills?tab=curated", "extensions"),
    "#/skills?tab=curated&from=settings&section=extensions"
  )
})
