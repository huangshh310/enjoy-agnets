/**
 * WebGL 渲染：加载失败或 context loss 立刻卸掉，回落 DOM，避免白屏。
 */
export type WebglAddonLike = {
  onContextLoss: (cb: () => void) => { dispose?: () => void } | void
  dispose: () => void
}

export function attachWebglOrDom(
  loadAddon: (addon: WebglAddonLike) => void,
  createAddon: () => WebglAddonLike
): "webgl" | "dom" {
  try {
    const addon = createAddon()
    addon.onContextLoss(() => {
      addon.dispose()
    })
    loadAddon(addon)
    return "webgl"
  } catch {
    return "dom"
  }
}
