/**
 * 发送闸中性条：还差一步 / 先选模型。tsx 不能当值导入，只扫源码。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { zhChat } from "../../../i18n/catalogs/zh/chat.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("NEED_MODEL 与无路线共用中性条，去选择打开 Picker", () => {
  const need = readFileSync(join(dir, "thread-need-model-notice.tsx"), "utf8")
  const none = readFileSync(join(dir, "thread-no-chat-route-notice.tsx"), "utf8")
  const shared = readFileSync(join(dir, "thread-send-gate-notice.tsx"), "utf8")
  const banner = readFileSync(join(dir, "thread-error-banner.tsx"), "utf8")
  assert.match(need, /chat\.needModelNotice/)
  assert.match(need, /chat\.goPickModel/)
  assert.match(need, /setAgentPickerOpen\(true\)/)
  assert.match(need, /thread-need-model-notice/)
  assert.match(shared, /bg-status-yellow-text/)
  assert.match(shared, /bg-text-error-primary/)
  assert.match(shared, /tone === "danger"/)
  assert.match(shared, /\$\{testId\}-action/)
  assert.match(banner, /ThreadNeedModelNotice/)
  const hooksEnd = banner.indexOf("useState(false)")
  const earlyReturn = banner.indexOf('kind === "stopped" || kind === "catch_up_timeout"')
  assert.ok(hooksEnd >= 0 && earlyReturn > hooksEnd)
  assert.match(banner, /ThreadCredentialInvalidNotice/)
  assert.match(banner, /ThreadCredentialNetworkNotice/)
  const invalid = readFileSync(join(dir, "thread-credential-invalid-notice.tsx"), "utf8")
  const network = readFileSync(join(dir, "thread-credential-network-notice.tsx"), "utf8")
  assert.match(invalid, /tone="danger"/)
  assert.match(invalid, /chat\.goFixKey/)
  assert.match(invalid, /providerEditSearch/)
  assert.doesNotMatch(invalid, /goConnect/)
  assert.match(network, /tone="neutral"/)
  assert.match(network, /chat\.resendDraft/)
  assert.match(network, /sendComposerMessage/)
  assert.doesNotMatch(invalid, /401|403|ECONNREFUSED/)
  assert.doesNotMatch(network, /ECONNREFUSED|401|403/)
  assert.equal(
    zhChat.credentialInvalidNotice,
    "密钥没通过：{name} 不认这把密钥，消息没发出去。草稿会留着。"
  )
  assert.equal(
    zhChat.credentialNetworkNotice,
    "连不上 {name}，消息没发出去。草稿会留着，检查网络后再试。"
  )
  assert.match(none, /officialProviderSearch/)
  assert.match(none, /CHAT_CONNECT_FROM/)
  assert.doesNotMatch(none, /DeepSeek/)
  assert.doesNotMatch(need, /先选一个模型/)
  assert.equal(zhChat.needModelNotice, "还差一步：选一个模型，才能发消息。草稿会留着。")
  assert.equal(zhChat.goPickModel, "去选择")
})
