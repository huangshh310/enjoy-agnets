/**
 * 侧栏模块轨道 (Sidebar Module Rails):
 * 对齐原型 Slide 3/4「模块是轨道，不是 6 个独立产品」：
 * 在侧栏底部提供对 Chat、Knowledge、Workflows、Media、MCP、Observability、Settings 的常驻通道。
 */
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { MODULE_RAILS } from "./sidebar-module-rails.constants"

export function SidebarModuleRails({ collapsed }: { collapsed: boolean }) {
  const t = useT()
  const navigate = useNavigate()
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  return (
    <nav
      aria-label={t("nav.groupIntegrations")}
      className={cx(
        "flex flex-col gap-0.5 border-t border-separator-border/60 pt-2",
        collapsed && "items-center"
      )}
    >
      {MODULE_RAILS.map((item) => {
        const Icon = item.icon
        const isActive = item.matchPrefix
          ? pathname.startsWith(item.matchPrefix)
          : pathname === "/"
        const label = t(item.labelKey)

        return (
          <button
            key={item.id}
            type="button"
            title={collapsed ? label : undefined}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            onClick={() => void navigate({ to: item.to })}
            className={cx(
              "flex items-center gap-2 rounded-lg text-left transition-colors cursor-pointer outline-none select-none",
              collapsed
                ? "size-8 justify-center"
                : "w-full px-2.5 py-1.5 text-caption-1-medium",
              isActive
                ? "bg-background-secondary-default text-text-primary font-semibold shadow-2xs"
                : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
            )}
          >
            <Icon
              className={cx(
                "shrink-0",
                collapsed ? "size-4.5" : "size-4",
                isActive ? "text-accent-500" : "text-foreground-icon-secondary"
              )}
            />
            {collapsed ? null : (
              <span className="min-w-0 flex-1 truncate">{label}</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
