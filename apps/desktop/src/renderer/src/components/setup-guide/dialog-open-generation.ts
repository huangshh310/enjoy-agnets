/**
 * 向导每「打开一次」换一代 key。
 *
 * 根因：Radix Dialog 的遮罩和内容各自单独 portal 到 body、各自等退场动画结束才卸载。向导为「改密钥 / 添加密钥」
 * 暂停（open=false）后，遮罩先退完卸载、内容还在退场；这时存完密钥立刻恢复向导，Radix 复用仍挂着的旧内容节点，
 * 却把新遮罩追加到 body 末尾——遮罩压在内容上面（同为 z-50，DOM 后者在上），「继续」点不到，整窗被灰层罩住。
 * 每次重新打开换 key，旧的整套 portal 立刻卸载，新遮罩、新内容按顺序挂上，遮罩永远在内容下面。
 */
import { useRef } from "react"

/** 纯函数：只有从关到开才进下一代；开着重渲染、关着、关上都不变。 */
export function nextOpenGeneration(prev: { open: boolean; generation: number }, open: boolean): {
  open: boolean
  generation: number
} {
  return { open, generation: open && !prev.open ? prev.generation + 1 : prev.generation }
}

/** 渲染期同步算出本代 key（不能等 effect：effect 前那一帧已经复用旧内容、遮罩已压上去）。 */
export function useOpenGeneration(open: boolean): number {
  const state = useRef({ open: false, generation: 0 })
  state.current = nextOpenGeneration(state.current, open)
  return state.current.generation
}
