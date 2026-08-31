/**
 * Composer 附件：先入资产库，发送时交给 agent.run。
 */
export type QueuedComposerAsset = { id: string; name: string }

let pending: QueuedComposerAsset[] = []
const listeners = new Set<(items: QueuedComposerAsset[]) => void>()

function notify() {
  const snapshot = [...pending]
  for (const listener of listeners) listener(snapshot)
}

export function queueComposerAsset(id: string, name = id) {
  pending.push({ id, name })
  notify()
}

export function takeComposerAssets(): string[] {
  const ids = pending.map((item) => item.id)
  pending = []
  notify()
  return ids
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
