/**
 * 本机桌面通知：只在偏好打开且事件真实发生时弹出。
 */
import { Notification } from "electron"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { readPreferences } from "./preferences"

/** 审批停车或 run 结束时通知；文案跟界面语言走。 */
export function notifyAgentEvent(event: StreamEvent): void {
  const prefs = readPreferences()
  const zh = prefs.language !== "en"
  if (event.type === "approval.required" && (prefs.desktopPush || prefs.approvalRequiredAlert)) {
    showNotice(zh ? "待审批" : "Approval needed", zh ? "有工具在等你决定。" : "A tool is waiting for you.")
    return
  }
  if (event.type === "run.end" && (prefs.desktopPush || prefs.agentCompleteSound)) {
    showNotice(zh ? "任务完成" : "Agent finished", zh ? "这一轮已经结束。" : "This run has finished.")
  }
}

function showNotice(title: string, body: string): void {
  if (!Notification.isSupported()) return
  new Notification({ title, body, silent: !readPreferences().agentCompleteSound }).show()
}
