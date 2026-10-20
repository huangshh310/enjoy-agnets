/**
 * 失败卡的供应商名：前台引擎是 ACP / CLI 时说引擎名，Enjoy 本地说供应商品牌名（OpenAI…），从不说密钥档案名（见 lib/send-failure-provider-name）。
 */
import { useChatReadiness } from "./use-chat-readiness"
import { useSettingsSnapshot } from "./use-settings-snapshot"
import { useChatStore } from "../stores/chat-store"
import { useT } from "../i18n"
import { defaultProviderBrand } from "../lib/default-provider-label"
import { sendFailureProviderName } from "../lib/send-failure-provider-name"

export function useSendFailureProviderName(): string {
  const t = useT()
  const runtimeId = useChatStore((state) => state.runtimeId)
  const readiness = useChatReadiness().data
  const settings = useSettingsSnapshot().data
  return sendFailureProviderName({
    runtimeId,
    tools: settings?.agentTools ?? [],
    displayNames: settings?.preferences.agentDisplayNames ?? {},
    providerName: defaultProviderBrand(readiness, settings?.providers ?? [], t("chat.credentialProviderFallback"))
  })
}
