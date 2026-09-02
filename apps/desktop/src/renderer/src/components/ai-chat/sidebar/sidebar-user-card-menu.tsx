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
      {showDivider ? <div className="-mx-2.5 my-2 h-px bg-border-button-default" /> : null}
      <div className={cx("flex w-full flex-col gap-1", group.label && "gap-1.5 pt-1")}>
        {group.label ? (
          <span className="px-2 text-caption-1-semibold text-text-tertiary">{group.label}</span>
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
  return (
    <button
      type="button"
      onClick={() => {
        item.onClick?.()
        onSelect()
      }}
      className={cx(
        "flex w-full cursor-pointer items-center justify-between rounded-2lg px-2 py-1.5 text-left outline-none transition-colors",
        item.isSelected
          ? "bg-background-primary-hover"
          : "hover:bg-background-primary-hover focus-visible:bg-background-primary-hover"
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2.5">
        <Icon className="size-4.5 shrink-0 text-foreground-icon-secondary" aria-hidden />
        <span className="truncate text-body-medium text-text-primary">{item.label}</span>
      </span>
      {item.badge ? (
        <Badge
          color="neutral"
          className="ml-2 h-5 rounded-full bg-background-tertiary-hover px-1.5 text-caption-2-semibold text-text-secondary"
        >
          {item.badge}
        </Badge>
      ) : null}
    </button>
  )
}
