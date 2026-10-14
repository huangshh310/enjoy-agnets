/**
 * 全局 toast 贴内容区中线；底边按 clearance 实测，一条规则。
 */
import { Toaster } from "@/components/ui/sonner"
import { useToastBottomOffset } from "@renderer/hooks/use-toast-bottom-offset"
import { useChatStore } from "@renderer/stores/chat-store"
import { CANVAS_PAD_PX, NAV_CARD_COLLAPSED_PX, NAV_CARD_EXPANDED_PX } from "../app-shell/constants"
import { toastContentOffsetLeft } from "../../lib/toast-content-offset"

export function AppToaster() {
  const collapsed = useChatStore((state) => state.sidebarCollapsed)
  // 窄窗浮层不挤主区，内容区左缘仍是收起宽度（luna z151-1）。
  const narrow = useChatStore((state) => state.sidebarCollapseState.narrow)
  const navWidth = collapsed || narrow ? NAV_CARD_COLLAPSED_PX : NAV_CARD_EXPANDED_PX
  const offsetBottom = useToastBottomOffset()
  return (
    <Toaster
      offsetLeft={toastContentOffsetLeft(navWidth, CANVAS_PAD_PX)}
      offsetBottom={offsetBottom}
    />
  )
}
