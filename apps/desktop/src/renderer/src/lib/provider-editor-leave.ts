/**
 * 关供应商编辑抽屉：必须清掉 edit / focus / from，否则 URL 会把抽屉再打开。
 * from=chat / 向导：回到进入前的会话，不要停在设置页。
 */
import type { SettingsSectionSearch } from "../components/settings/settings-section-search.ts"
import { isTransientProviderOrigin } from "./provider-form-origin.ts"

export function stripProviderEditorSearch(search: SettingsSectionSearch): SettingsSectionSearch {
  return {
    ...(search.tab ? { tab: search.tab } : {}),
    ...(search.tool ? { tool: search.tool } : {})
  }
}

export function shouldLeaveProviderEditorToChat(from: string | undefined): boolean {
  return isTransientProviderOrigin(from)
}
