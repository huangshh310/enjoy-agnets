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

/** 列应用卡住不能拖住发送：超时按已知名单算，发送照走。 */
const LIST_APPS_TIMEOUT_MS = 3_000

export async function desktopBiasForRun(text: string): Promise<DesktopMentionBias | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const fallback = new Promise<readonly DesktopMentionApp[]>((resolve) => {
    timer = setTimeout(() => resolve(peekDesktopMentionApps()), LIST_APPS_TIMEOUT_MS)
  })
  try {
    return desktopBiasFromMentions(text, await Promise.race([loadMentionApps(), fallback]))
  } finally {
    if (timer) clearTimeout(timer)
  }
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
