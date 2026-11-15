/**
 * 本机桌面通知：只在偏好打开且事件真实发生时弹出。
 * 文案与结束态由 ipc-contract/desktop-notify 推导，不改 run.end。
 * E1：有在途副作用的一轮等 run.stopped 终态再发，文案跟工具行落定三句对齐。
 */
import { Notification } from "electron"
import type { StopWriteVerdict, StreamEvent } from "@enjoy-agents/ipc-contract"
import { noticeForAgentEvent } from "@enjoy-agents/ipc-contract/desktop-notify"
import { readPreferences } from "./preferences"

/** 审批停车或 run 结束 / 停止 / 出错时通知；文案跟界面语言走。 */
export function notifyAgentEvent(event: StreamEvent): void {
  const prefs = readPreferences()
  const zh = prefs.language !== "en"
  const wantsApproval = event.type === "approval.required" && (prefs.desktopPush || prefs.approvalRequiredAlert)
  const terminalStopped =
    event.type === "run.stopped" && (event.phase === "settled" || event.phase === "final")
  const settlingError = event.type === "run.error" && Boolean(event.settling)
  const wantsRun =
    ((event.type === "run.end" || event.type === "run.error") && !settlingError || terminalStopped) &&
    (prefs.desktopPush || prefs.agentCompleteSound)
  if (!wantsApproval && !wantsRun) return
  const copy =
    terminalStopped && event.type === "run.stopped"
      ? stopReceiptNotifyCopy(event.receipt.write, zh)
      : noticeForAgentEvent(event, zh)
  if (!copy) return
  showNotice(copy.title, copy.body)
}

/** 与 luna §1.3 / 产品 §2.6 工具行落定三句对齐；不改 runNotifyCopy。 */
export function stopReceiptNotifyCopy(write: StopWriteVerdict, zh: boolean): { title: string; body: string } {
  if (write === "none_confirmed") {
    return zh
      ? { title: "已停止 · 没有写入", body: "你停止了这一轮。" }
      : { title: "Stopped · no writes", body: "You stopped this run." }
  }
  if (write === "maybe_partial") {
    return zh
      ? { title: "已停止 · 可能只做了一半", body: "你停止了这一轮。" }
      : { title: "Stopped · may be only half done", body: "You stopped this run." }
  }
  return zh
    ? { title: "已停止", body: "你停止了这一轮。" }
    : { title: "Stopped", body: "You stopped this run." }
}

function showNotice(title: string, body: string): void {
  if (!Notification.isSupported()) return
  new Notification({ title, body, silent: !readPreferences().agentCompleteSound }).show()
}
