/**
 * I4 Automations 抽屉宽度与页脚诚实句。
 */
export const AUTOMATION_DRAWER_WIDTH_CLASS = "w-[min(380px,calc(100vw-1.5rem))]"

export const LOCAL_ONLY_FOOTER = "仅在本机运行，关闭应用则暂停"
export const WEBHOOK_LOCAL_ONLY_FOOTER = "webhook 仅本机端口，非公网"

export const P1_TRIGGERS = ["manual", "cron", "on_save", "webhook"] as const
export type AutomationP1Trigger = (typeof P1_TRIGGERS)[number]
