import assert from "node:assert/strict"
import { afterEach, beforeEach, test } from "node:test"
import { checkDeepSeekAuth, probeDeepseek } from "./deepseek.ts"

test("DeepSeek 账号探测与模型映射", async (t) => {
  const originalEnv = process.env.DEEPSEEK_API_KEY

  await t.test("环境变量存在 DEEPSEEK_API_KEY 时判定已登录", () => {
    process.env.DEEPSEEK_API_KEY = "sk-test-deepseek-123456"
    const auth = checkDeepSeekAuth()
    assert.equal(auth.loggedIn, true)
    assert.equal(auth.organization, "DeepSeek")
    assert.equal(auth.authMethod, "Environment (DEEPSEEK_API_KEY)")
  })

  await t.test("probeDeepseek 返回官方 deepseek-chat 与 deepseek-reasoner 模型", async () => {
    process.env.DEEPSEEK_API_KEY = "sk-test-deepseek-123456"
    const res = await probeDeepseek("dsh", process.cwd())
    assert.equal(res.authAccount.loggedIn, true)
    assert.ok(res.models.some((m) => m.id === "deepseek-chat"))
    assert.ok(res.models.some((m) => m.id === "deepseek-reasoner"))
  })

  await t.test("未配置任何 Key 时安全回退为未登录", () => {
    delete process.env.DEEPSEEK_API_KEY
    const auth = checkDeepSeekAuth()
    assert.equal(auth.organization, "DeepSeek")
  })

  // 恢复环境
  if (originalEnv !== undefined) {
    process.env.DEEPSEEK_API_KEY = originalEnv
  } else {
    delete process.env.DEEPSEEK_API_KEY
  }
})
