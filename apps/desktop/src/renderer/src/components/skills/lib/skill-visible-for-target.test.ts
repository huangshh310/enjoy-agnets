import assert from "node:assert/strict"
import { test } from "node:test"
import {
  hostCatalogEnabled,
  hostEnabledTargetIds,
  nextHostTargetIds,
  skillVisibleForTarget
} from "./skill-visible-for-target.ts"
import type { InstalledSkillItem } from "@enjoy-agents/ipc-contract"

const hostSkill = {
  id: "tdd",
  name: "tdd",
  sourceId: "src",
  sourceName: "src",
  sourceKind: "local",
  enabledTargetIds: ["enjoy-agents"],
  relativeDir: "tdd",
  skillFilePath: "/x/tdd/SKILL.md"
} as InstalledSkillItem

const claudeNative = {
  ...hostSkill,
  id: "review",
  enabledTargetIds: ["claude"]
} as InstalledSkillItem

test("宿主技能对所有助手可见", () => {
  assert.equal(skillVisibleForTarget(hostSkill, "enjoy-agents"), true)
  assert.equal(skillVisibleForTarget(hostSkill, "claude"), true)
})

test("各家目录技能只在该助手筛选中可见", () => {
  assert.equal(skillVisibleForTarget(claudeNative, "claude"), true)
  assert.equal(skillVisibleForTarget(claudeNative, "enjoy-agents"), false)
  assert.equal(skillVisibleForTarget(claudeNative, "cursor"), false)
})

test("卡片徽标只保留宿主目录", () => {
  assert.deepEqual(hostEnabledTargetIds(["claude", "enjoy-agents", "cursor"]), ["enjoy-agents"])
  assert.equal(hostCatalogEnabled(["claude"]), false)
  assert.equal(hostCatalogEnabled(["workspace-agents"]), true)
})

test("整备舱切换只动宿主目标，点家目录则导入 enjoy-agents", () => {
  assert.deepEqual(nextHostTargetIds(["enjoy-agents"], "enjoy-agents"), [])
  assert.deepEqual(nextHostTargetIds([], "enjoy-agents"), ["enjoy-agents"])
  assert.deepEqual(nextHostTargetIds(["claude"], "cursor"), ["claude", "enjoy-agents"])
  assert.deepEqual(nextHostTargetIds(["enjoy-agents"], "claude"), ["enjoy-agents"])
})
