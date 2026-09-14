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

