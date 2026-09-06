import assert from "node:assert/strict"
import { test } from "node:test"
import { extractDomainPills } from "./extract-domain-pills.ts"

test("从 bash 命令抽出主机名", () => {
  const pills = extractDomainPills({}, {}, "curl -fsSL https://wttr.in/Shanghai")
  assert.equal(pills.length, 1)
  assert.equal(pills[0]?.label, "wttr.in")
  assert.ok(pills[0]?.url?.startsWith("https://wttr.in/"))
})

test("同一主机去重", () => {
  const pills = extractDomainPills(
    { url: "https://wttr.in/Beijing" },
    {},
    "curl https://wttr.in/Shanghai"
  )
  assert.equal(pills.length, 1)
})

test("拒绝非 http(s)", () => {
  assert.deepEqual(extractDomainPills({ url: "javascript:alert(1)" }, {}), [])
})
