/**
 * Customize 路径白名单：不能把工作区整棵树或任意盘符当成可删根。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { join } from "node:path"
import {
  assertAllowedRuleFile,
  assertAllowedSkillPackage,
  matchRegisteredWorkspace
} from "./customize-roots.ts"

const ws = "C:/proj/app"
const home = "C:/users/me"

test("matchRegisteredWorkspace 只接受已登记根", () => {
  const matched = matchRegisteredWorkspace("C:/proj/app", [ws, "C:/other"])
  assert.ok(matched.toLowerCase().includes("app"))
  assert.throws(() => matchRegisteredWorkspace("C:/Windows", [ws]))
})

test("规则文件允许 .cursor/rules 与根上 AGENTS.md，拒绝源码", () => {
  const mdc = assertAllowedRuleFile(join(ws, ".cursor", "rules", "a.mdc"), [ws], home)
  assert.ok(mdc.toLowerCase().includes("a.mdc"))
  const agents = assertAllowedRuleFile(join(ws, "AGENTS.md"), [ws], home)
  assert.ok(agents.toLowerCase().endsWith("agents.md"))
  assert.throws(() => assertAllowedRuleFile(join(ws, "src", "index.ts"), [ws], home))
  assert.throws(() => assertAllowedRuleFile("C:/Windows/system.ini", [ws], home))
})

test("技能包必须是 skill root 的直接子目录", () => {
  const pkg = join(ws, ".agents", "skills", "foo")
  const allowed = assertAllowedSkillPackage(pkg, [ws], home).replaceAll("\\", "/").toLowerCase()
  assert.equal(allowed, pkg.replaceAll("\\", "/").toLowerCase())
  assert.throws(() => assertAllowedSkillPackage(join(ws, ".agents", "skills"), [ws], home))
  assert.throws(() => assertAllowedSkillPackage(ws, [ws], home))
})
