/**
 * 设置侧栏高亮：子路由映射到可见入口。skills 自己在侧栏里，不再并进「说明」。
 */
import type { SettingsSectionId } from "./settings-sections.ts"

export function resolveActiveNavSectionId(section: SettingsSectionId): SettingsSectionId {
  switch (section) {
    case "rules":
      return "instructions"
    case "capabilities":
    case "workflow":
    case "sandbox":
      return "agent"
    case "knowledge":
    case "media":
      return "workspace"
    case "automations":
    case "telemetry":
    case "git":
      return "mcp"
    case "team":
    case "members":
    case "billing":
    case "organization":
    case "integrations":
    case "notifications":
      return "account"
    default:
      return section
  }
}
