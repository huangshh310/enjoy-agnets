/**
 * 官方预设添加表单：向导「添加 API 密钥」和无路线「去连接」共用。
 */
import type { SetupGuideStep } from "./setup-guide-gate"
import { useSetupGuideStore } from "./setup-guide-store"

export const SETUP_GUIDE_FROM = "setup-guide"
export const CHAT_CONNECT_FROM = "chat"
/** 只打开选厂商，不要带 preset 以免预选 DeepSeek。 */
export const OFFICIAL_CREATE = "official"

export function officialProviderSearch(from?: string): { create: string; from?: string } {
  return from ? { create: OFFICIAL_CREATE, from } : { create: OFFICIAL_CREATE, from: CHAT_CONNECT_FROM }
}

export function pauseGuideForProviderForm(step: SetupGuideStep = "connect-model"): void {
  useSetupGuideStore.getState().pauseAt(step)
}
