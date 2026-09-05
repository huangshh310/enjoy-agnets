import assert from "node:assert/strict"
import { test } from "node:test"
import { parseSkillsShHtml } from "./skills-market-fetcher.ts"

const MOCK_SKILLS_SH_HTML = `
<!DOCTYPE html>
<html>
<body>
  <a href="/vercel-labs/skills/find-skills">
    <div>1 find-skills vercel-labs/skills 3.3M</div>
  </a>
  <a href="/mattpocock/skills/grill-me">
    <div>2 grill-me mattpocock/skills 1.1M</div>
  </a>
  <a href="/mattpocock/skills/tdd">
    <div>6 tdd mattpocock/skills 841.7K</div>
  </a>
  <a href="/anthropics/skills/frontend-design">
    <div>5 frontend-design anthropics/skills 855.4K</div>
  </a>
</body>
</html>
`

test("parseSkillsShHtml 能够从 HTML 中正确提取技能并按仓库聚合", () => {
  const sources = parseSkillsShHtml(MOCK_SKILLS_SH_HTML)
  assert.ok(sources.length >= 3)

  const mattpocock = sources.find((s) => s.locator === "mattpocock/skills")
  assert.ok(mattpocock)
  assert.equal(mattpocock.author, "@mattpocock")
  assert.equal(mattpocock.skillCount, 2)
  assert.ok(mattpocock.featuredSkills.includes("grill-me"))
  assert.ok(mattpocock.featuredSkills.includes("tdd"))
  assert.ok(mattpocock.description.includes("Top 2"))

  const vercel = sources.find((s) => s.locator === "vercel-labs/skills")
  assert.ok(vercel)
  assert.equal(vercel.author, "@vercel-labs")
  assert.ok(vercel.featuredSkills.includes("find-skills"))
})

test("空 HTML 返回空数组", () => {
  const sources = parseSkillsShHtml("<html><body>No skills here</body></html>")
  assert.equal(sources.length, 0)
})
