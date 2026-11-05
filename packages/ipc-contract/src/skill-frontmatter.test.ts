/**
 * Agent Skills frontmatter 规范契约单测（Must×1 / Must×3）
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import {
  AGENT_SKILL_NAME_RE,
  skillDescriptionHint,
  skillFrontmatterIssueChip,
  skillFrontmatterListNotes,
  skillNameHint,
  validateSkillFrontmatter
} from "./skill-frontmatter.ts"

const here = dirname(fileURLToPath(import.meta.url))

test("Must1 · 合法 name/description 过门", () => {
  const result = validateSkillFrontmatter({
    name: "api-doc-writer",
    description: "Write API docs from OpenAPI."
  })
  assert.equal(result.ok, true)
  assert.equal(result.issues.length, 0)
  assert.equal(AGENT_SKILL_NAME_RE.test("api-doc-writer"), true)
})

test("Must1 · name 禁 _ / 大写 / 首尾 - / 连续 -- / 超 64", () => {
  assert.equal(skillNameHint(""), "请填写技能英文标识")
  assert.equal(skillNameHint("api_doc"), "名称只能用小写字母、数字和连字符")
  assert.equal(skillNameHint("ApiDoc"), "名称只能用小写字母、数字和连字符")
  assert.equal(skillNameHint("-api"), "名称不能以连字符开头或结尾")
  assert.equal(skillNameHint("api-"), "名称不能以连字符开头或结尾")
  assert.equal(skillNameHint("api--doc"), "名称里不能有连续两个连字符")
  assert.equal(skillNameHint("a".repeat(65)), "名称最多 64 个字符")
  assert.equal(AGENT_SKILL_NAME_RE.test("api_doc"), false)
  assert.equal(AGENT_SKILL_NAME_RE.test("api--doc"), false)
})

test("Must1 · description 必填 1–1024；compatibility 有则 ≤500", () => {
  assert.equal(skillDescriptionHint(""), "请填写功能描述")
  assert.equal(skillDescriptionHint("   "), "请填写功能描述")
  assert.equal(skillDescriptionHint("x".repeat(1025)), "描述最多 1024 个字符")
  const overCompat = validateSkillFrontmatter({
    name: "ok-skill",
    description: "ok",
    compatibility: "c".repeat(501)
  })
  assert.equal(overCompat.ok, false)
  assert.ok(overCompat.issues.some((i) => i.code === "compatibility_too_long"))
})

test("Must3 · 列表旁注与详情 chip 人话；禁恐吓词", () => {
  const bad = validateSkillFrontmatter({ name: "Bad_Name", description: "" })
  const notes = skillFrontmatterListNotes(bad.issues)
  assert.deepEqual(notes, ["名称不合规", "缺描述"])
  assert.doesNotMatch(notes.join(" "), /FAIL|损坏|即将删除|skills-ref/)
  const chips = bad.issues.map(skillFrontmatterIssueChip)
  assert.ok(chips.includes("name · 含非法字符"))
  assert.ok(chips.includes("description · 缺"))
})

test("红线 · 校验源码声明展示元数据；trigger 非必填；无批准调用", () => {
  const src = readFileSync(join(here, "skill-frontmatter.ts"), "utf8")
  assert.match(src, /展示元数据/)
  assert.match(src, /绝不进入审批/)
  assert.match(src, /trigger/)
  assert.match(src, /不进必填|不校验/)
  // 禁止出现实际调用 / 导入审批
  assert.doesNotMatch(src, /import .*resolveToolApproval|resolveToolApproval\(/)
})
