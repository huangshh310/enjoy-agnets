/**
 * 本机已有技能自动纳管测试：即使 manifest.json 为空，也必须自动发现本机 Agent 目录下的技能并呈现为来源组。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  overviewSkillSources,
  detailSkillSource,
  configureSkillSource,
  deploySkillSource,
  deleteSourceSkill,
  removeSkillSource,
  updateAllSkillSources,
  type SkillSourceContext
} from "./source-service.ts"
import { readManifest } from "./source-state.ts"

test("overviewSkillSources 能够自动发现本机 Agent 技能目录下的已有技能", () => {
  const root = mkdtempSync(join(tmpdir(), "enjoy-auto-skills-"))
  try {
    const home = join(root, "home")
    const stateRoot = join(home, ".enjoy-agents", "skill-sources")
    mkdirSync(stateRoot, { recursive: true })

    // 在 ~/.agents/skills 下模拟创建已有技能
    const agentsSkillsDir = join(home, ".agents", "skills", "my-existing-skill")
    mkdirSync(agentsSkillsDir, { recursive: true })
    writeFileSync(
      join(agentsSkillsDir, "SKILL.md"),
      "---\nname: my-existing-skill\ndescription: Already installed locally\n---\n# My Skill"
    )

    const ctx: SkillSourceContext = {
      home,
      stateRoot,
      workspaceRoots: []
    }

    const overview = overviewSkillSources(ctx)
    assert.ok(overview.sources.length > 0, "必须自动发现本地已有技能来源组")
    const agentsSource = overview.sources.find((s) => s.id.includes("agents"))
    assert.ok(agentsSource, "必须包含 agents 技能来源组")
    assert.equal(agentsSource?.skillCount, 1)
    assert.ok(agentsSource?.enabledTargetIds.includes("agents"))
    assert.ok(overview.installedCount >= 1)

    // 检视该组详情
    const detail = detailSkillSource(ctx, agentsSource!.id)
    assert.equal(detail.skills.length, 1)
    assert.equal(detail.skills[0]?.name, "my-existing-skill")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

function makeAgentsFixture(): { ctx: SkillSourceContext; root: string } {
  const root = mkdtempSync(join(tmpdir(), "enjoy-auto-skills-"))
  const home = join(root, "home")
  const stateRoot = join(home, ".enjoy-agents", "skill-sources")
  mkdirSync(stateRoot, { recursive: true })
  const pack = join(home, ".agents", "skills", "my-existing-skill")
  mkdirSync(pack, { recursive: true })
  writeFileSync(
    join(pack, "SKILL.md"),
    "---\nname: my-existing-skill\ndescription: Already installed locally\n---\n# My Skill"
  )
  return { root, ctx: { home, stateRoot, workspaceRoots: [] } }
}

test("configureSkillSource 必须能纳管自动发现来源，而不是 SOURCE_NOT_FOUND", () => {
  const { root, ctx } = makeAgentsFixture()
  try {
    const overview = overviewSkillSources(ctx)
    const agentsSource = overview.sources.find((s) => s.id.includes("agents"))
    assert.ok(agentsSource)

    configureSkillSource(ctx, {
      sourceId: agentsSource!.id,
      selectedSkillIds: agentsSource!.selectedSkillIds,
      enabledTargetIds: ["agents", "enjoy-agents"]
    })

    const persisted = readManifest(ctx.stateRoot).sources.find((row) => row.id === agentsSource!.id)
    assert.ok(persisted, "配置后必须写入 manifest")
    assert.deepEqual(persisted?.enabledTargetIds, ["agents", "enjoy-agents"])

    assert.throws(
      () =>
        configureSkillSource(ctx, {
          sourceId: "does-not-exist",
          selectedSkillIds: [],
          enabledTargetIds: ["enjoy-agents"]
        }),
      /SOURCE_NOT_FOUND/
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("deploySkillSource 投影到自身目录时跳过复制，投影到其它目标时落地", () => {
  const { root, ctx } = makeAgentsFixture()
  try {
    const overview = overviewSkillSources(ctx)
    const agentsSource = overview.sources.find((s) => s.id.includes("agents"))
    assert.ok(agentsSource)

    configureSkillSource(ctx, {
      sourceId: agentsSource!.id,
      selectedSkillIds: agentsSource!.selectedSkillIds,
      enabledTargetIds: ["agents", "enjoy-agents"]
    })

    deploySkillSource(ctx, agentsSource!.id)

    const dest = join(ctx.home, ".enjoy-agents", "skills", "my-existing-skill", "SKILL.md")
    assert.equal(readManifest(ctx.stateRoot).sources[0]?.id, agentsSource!.id)
    assert.equal(existsSync(dest), true)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("deleteSourceSkill 删除本机技能包，来源组仍在", () => {
  const { root, ctx } = makeAgentsFixture()
  try {
    const overview = overviewSkillSources(ctx)
    const agentsSource = overview.sources.find((s) => s.id.includes("agents"))
    assert.ok(agentsSource)
    const pack = join(ctx.home, ".agents", "skills", "my-existing-skill")
    assert.equal(existsSync(pack), true)

    deleteSourceSkill(ctx, agentsSource!.id, "my-existing-skill")

    assert.equal(existsSync(pack), false)
    const after = overviewSkillSources(ctx)
    const leftover = after.sources.find((s) => s.id === agentsSource!.id)
    assert.ok(!leftover || leftover.skillCount === 0)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("updateAllSkillSources 跳过本机来源，updatedCount 为 0", async () => {
  const { root, ctx } = makeAgentsFixture()
  try {
    overviewSkillSources(ctx)
    const result = await updateAllSkillSources(ctx)
    assert.equal(result.updatedCount, 0)
    assert.ok(result.skippedCount >= 1)
    assert.deepEqual(result.errors, [])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("removeSkillSource 隐藏本机发现组且不删技能根", () => {
  const { root, ctx } = makeAgentsFixture()
  try {
    const overview = overviewSkillSources(ctx)
    const agentsSource = overview.sources.find((s) => s.id.includes("agents"))
    assert.ok(agentsSource)
    const rootDir = join(ctx.home, ".agents", "skills")
    removeSkillSource(ctx, agentsSource!.id)
    assert.equal(existsSync(rootDir), true)
    const after = overviewSkillSources(ctx)
    assert.equal(after.sources.some((s) => s.id === agentsSource!.id), false)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
