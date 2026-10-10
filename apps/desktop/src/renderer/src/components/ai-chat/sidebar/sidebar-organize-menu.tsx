/**
 * 整理侧栏：分组 / 查看已归档 / 排序。
 */
import { useNavigate } from "@tanstack/react-router"
import { RiMoreFill } from "@remixicon/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function SidebarOrganizeMenu() {
  const t = useT()
  const navigate = useNavigate()
  const grouping = useChatStore((state) => state.sidebarGrouping)
  const setGrouping = useChatStore((state) => state.setSidebarGrouping)
  const sortOrder = useChatStore((state) => state.sessionSortOrder)
  const setSortOrder = useChatStore((state) => state.setSessionSortOrder)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("chat.organizeProjects")}
          className="flex size-6 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-background-secondary-hover hover:text-text-primary cursor-pointer"
        >
          <RiMoreFill className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={4}
        collisionPadding={{ left: 16, top: 44, right: 12 }}
        className="min-w-52 rounded-xl border border-border-button-default bg-background-primary-default shadow-card"
      >
        <DropdownMenuLabel className="px-2 text-caption-2-medium text-text-tertiary">
          {t("chat.organizeSidebar")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={grouping}
          onValueChange={(val) => setGrouping(val as "project" | "flat" | "status")}
        >
          <DropdownMenuRadioItem value="project" className="text-body-medium">
            {t("chat.groupByProject")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="status" className="text-body-medium">
            {t("chat.groupByStatus")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="flat" className="text-body-medium">
            {t("chat.groupFlat")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="view-archived"
          className="text-body-medium"
          onSelect={() => void navigate({ to: "/settings/$section", params: { section: "archived" } })}
        >
          {t("chat.viewArchived")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-caption-2-medium text-text-tertiary">
          {t("chat.sessionSort")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sortOrder}
          onValueChange={(val) => setSortOrder(val as "priority" | "updated" | "manual")}
        >
          <DropdownMenuRadioItem value="priority" className="text-body-medium">
            {t("chat.sortPriority")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="updated" className="text-body-medium">
            {t("chat.sortUpdated")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="manual" className="text-body-medium">
            {t("chat.sortManual")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
