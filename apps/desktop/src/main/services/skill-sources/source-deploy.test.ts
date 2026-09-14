/**
 * 部署边界：目的地必须落在 Customize 技能白名单内。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { copySkillPackToTarget, deploySelectedSkills } from "./source-deploy.ts"

test("部署拒绝白名单外目标", () => {
  const root = mkdtempSync(join(tmpdir(), "enjoy-source-deny-"))
  try {
    const home = join(root, "home")
    const checkout = join(root, "checkout")
    const srcPack = join(checkout, "pack")
    mkdirSync(srcPack, { recursive: true })
    writeFileSync(join(srcPack, "SKILL.md"), "# pack\n")
    assert.throws(
      () =>
        copySkillPackToTarget({
          srcPack,
          sourceRoot: checkout,
          destPack: join(root, "outside", "pack"),
          home,
          workspaceRoots: []
        }),
      /outside allowed skill locations|outside allowed roots/i
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("部署把 checkout 子包投影到 ~/.enjoy-agents/skills", () => {
  const root = mkdtempSync(join(tmpdir(), "enjoy-flow-ok-"))
  try {
    const home = join(root, "home")
    const checkout = join(root, "checkout")
    const srcPack = join(checkout, "pack")
    mkdirSync(srcPack, { recursive: true })
    writeFileSync(join(srcPack, "SKILL.md"), "# pack\n")
    const destPack = join(home, ".enjoy-agents", "skills", "pack")
    copySkillPackToTarget({
      srcPack,
      sourceRoot: checkout,
      destPack,
      home,
      workspaceRoots: []
    })
    const skillFile = join(destPack, "SKILL.md")
    assert.ok(existsSync(skillFile))
    assert.equal(readFileSync(skillFile, "utf8"), "# pack\n")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("部署忽略 ~/.claude 等非宿主目标", () => {
  const root = mkdtempSync(join(tmpdir(), "enjoy-host-only-"))
  try {
    const home = join(root, "home")
    const checkout = join(root, "checkout")
    const srcPack = join(checkout, "pack")
    mkdirSync(srcPack, { recursive: true })
    writeFileSync(join(srcPack, "SKILL.md"), "# pack\n")
    const created = deploySelectedSkills({
      sourceId: "src",
      sourceRoot: checkout,
      selectedRelativeDirs: ["pack"],
      targetIds: ["claude", "enjoy-agents"],
      home,
      workspaceRoots: []
    })
    assert.equal(created.length, 1)
    assert.equal(created[0]?.targetId, "enjoy-agents")
    assert.equal(existsSync(join(home, ".claude", "skills", "pack")), false)
    assert.equal(existsSync(join(home, ".enjoy-agents", "skills", "pack", "SKILL.md")), true)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
