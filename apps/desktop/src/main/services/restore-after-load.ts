/**
 * 第一个窗口 did-finish-load 之后才 restore，避免 send 丢给未加载的 renderer。
 */
let started = false

export type LoadFinishContents = {
  once: (event: "did-finish-load", listener: () => void) => void
}

export function scheduleOrphanRestoreAfterLoad(
  contents: LoadFinishContents,
  restore: () => void
): void {
  contents.once("did-finish-load", () => {
    if (started) return
    started = true
    restore()
  })
}
