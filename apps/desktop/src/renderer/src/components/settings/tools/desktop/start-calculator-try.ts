/**
 * 「试一下 · 计算器」：切到执行并预填 @桌面 提示，不自动 agent.run，避免误伤探索。
 */
import { applyComposerSurface } from "@renderer/components/ai-chat/composer/composer-mode"
import { useChatStore } from "@renderer/stores/chat-store"

export const CALCULATOR_TRY_PROMPT = "@桌面 打开计算器，点 1 + 1 ="

export function startCalculatorTryFlow(navigateHome: () => void | Promise<unknown>) {
  const store = useChatStore.getState()
  store.setMode(applyComposerSurface(store.mode, "execute"))
  store.setComposer(CALCULATOR_TRY_PROMPT)
  return navigateHome()
}
