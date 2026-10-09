/**
 * CU-P1-P 通知层契约：从现有 StreamEvent 推导人话通知，不改 run.end。
 * 待审批只含应用显示名 + 粗动作；结束态 completed / stopped / errored。
 */
import { z } from "zod"

/**
 * abortAgent 写入 `run.error.message` 的唯一信号。
 * 与 `apps/desktop/.../claim-run-end.ts` 的同名常量必须保持一致。
 */
export const USER_ABORT_MESSAGE = "Aborted by user."

/** 通知层结束态。从现有 `run.end` / `run.error` 推导，不改事件契约。 */
export const DesktopNotifyRunKind = z.enum(["completed", "stopped", "errored"])
export type DesktopNotifyRunKind = z.infer<typeof DesktopNotifyRunKind>

/** 待审批通知只允许的粗动作。`wait` 不审批，也不进通知。 */
export const DesktopNotifyActionKind = z.enum(["click", "type", "scroll", "key", "move", "drag"])
export type DesktopNotifyActionKind = z.infer<typeof DesktopNotifyActionKind>

/** 待审批通知唯一允许出现的字段：应用显示名 + 粗动作。 */
export const DesktopApprovalNotifyPayload = z.object({
  appName: z.string().min(1),
  actionKind: DesktopNotifyActionKind
})
export type DesktopApprovalNotifyPayload = z.infer<typeof DesktopApprovalNotifyPayload>

export type DesktopNotifyCopy = { title: string; body: string }

const ACTION_VERBS_ZH: Record<DesktopNotifyActionKind, string> = {
  click: "点击",
  type: "输入",
  scroll: "滚动",
  key: "按键",
  move: "移动",
  drag: "拖拽"
}

const ACTION_VERBS_EN: Record<DesktopNotifyActionKind, string> = {
  click: "click",
  type: "type",
  scroll: "scroll",
  key: "press a key",
  move: "move",
  drag: "drag"
}

/**
 * 识别用户停。`run.error` 没有结构化 reason，只能吃 message。
 * 只认「Aborted by user」整句（大小写 / 首尾空白 / 句号不敏感），
 * 不把 timeout / "The operation was aborted" 当成已停止。
 */
export function isUserAbortMessage(message: string | undefined | null): boolean {
  if (typeof message !== "string") return false
  const normalized = message.trim().replace(/\.+$/, "").toLowerCase()
  return normalized === "aborted by user"
}

/** `run.end` → 已完成；用户停 `run.error` → 已停止；其它 `run.error` → 出错。 */
export function deriveRunNotifyKind(event: {
  type: string
  message?: string
}): DesktopNotifyRunKind | null {
  if (event.type === "run.end") return "completed"
  if (event.type === "run.error") {
    return isUserAbortMessage(event.message) ? "stopped" : "errored"
  }
  return null
}

export function coarseDesktopNotifyAction(action: unknown): DesktopNotifyActionKind | null {
  if (typeof action !== "string") return null
  const parsed = DesktopNotifyActionKind.safeParse(action.trim().toLowerCase())
  return parsed.success ? parsed.data : null
}

/**
 * 待审批通知红action：只抽出 appName + 粗动作。
 * 非 `desktop_act`、未知动作、或 `wait` 返回 null，走泛工具句。
 */
export function redactDesktopApprovalNotify(input: {
  name?: string
  args?: unknown
}): DesktopApprovalNotifyPayload | null {
  if (input.name !== "desktop_act") return null
  const row = asRecord(input.args)
  const actionKind = coarseDesktopNotifyAction(row.action)
  if (!actionKind) return null
  const appName = text(row.appName) || "应用"
  return { appName, actionKind }
}

/** 系统通知文案。`run.error` 正文不抄 message，避免泄输入。 */
export function noticeForAgentEvent(
  event: {
    type: string
    name?: string
    args?: unknown
    message?: string
    automationSource?: { automationName?: string; isCatchUp?: boolean }
  },
  zh: boolean
): DesktopNotifyCopy | null {
  if (event.type === "approval.required") {
    const payload = redactDesktopApprovalNotify(event)
    const base = payload
      ? desktopApprovalNotifyCopy(payload, zh)
      : zh
        ? { title: "待审批", body: "有工具在等你决定。" }
        : { title: "Approval needed", body: "A tool is waiting for you." }
    return withAutomationNotifySource(base, event.automationSource, zh)
  }
  const kind = deriveRunNotifyKind(event)
  if (!kind) return null
  return runNotifyCopy(kind, zh)
}

/** 补跑通知整句替换，只写自动化名；准点才拼在泛工具句后。不抄 scheduledAt / args。 */
export function withAutomationNotifySource(
  copy: DesktopNotifyCopy,
  source: { automationName?: string; isCatchUp?: boolean } | undefined,
  zh: boolean
): DesktopNotifyCopy {
  const name = source?.automationName?.trim()
  if (!name) return copy
  if (source?.isCatchUp) {
    return zh
      ? { title: copy.title, body: `Enjoy 的自动化「${name}」在补跑，需要你回 Enjoy 审批` }
      : {
          title: copy.title,
          body: `Enjoy automation “${name}” is catching up and needs you back in Enjoy to approve.`
        }
  }
  const extra = zh ? `自动化「${name}」。` : `Automation “${name}”.`
  return { title: copy.title, body: `${copy.body} ${extra}` }
}

export function desktopApprovalNotifyCopy(
  payload: DesktopApprovalNotifyPayload,
  zh: boolean
): DesktopNotifyCopy {
  const verb = zh ? ACTION_VERBS_ZH[payload.actionKind] : ACTION_VERBS_EN[payload.actionKind]
  return zh
    ? { title: "待审批", body: `Enjoy 想在「${payload.appName}」里${verb}，回 Enjoy 审批` }
    : {
        title: "Approval needed",
        body: `Enjoy wants to ${verb} in “${payload.appName}”. Return to Enjoy to approve.`
      }
}

export function runNotifyCopy(kind: DesktopNotifyRunKind, zh: boolean): DesktopNotifyCopy {
  if (kind === "completed") {
    return zh
      ? { title: "已完成", body: "这一轮已经结束。" }
      : { title: "Completed", body: "This run has finished." }
  }
  if (kind === "stopped") {
    return zh
      ? { title: "已停止", body: "你停止了这一轮。" }
      : { title: "Stopped", body: "You stopped this run." }
  }
  return zh
    ? { title: "出错", body: "这一轮没有完成。" }
    : { title: "Error", body: "This run did not finish." }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}
