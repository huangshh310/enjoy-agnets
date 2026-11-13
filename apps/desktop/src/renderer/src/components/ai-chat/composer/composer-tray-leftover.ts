/**
 * 733×480 附件托盘自适应：运行时算 slot，slot < 108 才把托盘转成横向单行条（mb=0、表单收回余量）。
 * 纯函数，不碰 store / ipc，供单测与运行时 hook 共用。
 *
 * slot = (sendBottomBudget − formHeight) − (验收框底 + 8)
 *   sendBottomBudget = 状态栏 top − 13（733×480 状态栏 top=443 → 430，即 min(443−13, 430)）
 *   formHeight       = 收回余量后的表单高（733 待验收 = 162）
 *   验收框底          = 对话区压到保底（min-h-14）时验收框的 bottom（733×480 = 209），
 *                      这样展开 / 紧凑 / 已转单行条三态算出同一个 slot，不会来回振荡。
 */

/** 现网舒适态托盘毛高（1440 保持）；slot 低于它才转单行条。 */
export const EXPANDED_TRAY_COMFORT_PX = 108
/** 发送底边与状态栏 top 至少留的缝（bc0f2107 已过的 margin 13，不回退）。 */
export const SEND_STATUS_GAP_PX = 13
/** 验收框底到托盘顶的预留。 */
export const FRAME_TRAY_GAP_PX = 8
/** `size-11` 缩略图，单行条也保持 44（禁 <36）。 */
export const TRAY_THUMB_PX = 44
export const TRAY_THUMB_MIN_PX = 36
/** 单行条毛高锁（44 缩略图 + pt/pb 4 + 顶边框）。 */
export const TRAY_STRIP_MIN_PX = 52
export const TRAY_STRIP_MAX_PX = 56
/** 对话区保底（chat-stage `min-h-14`），读不到 computed min-height 时兜底。 */
export const CONVERSATION_FLOOR_PX = 56
/**
 * 单行条时表单收回的垂直余量（卡片 pt 6 + 模式行 6 + 输入 py 8 + 底栏 gap/pt/pb 10）。
 * 733 窄宽换行表单 192 → 162：form.y = 435 − 162 = 273，落在锁 266–275 内；不压输入（52）、不缩发送。
 */
export const FORM_SLACK_PX = 30

/** 底边界用状态栏 top，禁止用 viewportHeight − statusBar.height。 */
export function statusBarBottomEdge(args: {
  statusBarTop: number | null | undefined
  viewportHeight: number
}): number {
  if (args.statusBarTop != null && Number.isFinite(args.statusBarTop)) return args.statusBarTop
  return args.viewportHeight
}

/** 发送底边预算：状态栏 top − 13。733×480 上 = 430。 */
export function sendBottomBudget(bottomEdge: number): number {
  return bottomEdge - SEND_STATUS_GAP_PX
}

/** 表单收回余量后的高度：已收则取实测，未收则按 FORM_SLACK_PX 预估。 */
export function reclaimedFormHeight(args: { formHeight: number; slackApplied: boolean; slackPx?: number }): number {
  const slack = args.slackPx ?? FORM_SLACK_PX
  return args.slackApplied ? args.formHeight : args.formHeight - slack
}

/** 对话区压到保底时验收框的 bottom：实测框底 − 对话区高出保底的部分。 */
export function frameBottomAtConversationFloor(args: {
  frameBottom: number
  conversationHeight?: number | null
  conversationFloor?: number | null
}): number {
  const height = args.conversationHeight
  if (height == null || !Number.isFinite(height)) return args.frameBottom
  const floor =
    args.conversationFloor != null && Number.isFinite(args.conversationFloor)
      ? args.conversationFloor
      : CONVERSATION_FLOOR_PX
  return args.frameBottom - Math.max(0, height - floor)
}

export type TraySlotInput = {
  statusBarTop: number | null | undefined
  viewportHeight: number
  formHeight: number
  slackApplied: boolean
  /** 没有待验收 / 改动框（或高为 0）时传 null：不转单行条（无验收仅展开零回退）。 */
  frameBottom: number | null
  conversationHeight?: number | null
  conversationFloor?: number | null
}

export function trayStripSlot(input: TraySlotInput): number | null {
  if (input.frameBottom == null || !Number.isFinite(input.frameBottom)) return null
  const budget = sendBottomBudget(
    statusBarBottomEdge({ statusBarTop: input.statusBarTop, viewportHeight: input.viewportHeight })
  )
  const form = reclaimedFormHeight({ formHeight: input.formHeight, slackApplied: input.slackApplied })
  const frame = frameBottomAtConversationFloor({
    frameBottom: input.frameBottom,
    conversationHeight: input.conversationHeight,
    conversationFloor: input.conversationFloor
  })
  return budget - form - (frame + FRAME_TRAY_GAP_PX)
}

export function shouldUseTrayStrip(slot: number | null): boolean {
  return slot != null && Number.isFinite(slot) && slot < EXPANDED_TRAY_COMFORT_PX
}

/** 状态栏没有自己的 testid；从用量环走到带 data-toast-clearance 的根。 */
export function readStatusBarTop(doc: ParentNode): number | null {
  const meter = "querySelector" in doc ? doc.querySelector('[data-testid="status-context-meter"]') : null
  if (!meter) return null
  const bar = meter.closest("[data-toast-clearance]")
  if (!bar) return null
  return bar.getBoundingClientRect().top
}
