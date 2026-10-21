/**
 * 失败卡的供应商名：前台引擎是 ACP / CLI 时说引擎名，Enjoy 本地说供应商（品牌名 / 端点主机名 / 「模型服务」），从不说密钥档案名（见 lib/send-failure-provider-name）。
 */
import { useChatReadiness } from "./use-chat-readiness"
import { useSettingsSnapshot } from "./use-settings-snapshot"
import { useChatStore } from "../stores/chat-store"
import { defaultProviderFace } from "../lib/default-provider-label"
import type { ProviderFace } from "../lib/provider-face"
import { sendFailureProviderName } from "../lib/send-failure-provider-name"

/** 返回称呼；填进文案用 fillProviderFace（通用说法句首大写）。 */
export function useSendFailureProviderName(): ProviderFace {
  const runtimeId = useChatStore((state) => state.runtimeId)
  const readiness = useChatReadiness().data
  const settings = useSettingsSnapshot().data
  return sendFailureProviderName({
    runtimeId,
    tools: settings?.agentTools ?? [],
    displayNames: settings?.preferences.agentDisplayNames ?? {},
    provider: defaultProviderFace(readiness, settings?.providers ?? [])
  })
}
