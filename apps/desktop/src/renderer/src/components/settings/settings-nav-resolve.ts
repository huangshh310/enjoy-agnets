/**
 * 设置侧栏高亮：隐藏子路由映射到可见入口。侧栏里已有的分段必须高亮自己。
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
