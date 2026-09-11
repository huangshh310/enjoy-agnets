import assert from "node:assert/strict"
import { test } from "node:test"
import { DEFAULT_USER_EMAIL, buildUserCardMenuGroups } from "./sidebar-user-card-items.ts"

test("用户卡不是云账号，菜单没有退出登录和账单", () => {
  assert.equal(DEFAULT_USER_EMAIL, "local")
  const groups = buildUserCardMenuGroups({
    t: (key) => key,
    onNavigate: () => undefined
  })
  const ids = groups.flatMap((group) => group.items.map((item) => item.id))
  assert.ok(!ids.includes("sign-out"))
  assert.ok(!ids.includes("billing"))
  assert.ok(!ids.includes("team-profile"))
  assert.ok(ids.includes("account-profile"))
  assert.ok(ids.includes("general-settings"))
})
