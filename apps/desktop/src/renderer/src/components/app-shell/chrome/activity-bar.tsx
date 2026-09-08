/**
 * 第一张卡左侧图标轨道。选中态只用 token。
 */
import { RiSideBarFill } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { AppModuleId } from "../app-shell.types"
import { ACTIVITY_BAR_PX, NAV_CARD_COLLAPSED_PX } from "../constants"
import { useAttentionStore } from "@renderer/stores/attention/attention-store"
import { stripNeedsCount } from "@renderer/stores/attention/ingest-attention"
import { ACTIVITY_ICONS, OVERLAY_RAIL_ITEMS, WORK_RAIL_ITEMS } from "./module-registry"
import { RailButton } from "./rail-button"

export function ActivityBar({
  activeModule,
  collapsed,
  running,
  onToggleCollapsed,
  onSelect
}: {
  activeModule: AppModuleId
  collapsed: boolean
  running: boolean
  onToggleCollapsed: () => void
  onSelect: (moduleId: AppModuleId, to: string) => void
}) {
  const t = useT()
  const attentionCount = useAttentionStore((state) => stripNeedsCount(state.items))
  return (
    <nav
      aria-label={t("nav.modules")}
      style={{ width: collapsed ? NAV_CARD_COLLAPSED_PX : ACTIVITY_BAR_PX }}
      className={cx(
        "flex h-full shrink-0 flex-col items-center gap-1 py-2",
        !collapsed && "border-r border-separator-border/60"
      )}
    >
      <button
        type="button"
        aria-label={collapsed ? t("chat.expandSidebar") : t("chat.collapseSidebar")}
        onClick={onToggleCollapsed}
        className="mb-1 flex size-9 cursor-pointer items-center justify-center rounded-2lg text-foreground-icon-secondary outline-none hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        <RiSideBarFill className={cx("size-5", collapsed ? "" : "-scale-x-100")} aria-hidden />
      </button>
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
