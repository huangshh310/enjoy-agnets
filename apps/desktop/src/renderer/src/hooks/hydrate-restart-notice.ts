/**
 * 冷启动回灌：最新助手行已封 restart_abandoned 时补回挂 notice。
 * running 中途的 run.error 可能早于 loadSession，idle patch 会抹掉横幅。
 */
import { RESTART_ABANDONED_CODE, toolHasResultCode } from "@enjoy-agents/ipc-contract/desktop-notify"
import {
  isRestoreFamilyCode,
  RESTORE_INTERRUPTED_RUNNING
} from "@enjoy-agents/ipc-contract/restore-codes"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"

type HydrateNoticeMessage = {
  role?: string
  tools?: ThreadToolCall[]
}

export function latestAssistantRestartAbandoned(messages: HydrateNoticeMessage[]): boolean {
  const last = [...messages].reverse().find((message) => message.role === "assistant")
  return Boolean(last?.tools?.some((tool) => toolHasResultCode(tool, RESTART_ABANDONED_CODE)))
}

export function noticeAfterRestartHydrate(input: {
  sameSession: boolean
  running: boolean
  notice: string | null
  messages: HydrateNoticeMessage[]
}): string | null {
  if (input.notice) return input.notice
  if (input.sameSession || input.running) return input.notice
  if (!latestAssistantRestartAbandoned(input.messages)) return input.notice
  return RESTORE_INTERRUPTED_RUNNING
}

export function keepRestoreFamilyNotice(notice: string | null | undefined): string | null {
  return isRestoreFamilyCode(notice) ? notice : null
}
