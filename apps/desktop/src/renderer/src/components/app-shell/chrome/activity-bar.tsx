/**
 * 第一张卡左侧图标轨道。折叠开关在窗口标题栏，不在轨道顶。
 */
import { useMemo } from "react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { AppModuleId } from "../app-shell.types"
import { ACTIVITY_BAR_PX, NAV_CARD_COLLAPSED_PX } from "../constants"
import { useAttentionStore } from "@renderer/stores/attention/attention-store"
import { stripApprovalCountForOpenSessions } from "@renderer/stores/attention/ingest-attention"
import { useChatStore } from "@renderer/stores/chat-store"
import { ACTIVITY_ICONS, OVERLAY_RAIL_ITEMS, WORK_RAIL_ITEMS } from "./module-registry"
import { RailButton } from "./rail-button"

export function ActivityBar({
  activeModule,
  collapsed,
  running,
  onSelect
}: {
  activeModule: AppModuleId
  collapsed: boolean
  running: boolean
  onSelect: (moduleId: AppModuleId, to: string) => void
}) {
  const t = useT()
  const repositories = useChatStore((state) => state.repositories)
  const attentionItems = useAttentionStore((state) => state.items)
  const attentionCount = useMemo(() => {
    const openSessionIds = new Set(
      repositories.filter((node) => node.kind === "session").map((node) => node.id)
    )
    return stripApprovalCountForOpenSessions(attentionItems, openSessionIds)
  }, [attentionItems, repositories])
  return (
    <nav
      aria-label={t("nav.modules")}
      style={{ width: collapsed ? NAV_CARD_COLLAPSED_PX : ACTIVITY_BAR_PX }}
      className={cx(
        "flex h-full shrink-0 flex-col items-center gap-1 py-2",
        !collapsed && "border-r border-separator-border/60"
      )}
    >
      {WORK_RAIL_ITEMS.map((item) => (
        <RailButton
          key={item.id}
          active={activeModule === item.id}
          label={t(item.labelKey)}
          icon={ACTIVITY_ICONS[item.id]}
          pulse={item.id === "chat" && running}
          onClick={() => onSelect(item.id, item.to)}
        />
      ))}
      <div className="mt-auto flex flex-col items-center gap-1">
        {OVERLAY_RAIL_ITEMS.map((item) => (
          <RailButton
            key={item.id}
            active={activeModule === item.id}
            label={t(item.labelKey)}
            icon={ACTIVITY_ICONS[item.id]}
            count={item.id === "inbox" ? attentionCount : undefined}
            onClick={() => onSelect(item.id, item.to)}
          />
        ))}
      </div>
    </nav>
  )
}
