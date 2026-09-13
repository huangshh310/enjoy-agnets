/**
 * 扩展页深链：添加进现有工作模块；精选卡带 preset / install 定位。
 */
import { MCP_HUB_HREF, SKILLS_HUB_HREF } from "./constants.ts"

export function mcpHubHref(): string {
  return `${MCP_HUB_HREF}?tab=marketplace`
}

export function skillsHubHref(): string {
  return `${SKILLS_HUB_HREF}?tab=curated`
}

/** MCP 市场并打开指定预设的创建表单。 */
export function mcpPresetHref(presetId: string): string {
  const id = presetId.trim()
  if (!id) return `${MCP_HUB_HREF}?tab=marketplace`
  return `${MCP_HUB_HREF}?tab=marketplace&preset=${encodeURIComponent(id)}`
}

/** Skills 精选集市并定位该套件。 */
export function skillsInstallHref(sourceId: string): string {
  const id = sourceId.trim()
  if (!id) return `${SKILLS_HUB_HREF}?tab=curated`
  return `${SKILLS_HUB_HREF}?tab=curated&install=${encodeURIComponent(id)}`
}
