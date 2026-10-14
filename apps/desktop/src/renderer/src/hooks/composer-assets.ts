/**
 * Composer 附件：先入资产库，发送时交给 agent.run。
 */
export type QueuedComposerAsset = {
  id: string
  name: string
  mediaType?: string
  size?: number
  url?: string
}

let pending: QueuedComposerAsset[] = []
/**
 * jojo P1：用户亲手加 / 删附件时落库到**当前会话**草稿（切会话 / 新建时的整体替换不走这里，避免写错会话）。
 */
let persistUserEdit: ((items: QueuedComposerAsset[]) => void) | null = null
export function setComposerAssetPersister(fn: ((items: QueuedComposerAsset[]) => void) | null): void {
  persistUserEdit = fn
}
const listeners = new Set<(items: QueuedComposerAsset[]) => void>()

function notify() {
  const snapshot = [...pending]
  for (const listener of listeners) listener(snapshot)
}

export function queueComposerAsset(
  idOrAsset: string | QueuedComposerAsset,
  name?: string,
  mediaType?: string,
  size?: number,
  url?: string
) {
  if (typeof idOrAsset === "object") {
    pending.push(idOrAsset)
  } else {
    pending.push({
      id: idOrAsset,
      name: name ?? idOrAsset,
      mediaType,
      size,
      url
    })
  }
  notify()
  persistUserEdit?.([...pending])
}

export function removeComposerAsset(id: string) {
  const found = pending.find((item) => item.id === id)
  if (found?.url && found.url.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(found.url)
    } catch {
      // ignore
    }
  }
  pending = pending.filter((item) => item.id !== id)
  notify()
  persistUserEdit?.([...pending])
}
export function clearComposerAssets() {
  for (const item of pending) {
    if (item.url && item.url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(item.url)
      } catch {
        // ignore
      }
    }
  }
  pending = []
  notify()
}

export function setComposerAssets(items: QueuedComposerAsset[]) {
  pending = [...items]
  notify()
}


export function takeComposerAssets(): string[] {
  const ids = pending.map((item) => item.id)
  pending = []
  notify()
  return ids
}

export function takeComposerAssetDetails(): QueuedComposerAsset[] {
  const details = [...pending]
  pending = []
  notify()
  return details
}

/**
 * jojo #155 P1/P2：图跟排队项走——从输入框取走，同时清掉这个会话库里的草稿附件，
 * 否则 × 掉 / 马上发 / 切走再切回，图会从 session_draft_assets 冒回来。
 */
export function takeComposerAssetsForQueue(): QueuedComposerAsset[] {
  const details = [...pending]
  pending = []
  notify()
  if (details.length > 0) persistUserEdit?.([])
  return details
}

export function listComposerAssets(): QueuedComposerAsset[] {
  return [...pending]
}

export function subscribeComposerAssets(listener: (items: QueuedComposerAsset[]) => void) {
  listeners.add(listener)
  listener(listComposerAssets())
  return () => {
    listeners.delete(listener)
  }
}

