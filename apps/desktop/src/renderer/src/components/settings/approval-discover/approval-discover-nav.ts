/**
 * 审批发现性跳转：智能体摘要条 → 通用已有权限卡，改完原路返回。
 * 不新开路由，不在发现条里嵌第二套审批表。
 */

export const APPROVAL_PERMISSIONS_ANCHOR = "settings-permissions"

export type ApprovalDiscoverOrigin = "racks" | "defaults"

const FROM_RACKS = "agent"
const FROM_DEFAULTS = "agent-defaults"

/** 解析 `#/settings/general?from=agent`；非法值不当返回链。 */
export function parseApprovalDiscoverFrom(raw?: string): ApprovalDiscoverOrigin | null {
  if (raw === FROM_DEFAULTS) return "defaults"
  if (raw === FROM_RACKS) return "racks"
  return null
}

/** 落到通用权限卡，并记住从本机 CLI 还是默认项过来。 */
export function approvalDiscoverSearch(origin: ApprovalDiscoverOrigin) {
  return {
    from: origin === "defaults" ? FROM_DEFAULTS : FROM_RACKS,
    tab: undefined,
    tool: undefined
  }
}

/** 改完回到智能体对应分段，清掉 from。 */
export function agentReturnSearch(origin: ApprovalDiscoverOrigin) {
  return {
    tab: origin === "defaults" ? "defaults" : undefined,
    tool: undefined,
    from: undefined
  }
}
