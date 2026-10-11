/**
 * CU-P1-P 通知层契约：从现有 StreamEvent 推导人话通知，不改 run.end。
 * 待审批只含应用显示名 + 粗动作；结束态 completed / stopped / errored。
 */
import { z } from "zod"
import { CATCH_UP_APPROVAL_TIMEOUT } from "./automations-missed.ts"

export { CATCH_UP_APPROVAL_TIMEOUT }

/**
 * abortAgent 写入 `run.error.message` 的唯一信号。
 * 与 `apps/desktop/.../claim-run-end.ts` 的同名常量必须保持一致。
 */
export const USER_ABORT_MESSAGE = "Aborted by user."

/** 用户停 / 归档 abort 的结构化码。UI 只认这码，禁止把 message 摊进界面。 */
export const USER_ABORTED_CODE = "user_aborted"

/** 泵真实出错结清未决审批：不是用户 Stop，工具行走出错，禁止标已停止。 */
export const RUN_FAILED_CODE = "run_failed"

/** 重启回挂对不上：未决 cancelled，工具行走中性「重启后已中断」，禁止冒充 user_aborted。 */
export const RESTART_ABANDONED_CODE = "restart_abandoned"

/** approval.resolved.code：Stop / 泵出错 / 补跑超时 / 重启放弃。 */
export const APPROVAL_RESOLVED_CODES = [
  USER_ABORTED_CODE,
  RUN_FAILED_CODE,
  CATCH_UP_APPROVAL_TIMEOUT,
  RESTART_ABANDONED_CODE
] as const
export type ApprovalResolvedCode = (typeof APPROVAL_RESOLVED_CODES)[number]

export function toolHasResultCode(
  tool: { result?: unknown; errorText?: string } | undefined,
  code: string
): boolean {
  if (!tool) return false
  if (tool.errorText === code) return true
  const result = tool.result
  return Boolean(result && typeof result === "object" && (result as { code?: string }).code === code)
}

/** 用户停 → 已停止；泵出错结清 → 出错；补跑超时 / 重启放弃 → 中性。禁止把 run_failed 当成已拒绝。 */
export function toolAbortKind(
  tool?: { result?: unknown; errorText?: string }
): "stopped" | "error" | "neutral" | undefined {
  if (toolHasResultCode(tool, USER_ABORTED_CODE)) return "stopped"
  if (toolHasResultCode(tool, RUN_FAILED_CODE)) return "error"
  if (toolHasResultCode(tool, CATCH_UP_APPROVAL_TIMEOUT)) return "neutral"
  if (toolHasResultCode(tool, RESTART_ABANDONED_CODE)) return "neutral"
  return undefined
}

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
  if (message === USER_ABORTED_CODE) return true
  const normalized = message.trim().replace(/\.+$/, "").toLowerCase()
  return normalized === "aborted by user"
}

export function isUserAbortEvent(event: {
  code?: string
  message?: string
}): boolean {
  return event.code === USER_ABORTED_CODE || isUserAbortMessage(event.message)
}

/** `run.end` → 已完成；用户停 `run.error` → 已停止；其它 `run.error` → 出错。 */
export function deriveRunNotifyKind(event: {
  type: string
  message?: string
  code?: string
}): DesktopNotifyRunKind | null {
  if (event.type === "run.end") return "completed"
  if (event.type === "run.error") {
    return isUserAbortEvent(event) ? "stopped" : "errored"
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
    const catchUp = formatCatchUpApprovalNotice(event.automationSource, zh)
    return catchUp ?? withAutomationNotifySource(base, event.automationSource, zh)
  }
  const kind = deriveRunNotifyKind(event)
  if (!kind) return null
  return runNotifyCopy(kind, zh)
}

/** 补跑审批通知整句。只吃 automationName + isCatchUp，不抄 scheduledAt / args。 */
export function formatCatchUpApprovalNotice(
  source: { automationName?: string; isCatchUp?: boolean } | undefined,
  zh: boolean
): DesktopNotifyCopy | null {
  const name = source?.automationName?.trim()
  if (!name || source?.isCatchUp !== true) return null
  return zh
    ? { title: "待审批", body: `Enjoy 的自动化「${name}」在补跑，需要你回 Enjoy 审批` }
    : {
        title: "Approval needed",
        body: `Enjoy automation “${name}” is catching up and needs you back in Enjoy to approve.`
      }
}

/** 准点来源才拼在泛工具句后。补跑走 formatCatchUpApprovalNotice。 */
export function withAutomationNotifySource(
  copy: DesktopNotifyCopy,
  source: { automationName?: string; isCatchUp?: boolean } | undefined,
  zh: boolean
): DesktopNotifyCopy {
  const catchUp = formatCatchUpApprovalNotice(source, zh)
  if (catchUp) return { title: copy.title, body: catchUp.body }
  const name = source?.automationName?.trim()
  if (!name) return copy
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
