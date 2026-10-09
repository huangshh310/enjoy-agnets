/**
 * 本机桌面通知：只在偏好打开且事件真实发生时弹出。
 * 文案与结束态由 ipc-contract/desktop-notify 推导，不改 run.end。
 */
import { Notification } from "electron"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { noticeForAgentEvent } from "@enjoy-agents/ipc-contract/desktop-notify"
import { readPreferences } from "./preferences"

/** 审批停车或 run 结束 / 停止 / 出错时通知；文案跟界面语言走。 */
export function notifyAgentEvent(event: StreamEvent): void {
  const prefs = readPreferences()
  const zh = prefs.language !== "en"
  const wantsApproval = event.type === "approval.required" && (prefs.desktopPush || prefs.approvalRequiredAlert)
  const wantsRun =
    (event.type === "run.end" || event.type === "run.error") &&
    (prefs.desktopPush || prefs.agentCompleteSound)
  if (!wantsApproval && !wantsRun) return
  const copy = noticeForAgentEvent(event, zh)
  if (!copy) return
  showNotice(copy.title, copy.body)
}

function showNotice(title: string, body: string): void {
  if (!Notification.isSupported()) return
  new Notification({ title, body, silent: !readPreferences().agentCompleteSound }).show()
}
