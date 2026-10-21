/**
 * 失败卡的供应商名和「改密钥」去哪：跟这一轮实际走的引擎 / 档案（luna P2-1，见 lib/send-failure-target）。
 * 前台引擎是 ACP / CLI 时说引擎名，Enjoy 本地说供应商（品牌名 / 端点主机名 / 「模型服务」），从不说密钥档案名。
 */
import { useSyncExternalStore } from "react"
import { useSettingsSnapshot } from "./use-settings-snapshot"
import { useChatStore } from "../stores/chat-store"
import type { ProviderFace } from "../lib/provider-face"
import { sendFailureTarget, type SendFailureTarget } from "../lib/send-failure-target"
import { getSendFailureRoutes, subscribeSendFailureRoutes } from "./send-failure-route"

export function useSendFailureTarget(): SendFailureTarget {
  const runtimeId = useChatStore((state) => state.runtimeId)
  const sessionId = useChatStore((state) => state.sessionId)
  const routes = useSyncExternalStore(subscribeSendFailureRoutes, getSendFailureRoutes)
  const settings = useSettingsSnapshot().data
  return sendFailureTarget({
    route: sessionId ? (routes.get(sessionId) ?? null) : null,
    runtimeId,
    tools: settings?.agentTools ?? [],
    displayNames: settings?.preferences.agentDisplayNames ?? {},
    providers: settings?.providers ?? []
  })
}

/** 返回称呼；填进文案用 fillProviderFace（通用说法句首大写）。 */
export function useSendFailureProviderName(): ProviderFace {
  return useSendFailureTarget().face
}
