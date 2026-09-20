/**
 * 引擎显示名读写：权威在 preferences.agentDisplayNames，经 setPreferences 落盘。
 */
import { useQueryClient } from "@tanstack/react-query"
import { patchPreferences, useSettingsSnapshot } from "./use-settings-snapshot"
import {
  engineTrueNameTitle,
  nextDisplayNameMap,
  resolveEngineFace
} from "@renderer/lib/agent-display-name"
import { pickSessionRuntime } from "@renderer/lib/session-runtime"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function useEngineDisplayNames(): Record<string, string> {
  return useSettingsSnapshot().data?.preferences.agentDisplayNames ?? {}
}

export function useEngineFace(runtimeId: string, brandLabel: string): {
  face: string
  trueNameTitle: string
} {
  const t = useT()
  const names = useEngineDisplayNames()
  return {
    face: resolveEngineFace({ displayName: names[runtimeId], brandLabel }),
    trueNameTitle: engineTrueNameTitle(brandLabel, t("chat.engineRealName"))
  }
}

/** 会话行 / Inbox：跟会话绑定 runtime，不要一律跟 Composer 当前引擎。 */
export function useSessionEngineFace(sessionId: string | null): {
  runtimeId: string
  brandLabel: string
  face: string
  trueNameTitle: string
} {
  const t = useT()
  const sessionRuntimes = useChatStore((state) => state.sessionRuntimes)
  const preferredRuntimeId = useChatStore((state) => state.preferredRuntimeId)
  const tools = useSettingsSnapshot().data?.agentTools ?? []
  const names = useEngineDisplayNames()
  const runtimeId = pickSessionRuntime(sessionId, sessionRuntimes, preferredRuntimeId)
  const brandLabel =
    tools.find((tool) => tool.id === runtimeId)?.label ??
    (runtimeId === "enjoy-local" ? t("chat.usage.enjoyLocal") : runtimeId)
  return {
    runtimeId,
    brandLabel,
    face: resolveEngineFace({ displayName: names[runtimeId], brandLabel }),
    trueNameTitle: engineTrueNameTitle(brandLabel, t("chat.engineRealName"))
  }
}

export function useSaveEngineDisplayName() {
  const queryClient = useQueryClient()
  const names = useEngineDisplayNames()

  return async function saveEngineDisplayName(runtimeId: string, raw: string) {
    const next = nextDisplayNameMap(names, runtimeId, raw)
    await patchPreferences({ agentDisplayNames: next })
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }
}
