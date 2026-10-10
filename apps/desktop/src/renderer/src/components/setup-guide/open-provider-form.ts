/**
 * 官方预设添加表单：向导「添加 API 密钥」和无路线「去连接」共用。
 */
import type { SetupGuideStep } from "./setup-guide-gate"
import { useSetupGuideStore } from "./setup-guide-store"

export const SETUP_GUIDE_FROM = "setup-guide"
export const OFFICIAL_CREATE = "official"
export const OFFICIAL_PRESET_KIND = "deepseek"

export function officialProviderSearch(from?: string): { create: string; from?: string } {
  return from ? { create: OFFICIAL_CREATE, from } : { create: OFFICIAL_CREATE }
}

export function pauseGuideForProviderForm(step: SetupGuideStep = "connect-model"): void {
  useSetupGuideStore.getState().pauseAt(step)
}
