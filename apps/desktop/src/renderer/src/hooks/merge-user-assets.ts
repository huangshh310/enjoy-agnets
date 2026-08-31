/**
 * 同会话重新灌入时，DB 还没 file part 则保住内存里的用户气泡附件。
 */

export type AssetBearingMessage = {
  role: string
  content: string
  assets?: unknown[]
}

export function mergeUserAssets<T extends AssetBearingMessage>(next: T[], previous: T[]): T[] {
  return next.map((message) => {
    if (message.role !== "user" || (message.assets?.length ?? 0) > 0) return message
    const match = previous.find(
      (item) => item.role === "user" && item.content === message.content && (item.assets?.length ?? 0) > 0
    )
    return match?.assets?.length ? { ...message, assets: match.assets } : message
  })
}
