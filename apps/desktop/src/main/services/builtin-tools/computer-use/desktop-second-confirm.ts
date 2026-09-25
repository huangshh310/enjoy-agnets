/**
 * 二次确认数据面：把「批准时」缩略图绑到重拍后的新观察，审批 enrich 再转 data URL。
 * 工具结果只带路径；像素不进模型文本。铬 / 标签归 Mike。
 * stash 同步 agent-core 闸，会话白名单盖不住二次确认。
 */
import {
  clearDesktopSecondConfirmGate,
  forgetDesktopSecondConfirmGate,
  rememberDesktopSecondConfirmGate
} from "@enjoy-agents/agent-core/computer-use"

export type SecondConfirmContext = {
  observationId: string
  previousObservationId?: string
  previousThumbnailPath?: string
  previousAppName?: string
  previousElementName?: string
}

const byObservation = new Map<string, SecondConfirmContext>()

/** act 回 needs_second_confirm 时记下批准时那张图，供下一次审批 args。 */
export function rememberSecondConfirm(ctx: SecondConfirmContext): void {
  const id = text(ctx.observationId)
  if (!id) return
  byObservation.set(id, { ...ctx, observationId: id })
  rememberDesktopSecondConfirmGate(id)
}

export function secondConfirmFor(observationId: string): SecondConfirmContext | undefined {
  return byObservation.get(text(observationId))
}

export function forgetSecondConfirm(observationId: string): void {
  const id = text(observationId)
  byObservation.delete(id)
  forgetDesktopSecondConfirmGate(id)
}

export function clearSecondConfirmMemory(): void {
  byObservation.clear()
  clearDesktopSecondConfirmGate()
}

/** 审批 args 补 previous*；已有 previousThumbnailPath 或账本命中即二次确认。 */
export function mergeSecondConfirmApprovalArgs(args: Record<string, unknown>): Record<string, unknown> {
  if (hasPreviousThumb(args) || args.needsSecondConfirm === true || args.code === "needs_second_confirm") {
    return { ...args, needsSecondConfirm: true }
  }
  const ctx = secondConfirmFor(text(args.observationId))
  if (!ctx) return args
  return {
    ...args,
    previousObservationId: ctx.previousObservationId ?? args.previousObservationId,
    previousThumbnailPath: ctx.previousThumbnailPath ?? args.previousThumbnailPath,
    previousAppName: ctx.previousAppName ?? args.previousAppName,
    previousElementName: ctx.previousElementName ?? args.previousElementName,
    needsSecondConfirm: true
  }
}

/** 把新旧路径读成卡片用的 data URL。读失败就保留路径，不假装有图。 */
export async function attachDesktopApprovalThumbs(
  args: Record<string, unknown>,
  readThumb: (filePath?: string) => Promise<string | undefined>
): Promise<Record<string, unknown>> {
  const thumbnailDataUrl = await readOptional(args.thumbnailPath, args.thumbnailDataUrl, readThumb)
  const previousThumbnailDataUrl = await readOptional(
    args.previousThumbnailPath,
    args.previousThumbnailDataUrl,
    readThumb
  )
  return {
    ...args,
    ...(thumbnailDataUrl ? { thumbnailDataUrl } : {}),
    ...(previousThumbnailDataUrl ? { previousThumbnailDataUrl } : {})
  }
}

/** 卡片主允许：二次确认必须两张 data URL 都在。 */
export function secondConfirmThumbsReady(args: Record<string, unknown>): boolean {
  return Boolean(text(args.previousThumbnailDataUrl) && text(args.thumbnailDataUrl))
}

/**
 * 确认后只许点新观察；缺任一缩略图路径诚实失败，禁止静默 click。
 * 匹配成功、无二次确认记忆时不拦（CU-P0-D 无图仍可点）。
 */
export function refuseSecondConfirmAct(
  input: { observationId: string; thumbnailPath?: string },
  currentThumbPath?: string
): { success: false; code: string; message: string } | null {
  if (isPreviousOfSecondConfirm(input.observationId)) {
    return {
      success: false,
      code: "needs_second_confirm",
      message: "Act on the new observation only."
    }
  }
  const ctx = secondConfirmFor(input.observationId)
  if (!ctx) return null
  const previous = text(ctx.previousThumbnailPath)
  const current = text(currentThumbPath) || text(input.thumbnailPath)
  if (previous && current) return null
  return {
    success: false,
    code: "screenshot_unavailable",
    message: "Second confirm requires both thumbnails."
  }
}

function isPreviousOfSecondConfirm(observationId: string): boolean {
  const id = text(observationId)
  if (!id) return false
  for (const ctx of byObservation.values()) {
    if (text(ctx.previousObservationId) === id) return true
  }
  return false
}

function hasPreviousThumb(args: Record<string, unknown>): boolean {
  return Boolean(text(args.previousThumbnailPath) || text(args.previousThumbnailDataUrl))
}

async function readOptional(
  pathValue: unknown,
  existing: unknown,
  readThumb: (filePath?: string) => Promise<string | undefined>
): Promise<string | undefined> {
  const already = text(existing)
  if (already) return already
  const path = text(pathValue)
  if (!path) return undefined
  return readThumb(path)
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}
