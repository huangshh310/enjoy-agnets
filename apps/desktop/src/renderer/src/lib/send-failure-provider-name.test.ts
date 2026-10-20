import assert from "node:assert/strict"
import { test } from "node:test"
import { sendFailureProviderName } from "./send-failure-provider-name.ts"
import { readFileSync } from "node:fs"

const tools = [
  { id: "amp", label: "Amp" },
  { id: "custom:fake-acp", label: "假本机助手" }
]

test("luna m136b-62：Amp 会话失败卡说 Amp，不说聊天密钥档案名（DeepSeek / E2E Stub Key）", () => {
  assert.equal(sendFailureProviderName({ runtimeId: "amp", tools, displayNames: {}, keyProfileName: "DeepSeek" }), "Amp")
  assert.equal(sendFailureProviderName({ runtimeId: "custom:fake-acp", tools, displayNames: {}, keyProfileName: "E2E Stub Key" }), "假本机助手")
})

test("引擎起了显示名就用显示名；空 / 「未命名」回退品牌名", () => {
  assert.equal(sendFailureProviderName({ runtimeId: "amp", tools, displayNames: { amp: "小安" }, keyProfileName: "DeepSeek" }), "小安")
  assert.equal(sendFailureProviderName({ runtimeId: "amp", tools, displayNames: { amp: "未命名" }, keyProfileName: "DeepSeek" }), "Amp")
})

test("引擎不在列表里也不拿密钥档案顶名，用 runtimeId", () => {
  assert.equal(sendFailureProviderName({ runtimeId: "codex", tools, displayNames: {}, keyProfileName: "DeepSeek" }), "codex")
})

test("Enjoy 本地 / 还没定引擎：照旧说密钥档案名", () => {
  assert.equal(sendFailureProviderName({ runtimeId: "enjoy-local", tools, displayNames: {}, keyProfileName: "DeepSeek" }), "DeepSeek")
  assert.equal(sendFailureProviderName({ runtimeId: null, tools, displayNames: {}, keyProfileName: "DeepSeek" }), "DeepSeek")
})

// 接线：三张失败卡都走 useSendFailureProviderName（node:test 渲染不了 .tsx，只能读源码）。
test("接线：连不上 / 密钥没通过 / 拒绝·额度 三张卡的 {name} 都跟前台引擎走", () => {
  for (const file of ["thread-credential-network-notice.tsx", "thread-credential-invalid-notice.tsx", "thread-credential-restricted-notice.tsx"]) {
    const src = readFileSync(new URL(`../components/ai-chat/thread/${file}`, import.meta.url), "utf8").replace(/\/\/.*$/gm, "")
    assert.match(src, /const name = useSendFailureProviderName\(\)/, file)
    assert.ok(!/name = defaultProviderLabel\(/.test(src), `${file} 又拿密钥档案名当 {name}`)
  }
  const hook = readFileSync(new URL("../hooks/use-send-failure-provider-name.ts", import.meta.url), "utf8")
  assert.match(hook, /runtimeId = useChatStore\(\(state\) => state\.runtimeId\)/)
  assert.match(hook, /sendFailureProviderName\(\{\s*runtimeId,/)
})
