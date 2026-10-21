/**
 * 交接卡 / 「已交接」短提示里的引擎名，以及短提示什么时候让位（mike P3，#163 巡检 英文 733）。
 * 放在纯 .ts 里，node --test 直接测。
 */
export const ENJOY_LOCAL_RUNTIME_ID = "enjoy-local"

/**
 * Enjoy 本地一律走 i18n（chat.usage.enjoyLocal），不用主进程 agentTools 里那个中文 label——
 * 英文界面不能露「Enjoy 本地」（同 enjoy-local-label.test.ts 的约定）。其它引擎用工具名，找不到用 id。
 */
export function handoffEngineLabel(
  tools: ReadonlyArray<{ id: string; label: string }>,
  id: string | null | undefined,
  localLabel: string
): string {
  if (!id) return ""
  if (id === ENJOY_LOCAL_RUNTIME_ID) return localLabel
  return tools.find((item) => item.id === id)?.label ?? id
}

/**
 * 「已交接 A → B」短提示是贴在输入框上沿的浮层（absolute），会盖住紧挨输入框的排队区：
 * 折叠行「已暂停 · 排队 N 条」、第一条排队行（g163-e733-4-switched）。这个会话还有排队项时不画——
 * 换助手后队列停着，暂停说明行已经写了「你换了助手…」，不丢信息。
 */
export function handoffBannerVisible(input: { bannerForThisSession: boolean; queuedCount: number }): boolean {
  return input.bannerForThisSession && input.queuedCount === 0
}
