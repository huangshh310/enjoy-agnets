/**
 * 733×480 附件托盘高度预算：leftover 底边界是状态栏 top，不是视口高减栏高。
 * 纯函数，不碰 store / ipc，供夹具与运行时 hook 共用。
 */

/** 托盘 `-mb-3.5` 探入表单顶的重叠。 */
export const TRAY_FORM_OVERLAP_PX = 14
/** 展开托盘最矮（标题完整 + 画廊 ≥28）。低于此才收回表单垂直余量。 */
export const EXPANDED_TRAY_FLOOR_PX = 64
/** 现网舒适密度（1440 保持；自然高小于预算时不得主动压矮）。 */
export const EXPANDED_TRAY_COMFORT_PX = 108
/** `size-11` 缩略图。优先保住整颗。 */
export const TRAY_THUMB_PX = 44
/** 收余量后仍希望托盘至少这么高，才能放下整颗缩略图 + 收紧铬。 */
export const EXPANDED_TRAY_KEEP_THUMB_PX = 76
/** 大屏画廊内容上限（现网 `max-h-48`）。 */
export const GALLERY_CONTENT_CAP_PX = 192
/** 「待验收 + 托盘」修后建议再留的发送缝；不是所有态硬 Must。 */
export const SUGGESTED_SEND_GAP_PX = 8
/**
 * 表单垂直余量（行距 / 顶底内边距），落在 20–36px 锁内。
 * 与 `data-composer-tray-slack` 下的 padding 收紧对齐。
 */
export const FORM_SLACK_PX = 34

export const TRAY_CHROME_COMFORT = { pt: 8, pb: 16, gap: 10 } as const
export const TRAY_CHROME_TIGHT = { pt: 4, pb: 4, gap: 4 } as const

export type TrayLeftoverInput = {
  /** 状态栏 top；没有状态栏时才退回视口高。 */
  bottomEdge: number
  trayTop: number
  formHeight: number
  /** form.bottom − send.bottom，本基线约 11。发送须整颗留在 bottomEdge 之上。 */
  sendOffsetFromFormBottom: number
  overlap?: number
}

/** 底边界用状态栏 top，禁止用 viewportHeight − statusBar.height。 */
export function statusBarBottomEdge(args: {
  statusBarTop: number | null | undefined
  viewportHeight: number
}): number {
  if (args.statusBarTop != null && Number.isFinite(args.statusBarTop)) return args.statusBarTop
  return args.viewportHeight
}

/**
 * 托盘可用最大毛高（含标题、内边距，计入 -mb 重叠后的净占位）。
 * 约束是发送 bottom ≤ bottomEdge，form 底边可以略低于状态栏顶，只要 form 仍在视口内。
 */
export function trayLeftoverPx(input: TrayLeftoverInput): number {
  const overlap = input.overlap ?? TRAY_FORM_OVERLAP_PX
  const reservedToSend = input.formHeight - input.sendOffsetFromFormBottom
  return input.bottomEdge - input.trayTop - reservedToSend + overlap
}

/** 用未收余量前的表单高度来决定是否收回余量，避免开关振荡。 */
export function leftoverAtNaturalFormHeight(args: {
  leftoverWithCurrentForm: number
  slackApplied: boolean
  slackPx?: number
}): number {
  const slack = args.slackPx ?? FORM_SLACK_PX
  return args.slackApplied ? args.leftoverWithCurrentForm - slack : args.leftoverWithCurrentForm
}

export function shouldReclaimFormSlack(leftoverAtNaturalForm: number): boolean {
  return leftoverAtNaturalForm < EXPANDED_TRAY_FLOOR_PX
}

/** 自然高度不超过预算时不设封顶（保持 1440 密度）。 */
export function capTrayHeight(naturalHeight: number, leftover: number): number | null {
  if (!Number.isFinite(naturalHeight) || !Number.isFinite(leftover) || naturalHeight <= 0) return null
  if (naturalHeight <= leftover) return null
  return Math.max(0, leftover)
}

/**
 * 建议缝只有在收紧铬后仍能放下整颗 size-11 缩略图时才用。
 * 发送可点优先于建议缝；保不住整颗缩略图时退回硬底线 leftover。
 */
export function preferredTrayBudget(
  leftoverHard: number,
  args?: { preferredGap?: number; titleBarHeight?: number; chrome?: { pt: number; pb: number; gap: number } }
): number {
  const preferredGap = args?.preferredGap ?? SUGGESTED_SEND_GAP_PX
  const titleBarHeight = args?.titleBarHeight ?? 28
  const chrome = args?.chrome ?? TRAY_CHROME_TIGHT
  const minForFullThumb = titleBarHeight + chrome.pt + chrome.pb + chrome.gap + TRAY_THUMB_PX
  const preferred = leftoverHard - preferredGap
  if (preferred >= minForFullThumb && preferred >= EXPANDED_TRAY_KEEP_THUMB_PX) return preferred
  return leftoverHard
}

export function shouldTightenTrayChrome(trayMaxHeight: number | null): boolean {
  return trayMaxHeight != null && trayMaxHeight < EXPANDED_TRAY_COMFORT_PX
}

export function galleryMaxHeightPx(args: {
  trayBudget: number
  titleBarHeight: number
  chrome?: { pt: number; pb: number; gap: number }
}): number {
  const chrome = args.chrome ?? TRAY_CHROME_COMFORT
  const available = args.trayBudget - args.titleBarHeight - chrome.pt - chrome.pb - chrome.gap
  return Math.max(0, Math.min(GALLERY_CONTENT_CAP_PX, available))
}

/** 状态栏没有自己的 testid；从用量环走到带 data-toast-clearance 的根。 */
export function readStatusBarTop(doc: ParentNode): number | null {
  const meter = "querySelector" in doc ? doc.querySelector('[data-testid="status-context-meter"]') : null
  if (!meter) return null
  const bar = meter.closest("[data-toast-clearance]")
  if (!bar) return null
  return bar.getBoundingClientRect().top
}
