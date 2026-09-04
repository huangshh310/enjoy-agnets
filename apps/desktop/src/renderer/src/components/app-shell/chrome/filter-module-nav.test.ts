import assert from "node:assert/strict"
import { test } from "node:test"
import type { SecondaryNavGroup } from "../../app-pages/secondary-nav.types.ts"
import { filterModuleNavGroups } from "./filter-module-nav.ts"

const Icon = () => null

const groups: SecondaryNavGroup[] = [
  {
    id: "g",
    label: "G",
    items: [
      { id: "mcp", label: "MCP", icon: Icon, keywords: ["tools"] },
      { id: "git", label: "Git", icon: Icon }
    ]
  }
]

test("空查询不过滤", () => {
  assert.equal(filterModuleNavGroups(groups, "", true).length, 1)
  assert.equal(filterModuleNavGroups(groups, "mcp", false)[0]?.items.length, 2)
})

test("按 label 与 keywords 过滤", () => {
  assert.equal(filterModuleNavGroups(groups, "mcp", true)[0]?.items.length, 1)
  assert.equal(filterModuleNavGroups(groups, "tools", true)[0]?.items[0]?.id, "mcp")
  assert.equal(filterModuleNavGroups(groups, "zzz", true).length, 0)
})
