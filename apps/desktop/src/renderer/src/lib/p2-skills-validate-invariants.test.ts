/**
 * P2 Skills 规范校验 soft · 源码不变式（leo Must×5 tip 自核）
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

test("Must1 · frontmatter 校验对齐 Agent Skills（name 正则 · 64/1024/500）", () => {
  const fm = read("packages/ipc-contract/src/skill-frontmatter.ts")
  assert.match(fm, /AGENT_SKILL_NAME_RE\s*=\s*\/\^\[a-z0-9\]\+\(-\[a-z0-9\]\+\)\*\$\//)
  assert.match(fm, /AGENT_SKILL_NAME_MAX\s*=\s*64/)
  assert.match(fm, /AGENT_SKILL_DESCRIPTION_MAX\s*=\s*1024/)
  assert.match(fm, /AGENT_SKILL_COMPATIBILITY_MAX\s*=\s*500/)
  assert.match(fm, /export function validateSkillFrontmatter/)
  const skills = read("packages/ipc-contract/src/skills.ts")
  assert.match(skills, /AgentSkillName/)
  assert.match(skills, /AgentSkillDescription/)
  assert.match(skills, /SkillCreateInput/)
})

test("Must2 · 红线：allowed-tools 仅展示；不进 resolveToolApproval", () => {
  const service = read("apps/desktop/src/main/services/skills-service.ts")
  assert.match(service, /allowed-tools/)
  assert.match(service, /仅展示/)
  assert.doesNotMatch(service, /resolveToolApproval/)
  assert.doesNotMatch(service, /alwaysAllow|Always-allow|preApprove|pre-approve/)

  const approval = read("packages/agent-core/src/tool-approval.ts")
  assert.doesNotMatch(approval, /allowed-tools|allowedTools|skills-service|parseSkillFile/)

  const inspector = read(
    "apps/desktop/src/renderer/src/components/skills/components/detail/skill-doc-inspector.tsx"
  )
  assert.match(inspector, /工具名单（仅展示）|allowedToolsLabel/)
  assert.match(inspector, /不会自动批准工具|allowedToolsHint/)
  assert.doesNotMatch(inspector, /text-state-success.*已批准|已批准工具|bg-state-success.*批准/)
})

test("Must3 · 新建 fail-closed：合法才写；禁 _；禁静默截断", () => {
  const service = read("apps/desktop/src/main/services/skills-service.ts")
  assert.match(service, /validateSkillFrontmatter/)
  assert.match(service, /throw new Error/)
  assert.match(service, /includes\("_"\)/)
  assert.match(service, /禁 `_`/)
  assert.doesNotMatch(service, /\[\^a-z0-9_-\]/)
  const dialog = read(
    "apps/desktop/src/renderer/src/components/skills/components/create-skill-dialog.tsx"
  )
  assert.match(dialog, /replace\(\/\[\^a-z0-9-\]\/g,\s*""\)/)
  assert.match(dialog, /disabled=\{!canCreate \|\| busy\}/)
  assert.match(dialog, /skillNameHint|validateSkillFrontmatter/)
})

test("Must4 · 已装旁注不删；trigger 本地呼号不升格", () => {
  const service = read("apps/desktop/src/main/services/skills-service.ts")
  assert.match(service, /issues/)
  // parse/list 路径不得因 validate 调 deleteSkillPackage
  const parseBlock = service.slice(
    service.indexOf("export function parseSkillFile"),
    service.indexOf("export function scanSkillRoot")
  )
  assert.doesNotMatch(parseBlock, /deleteSkillPackage|rmSync/)
  const listBlock = service.slice(
    service.indexOf("export function listInstalledSkills"),
    service.indexOf("export function readSkillContent")
  )
  assert.doesNotMatch(listBlock, /deleteSkillPackage|rmSync/)

  const card = read(
    "apps/desktop/src/renderer/src/components/skills/components/skill-item-card.tsx"
  )
  assert.match(card, /skillFrontmatterListNotes/)
  assert.match(card, /localCallsign/)
  const zh = read("apps/desktop/src/renderer/src/i18n/catalogs/zh/pages-skills.ts")
  assert.match(zh, /localCallsign:\s*"本地呼号"/)
  assert.doesNotMatch(zh, /标准字段|标准授权|标准必填/)
})

test("Must5 · Ban 包：无 Goose/预批/E8/I3·ink·⑤/空成功文案", () => {
  const zh = read("apps/desktop/src/renderer/src/i18n/catalogs/zh/pages-skills.ts")
  assert.doesNotMatch(zh, /技能自动批准|全面 skills-ref|性能大升级/)
  const dialog = read(
    "apps/desktop/src/renderer/src/components/skills/components/create-skill-dialog.tsx"
  )
  assert.doesNotMatch(dialog, /Goose|E8|event-batch|Tiptap|技能自动批准|全面 skills-ref/)
  const inspector = read(
    "apps/desktop/src/renderer/src/components/skills/components/detail/skill-doc-inspector.tsx"
  )
  assert.doesNotMatch(inspector, /Goose|技能自动批准|全面 skills-ref/)
  assert.doesNotMatch(inspector, /"已批准"|'已批准'/)
})
