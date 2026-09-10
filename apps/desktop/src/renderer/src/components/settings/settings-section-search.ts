/**
 * 设置分段 Hash search：tab 切智能体子页，tool 闪本机 CLI 卡。
 */
export type SettingsSectionSearch = {
  tab?: string
  tool?: string
}

export function parseSettingsSectionSearch(search: Record<string, unknown>): SettingsSectionSearch {
  return {
    tab: asSearchToken(search.tab),
    tool: asSearchToken(search.tool)
  }
}

function asSearchToken(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined
}
