/**
 * Automations 失败条跳 Inbox「失败」筛，不改路由合约。
 */
import type { InboxCategory } from "../inbox.types"

let pending: InboxCategory | undefined

export function requestInboxFilter(filter: InboxCategory): void {
  pending = filter
}

export function takeInboxFilter(): InboxCategory | undefined {
  const next = pending
  pending = undefined
  return next
}
