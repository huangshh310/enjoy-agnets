/**
 * 第一张卡尺寸：展开 280px（48 轨道 + 情境），折叠 60px 只留轨道。
 * 略加宽给会话行标题省略号和时间列（刚刚 / N 分钟）。
 */
export const NAV_CARD_EXPANDED_PX = 280
export const NAV_CARD_COLLAPSED_PX = 60
export { NARROW_SIDEBAR_PX } from "./chrome/sidebar-collapse-state"
export const ACTIVITY_BAR_PX = 48
export const CANVAS_PAD_PX = 12
/** 会话行时间列：按内容自适应（不再固定 3.75rem 抢标题），只是不换行（luna z151-2）。 */
export const SESSION_TIME_COL_CLASS = "w-auto whitespace-nowrap"

export const WORK_MODULE_PATHS = {
  chat: "/",
  knowledge: "/knowledge",
  workflows: "/workflows",
  media: "/media",
  mcp: "/mcp",
  skills: "/skills"
} as const

export const LAST_WORK_MODULE_KEY = "enjoy-agents:last-work-module"
