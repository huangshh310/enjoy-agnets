/**
 * 扫描算法测试：确保根目录 SKILL.md、skills/ 子目录、以及多级目录均能完整发现。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { findSkillPackagesInDirectory } from "./source-scan.ts"

test("findSkillPackagesInDirectory 能够发现根目录单包、skills/ 子包与直接子目录包", () => {
  const temp = mkdtempSync(join(tmpdir(), "enjoy-scan-test-"))
  try {
    // 1. 根目录单包 (如单一技能仓库)
    const singleRepo = join(temp, "single-repo")
    mkdirSync(singleRepo, { recursive: true })
    writeFileSync(join(singleRepo, "SKILL.md"), "---\nname: single-skill\ndescription: Single\n---\n")

    const singleFound = findSkillPackagesInDirectory(singleRepo)
    assert.equal(singleFound.length, 1)
    assert.equal(singleFound[0]?.name, "single-skill")
    assert.equal(singleFound[0]?.relativeDir, ".")

    // 2. 标准 multi-skill 仓库 (如 gstack, superpowers: skills/<name>/SKILL.md)
    const multiRepo = join(temp, "multi-repo")
    const browseDir = join(multiRepo, "skills", "browse")
    const testDir = join(multiRepo, "skills", "test")
    mkdirSync(browseDir, { recursive: true })
    mkdirSync(testDir, { recursive: true })
    writeFileSync(join(browseDir, "SKILL.md"), "---\nname: browse\ndescription: Web browser\n---\n")
    writeFileSync(join(testDir, "SKILL.md"), "---\nname: test\ndescription: Runner\n---\n")

    const multiFound = findSkillPackagesInDirectory(multiRepo)
    assert.equal(multiFound.length, 2)
    const names = multiFound.map((s) => s.name).sort()
    assert.deepEqual(names, ["browse", "test"])
    assert.ok(multiFound.some((s) => s.relativeDir === "skills/browse" || s.relativeDir === "skills\\browse"))
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
})
