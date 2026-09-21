/**
 * 退出确认：当前或后台会话仍在跑 / 等审批时拦截。
 */
export type QuitAttentionItem = {
  kind: string
  status: string
}

export type QuitPark = {
  running: boolean
  pendingApproval: unknown
}

export function needsQuitConfirm(input: {
  running: boolean
  pendingApproval: unknown
  parks?: Record<string, QuitPark>
  attention?: readonly QuitAttentionItem[]
}): boolean {
  if (input.running || Boolean(input.pendingApproval)) return true
  const parks = Object.values(input.parks ?? {})
  if (parks.some((park) => park.running || Boolean(park.pendingApproval))) return true
  return (input.attention ?? []).some(
    (item) =>
      (item.kind === "pending_approval" || item.kind === "ask_user") &&
      (item.status === "active" || item.status === "focused")
  )
}
