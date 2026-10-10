/**
 * 离开对话页时收起审查栏并记住，回到对话再还原。
 */
import { useEffect, useRef } from "react"
import { useChatStore } from "@renderer/stores/chat-store"

export function useInspectorOnConversation(isConversation: boolean) {
  const collapsed = useChatStore((state) => state.rightPanelCollapsed)
  const setCollapsed = useChatStore((state) => state.setRightPanelCollapsed)
  const remembered = useRef<boolean | null>(null)

  useEffect(() => {
    if (!isConversation) {
      if (remembered.current === null) remembered.current = collapsed
      if (!collapsed) setCollapsed(true)
      return
    }
    if (remembered.current === null) return
    const restore = remembered.current
    remembered.current = null
    if (collapsed !== restore) setCollapsed(restore)
  }, [collapsed, isConversation, setCollapsed])
}
