/**
 * 消息「更多」：把工程向动作（原始 JSON / 提取对象）收进菜单，不占主操作栏。
 */
import type { ReactNode } from "react"
import { RiMoreLine } from "@remixicon/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { MessageAction } from "@/components/ai-elements/message"
import { useT } from "@renderer/i18n"

export function MessageMoreMenu({ children }: { children: ReactNode }) {
  const t = useT()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <MessageAction tooltip={t("chat.moreActions")} label={t("chat.moreActions")}>
          <RiMoreLine className="size-4" />
        </MessageAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44 p-1">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
