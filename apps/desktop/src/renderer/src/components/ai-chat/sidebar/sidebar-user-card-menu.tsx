/**
 * 侧栏底栏用户信息展开弹窗菜单内容组件。
 * 遵循 BoardUI 视觉与交互规约：三段式列表、Header、Footer。
 */
import { AppMark } from "@renderer/components/brand/app-mark"
import { Badge } from "@/components/base/badges/badge"
import { cx } from "@/utils/cx"
import { APP_VERSION } from "./sidebar-user-card-items"
import type { UserCardMenuGroup, UserCardMenuItem } from "./sidebar-user-card.types"

export function SidebarUserCardMenuContent({
  userName,
  userEmail,
  groups,
  onClose
}: {
  userName: string
  userEmail: string
  groups: UserCardMenuGroup[]
  onClose: () => void
}) {
  return (
    <div className="flex flex-col gap-2 outline-none">
      {/* 头部：头像与用户信息 */}
      <div className="flex w-full items-center gap-2.5 px-2 pt-1 pb-1">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-500/10 dark:bg-accent-500/20">
          <AppMark size={28} />
        </div>
        <div className="flex min-w-0 flex-col items-start justify-center">
          <span className="truncate text-body-medium font-semibold text-text-primary">{userName}</span>
          <span className="truncate text-body-regular text-text-secondary">{userEmail}</span>
        </div>
      </div>

      {/* 分组列表 */}
      <div className="flex w-full flex-col">
        {groups.map((group, index) => (
          <UserCardMenuGroupView
            key={group.id}
            group={group}
            showDivider={index > 0}
            onSelect={() => onClose()}
          />
        ))}
      </div>

      {/* 底部：品牌名与版本号 */}
      <div className="flex w-full items-center justify-between border-t border-border-button-default px-2 pt-2.5 pb-1">
        <span className="text-body-2-medium text-text-tertiary">Enjoy Agents</span>
        <span className="inline-flex items-center justify-center rounded-sm bg-background-tertiary-default px-1.5 py-0.5 text-caption-2-semibold text-text-tertiary">
          {APP_VERSION}
        </span>
      </div>
    </div>
  )
}

function UserCardMenuGroupView({
  group,
  showDivider,
  onSelect
}: {
  group: UserCardMenuGroup
  showDivider: boolean
  onSelect: () => void
}) {
  return (
    <>
      {showDivider ? <div className="my-1.5 h-px w-full bg-separator-border/60" /> : null}
      <div className={cx("flex w-full flex-col gap-0.5", group.label && "gap-1 pt-0.5")}>
        {group.label ? (
          <span className="px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-text-tertiary/90 select-none">
            {group.label}
          </span>
        ) : null}
        <div className="flex w-full flex-col gap-0.5">
          {group.items.map((item) => (
            <UserCardMenuItemRow key={item.id} item={item} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </>
  )
}

function UserCardMenuItemRow({
  item,
  onSelect
}: {
  item: UserCardMenuItem
  onSelect: () => void
}) {
  const Icon = item.icon
  const isSignOut = item.id === "sign-out"

  return (
    <button
      type="button"
      onClick={() => {
        item.onClick?.()
        onSelect()
      }}
      className={cx(
        "group flex w-full cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-left outline-none transition-all duration-150 active:scale-[0.98]",
        isSignOut
          ? "text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
          : item.isSelected
            ? "bg-background-secondary-hover text-text-primary"
            : "text-text-primary hover:bg-background-secondary-hover/90"
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2.5">
        <Icon
          className={cx(
            "size-4 shrink-0 transition-colors",
            isSignOut
              ? "text-rose-500 group-hover:text-rose-600 dark:group-hover:text-rose-400"
              : "text-foreground-icon-secondary group-hover:text-accent-500"
          )}
          aria-hidden
        />
        <span className="truncate text-caption-1-medium">{item.label}</span>
      </span>
      {item.badge ? (
        <Badge
          color="neutral"
          className="ml-2 h-4.5 rounded-full bg-background-tertiary-hover px-1.5 text-caption-2-semibold text-text-secondary"
        >
          {item.badge}
        </Badge>
      ) : null}
    </button>
  )
}
