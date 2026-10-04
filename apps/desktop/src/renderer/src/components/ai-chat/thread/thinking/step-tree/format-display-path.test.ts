import assert from "node:assert/strict"
import { test } from "node:test"
import { formatDisplayPath } from "./format-display-path.ts"

test("匹配工作区根目录时剥离前缀返回相对路径", () => {
  const root = "/Users/huangshh/workspace/demo/abc"
  const file = "/Users/huangshh/workspace/demo/abc/package.json"
  assert.equal(formatDisplayPath(file, "package.json", root), "package.json")

  const nested = "/Users/huangshh/workspace/demo/abc/src/app/page.tsx"
  assert.equal(formatDisplayPath(nested, "page.tsx", root), "src/app/page.tsx")
})

test("无工作区或不匹配时截断冗长绝对路径", () => {
  const file = "/Users/huangshh/workspace/demo/abc/package.json"
  assert.equal(formatDisplayPath(file, "package.json", null), "abc/package.json")
})

test("普通相对路径保持原样", () => {
  assert.equal(formatDisplayPath("src/components/button.tsx", "button.tsx", null), "src/components/button.tsx")
  assert.equal(formatDisplayPath("README.md", "README.md", null), "README.md")
})

test("Windows 盘符按绝对路径折叠", () => {
  assert.equal(
    formatDisplayPath("C:\\Users\\dev\\demo\\src\\Button.tsx", "Button.tsx", null),
    "src/Button.tsx"
  )
})
