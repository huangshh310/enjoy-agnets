/**
 * I4 Automations 抽屉宽度与页脚诚实句。
 */
export const AUTOMATION_DRAWER_WIDTH_CLASS = "w-[min(380px,calc(100vw-1.5rem))]"

export const LOCAL_ONLY_FOOTER = "仅在本机运行，关闭应用则暂停"

export const P0_TRIGGERS = ["manual", "cron"] as const
export type AutomationP0Trigger = (typeof P0_TRIGGERS)[number]
