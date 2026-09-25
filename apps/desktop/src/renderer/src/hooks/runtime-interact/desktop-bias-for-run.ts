/**
 * Composer / 重发把 @桌面 / @应用 收成 agent.run.desktopBias。
 * 名单与 desktop_list_apps 同源；失败只留宿主。提及 ≠ 放行。
 */
import type { DesktopMentionApp, DesktopMentionBias } from "@enjoy-agents/ipc-contract"
import {
  mentionAppsFromListResult,
  peekDesktopMentionApps,
  rememberDesktopMentionApps
} from "../../components/ai-chat/composer/mentions/desktop/mention-apps-from-list.ts"
import { readDesktopMentionBias } from "../../components/ai-chat/composer/mentions/desktop/read-desktop-mention-bias.ts"
import { getIde, hasIde } from "../../lib/ide"

export function desktopBiasFromMentions(
  text: string,
  apps: readonly DesktopMentionApp[]
): DesktopMentionBias | undefined {
  return readDesktopMentionBias(text, apps) ?? undefined
}

export async function desktopBiasForRun(text: string): Promise<DesktopMentionBias | undefined> {
  return desktopBiasFromMentions(text, await loadMentionApps())
}

async function loadMentionApps(): Promise<readonly DesktopMentionApp[]> {
  if (!hasIde()) return peekDesktopMentionApps()
  try {
    const apps = mentionAppsFromListResult(await getIde().builtinTools.desktopListApps())
    rememberDesktopMentionApps(apps)
    return apps
  } catch {
    rememberDesktopMentionApps([])
    return []
  }
}
