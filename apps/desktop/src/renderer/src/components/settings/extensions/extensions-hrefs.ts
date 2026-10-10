/**
 * 扩展页深链：添加进现有工作模块；精选卡带 preset / install 定位。
 * 一律带 from=settings&section=extensions，齿轮与「返回设置」才能回扩展。
 */
import { withSettingsOrigin } from "../last-settings-section.ts"
import { MCP_HUB_HREF, SKILLS_HUB_HREF } from "./constants.ts"

const ORIGIN = "extensions" as const

export function mcpHubHref(): string {
  return withSettingsOrigin(MCP_HUB_HREF, ORIGIN)
}

export function skillsHubHref(): string {
  return withSettingsOrigin(`${SKILLS_HUB_HREF}?tab=curated`, ORIGIN)
}

/** MCP 工作模块，带 preset 打开现有创建表单。 */
export function mcpPresetHref(presetId: string): string {
  const id = presetId.trim()
  if (!id) return withSettingsOrigin(MCP_HUB_HREF, ORIGIN)
  return withSettingsOrigin(`${MCP_HUB_HREF}?preset=${encodeURIComponent(id)}`, ORIGIN)
}

/** Skills 精选集市并定位该套件。 */
export function skillsInstallHref(sourceId: string): string {
  const id = sourceId.trim()
  if (!id) return withSettingsOrigin(`${SKILLS_HUB_HREF}?tab=curated`, ORIGIN)
  return withSettingsOrigin(
    `${SKILLS_HUB_HREF}?tab=curated&install=${encodeURIComponent(id)}`,
    ORIGIN
  )
}
