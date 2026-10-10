/**
 * Inbox 拍板真源：main 列出 decision IS NULL 且会话未归档的审批行。
 * args 优先内存 pending，否则库里签 HMAC 的拷贝；缺参不要猜。
 */
import { z } from "zod"

/** 审批 args JSON 上限；超限当缺参，禁止把整张截图塞进 IPC。 */
export const PENDING_APPROVAL_ARGS_MAX_BYTES = 16_384

export const ApprovalsPendingInput = z.object({}).strict()
export type ApprovalsPendingInput = z.infer<typeof ApprovalsPendingInput>

export const PendingApprovalArgs = z.unknown().superRefine((value, ctx) => {
  if (value === undefined) return
  const bytes = jsonByteLength(value)
  if (bytes > PENDING_APPROVAL_ARGS_MAX_BYTES) {
    ctx.addIssue({ code: "custom", message: "approval args too large" })
  }
})

export const PendingApprovalItem = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  sessionId: z.string().min(1),
  workspaceId: z.string().nullable(),
  sessionTitle: z.string(),
  name: z.string().min(1),
  toolCallId: z.string().min(1),
  createdAt: z.number().int(),
  /** 内存 pending 或 HMAC 库拷贝；缺省表示对不上，禁止用 {} 弹允许卡。 */
  args: PendingApprovalArgs.optional(),
  /** 短文件名或桌面应用名；main 从签过的 args 算，最长 64，不含路径/敏感内容。 */
  targetShortName: z.string().max(64).optional()
})
export type PendingApprovalItem = z.infer<typeof PendingApprovalItem>

export function parsePendingApprovalArgs(value: unknown): unknown | undefined {
  const parsed = PendingApprovalArgs.safeParse(value)
  if (parsed.success) return parsed.data
  const stripped = stripOversizedThumbnails(value)
  if (stripped === value) return undefined
  const retry = PendingApprovalArgs.safeParse(stripped)
  return retry.success ? retry.data : undefined
}

/** 二次确认卡超 16KiB 时只剥缩略图，保留 sensitive / hints。 */
function stripOversizedThumbnails(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value
  const record = value as Record<string, unknown>
  if (!("thumbnailDataUrl" in record) && !("previousThumbnailDataUrl" in record)) return value
  const next = { ...record }
  delete next.thumbnailDataUrl
  delete next.previousThumbnailDataUrl
  return next
}

export function parseInboxPendingItems(items: unknown): PendingApprovalItem[] {
  if (!Array.isArray(items)) return []
  return items.flatMap((raw) => {
    const item = parsePendingApprovalItem(raw)
    return item ? [item] : []
  })
}

export function parsePendingApprovalItem(value: unknown): PendingApprovalItem | undefined {
  const parsed = PendingApprovalItem.safeParse(value)
  if (parsed.success) return parsed.data
  if (!value || typeof value !== "object") return undefined
  const withoutArgs = { ...(value as Record<string, unknown>) }
  delete withoutArgs.args
  const fallback = PendingApprovalItem.safeParse(withoutArgs)
  return fallback.success ? fallback.data : undefined
}

function jsonByteLength(value: unknown): number {
  try {
    const json = JSON.stringify(value)
    if (typeof json !== "string") return Number.POSITIVE_INFINITY
    let bytes = 0
    for (let i = 0; i < json.length; i += 1) {
      const code = json.charCodeAt(i)
      if (code <= 0x7f) bytes += 1
      else if (code <= 0x7ff) bytes += 2
      else if (code >= 0xd800 && code <= 0xdbff) {
        bytes += 4
        i += 1
      } else bytes += 3
    }
    return bytes
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

export const ApprovalsPendingResult = z.object({
  items: z.array(PendingApprovalItem),
  /** waiting_review 回挂扫完才为 true；未完成时 renderer 不得补可决策卡。 */
  restoreSettled: z.boolean().optional()
})
export type ApprovalsPendingResult = z.infer<typeof ApprovalsPendingResult>
