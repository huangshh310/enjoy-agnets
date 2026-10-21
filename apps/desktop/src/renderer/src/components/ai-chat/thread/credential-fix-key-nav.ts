/**
 * 发送闸「改密钥」去哪：能定位到默认路线的档案就直接打开它的编辑页；
 * jojo P2（#136 gate2）：默认路线解析不出档案时不能哑掉——退回设置页「添加 API 密钥」选厂商。
 */
import { editProviderSearch, officialProviderSearch } from "../../setup-guide/open-provider-form"
import type { FixKeyTarget } from "../../../lib/send-failure-target"

export type FixKeyNavigation = {
  to: "/settings/$section"
  params: { section: "providers" }
  search: ReturnType<typeof editProviderSearch> | ReturnType<typeof officialProviderSearch>
}

export function fixKeyNavigation(providerId: string | null | undefined): FixKeyNavigation {
  return {
    to: "/settings/$section",
    params: { section: "providers" },
    search: providerId ? editProviderSearch(providerId) : officialProviderSearch()
  }
}

/** 点了一定会跳：有档案 → 编辑页；没有 → 添加密钥。 */
export function goFixKey(
  navigate: (to: FixKeyNavigation) => unknown,
  providerId: string | null | undefined
): void {
  void navigate(fixKeyNavigation(providerId))
}

export type FixKeyTargetNavigation =
  | FixKeyNavigation
  | { to: "/settings/$section"; params: { section: "agent" }; search: { tool: string } }

/**
 * luna P2-1：按这一轮实际走的去改——档案 → 它的编辑框；ACP 引擎没绑档案 → 这个引擎自己的设置卡；
 * 找不到档案 → 添加 API 密钥。免密钥档案调用方根本不给按钮（target 为 null）。
 */
export function fixKeyTargetNavigation(target: FixKeyTarget): FixKeyTargetNavigation {
  if (target.kind === "agent") {
    return { to: "/settings/$section", params: { section: "agent" }, search: { tool: target.toolId } }
  }
  return fixKeyNavigation(target.kind === "provider" ? target.providerId : undefined)
}
