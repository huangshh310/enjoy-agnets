/**
 * 没有待验收框时托盘的「挤压」兜底（#228 luna 预审 ④）：733×480 托盘展开 → 停止（审批走掉、排队停住）后，
 * 无审批时 Composer 外壳是 min-h-0 shrink，内容（排队芯片行 + 展开托盘 + 表单）比分到的高度多出来，
 * 多出的部分被列的 overflow-hidden 从底边裁掉（send 跑到状态栏下面）。
 * 只看 Composer 外壳自己的实测：内容高 > 盒高（对话区已经压到保底）才转成 #224 现成的横向单行条；
 * 释放：可用高度（盒高 + 对话区高出保底的部分）回到进入时量的整托盘内容高 + 8px 回滞（和底栏 / K6 同一套规矩）。
 * 不改 composer-tray-leftover 的常量与判定；有验收框时仍由 trayStripSlot 决定。
 */
export const TRAY_SQUEEZE_SUBPIXEL_PX = 0.5
export const TRAY_SQUEEZE_RELEASE_PX = 8

export type TraySqueeze = { on: boolean; needPx: number | null }
export const TRAY_SQUEEZE_OFF: TraySqueeze = { on: false, needPx: null }

export function nextTraySqueeze(
  prev: TraySqueeze,
  m: { contentPx: number; boxPx: number; conversationSlackPx: number }
): TraySqueeze {
  if (!prev.on) {
    return m.contentPx > m.boxPx + TRAY_SQUEEZE_SUBPIXEL_PX ? { on: true, needPx: m.contentPx } : prev
  }
  const avail = m.boxPx + Math.max(0, m.conversationSlackPx)
  if (prev.needPx != null && avail >= prev.needPx + TRAY_SQUEEZE_RELEASE_PX) return TRAY_SQUEEZE_OFF
  return prev
}
