/**
 * 创建项目第一步：本地 / 远程类型选择。
 */
import { RiComputerLine, RiGlobalLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"

export function CreateProjectTypeStep({
  projectType,
  onChangeType,
  onCancel,
  onNext
}: {
  projectType: "local" | "remote"
  onChangeType: (type: "local" | "remote") => void
  onCancel: () => void
  onNext: () => void
}) {
  const t = useT()

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-2">
        <Label className="text-caption-1-medium font-semibold text-text-secondary">{t("pages.workspaces.createProject.typeLabel")}</Label>
        <div className="grid grid-cols-2 gap-3">
          <TypeCard
            selected={projectType === "local"}
            icon={RiComputerLine}
            title={t("pages.workspaces.createProject.localTitle")}
            description={t("pages.workspaces.createProject.localDesc")}
            onClick={() => onChangeType("local")}
          />
          <TypeCard
            selected={false}
            disabled
            icon={RiGlobalLine}
            title={t("pages.workspaces.createProject.remoteTitle")}
            badge={t("pages.workspaces.createProject.comingSoon")}
            description={t("pages.workspaces.createProject.remoteDesc")}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2 border-t border-separator-border/60 pt-4">
        <Button variant="outline" size="sm" onClick={onCancel}>
          {t("pages.workspaces.createProject.cancel")}
        </Button>
        <Button size="sm" onClick={onNext} className="gap-1 shadow-xs">
          <span>{t("pages.workspaces.createProject.next")}</span>
        </Button>
      </div>
    </div>
  )
}

function TypeCard({
  selected,
  disabled = false,
  icon: Icon,
  title,
  badge,
  description,
  onClick
}: {
  selected: boolean
  disabled?: boolean
  icon: typeof RiComputerLine
  title: string
  badge?: string
  description: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cx(
        "relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-left shadow-xs transition-all",
        disabled
          ? "cursor-not-allowed border-border-button-default bg-background-secondary-default/40 opacity-60"
          : selected
            ? "cursor-pointer border-accent-500/60 bg-accent-500/[0.04] ring-2 ring-accent-500/20"
            : "cursor-pointer border-border-button-default bg-background-secondary-default/50 hover:bg-background-secondary-hover"
      )}
    >
      <div className="flex w-full items-center justify-between">
        <Icon className={cx("size-5", selected ? "text-accent-500" : "text-text-secondary")} />
        <div
          className={cx(
            "flex size-4 items-center justify-center rounded-full border",
            selected ? "border-accent-500 bg-accent-500" : "border-border-button-default bg-transparent"
          )}
        >
          {selected ? <div className="size-1.5 rounded-full bg-background-primary-default" /> : null}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-body-medium font-semibold text-text-primary">{title}</p>
          {badge ? (
            <span className="rounded bg-background-tertiary-default px-1 font-mono text-caption-2-medium text-text-tertiary">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-2 text-caption-2-medium leading-relaxed text-text-tertiary">
          {description}
        </p>
      </div>
    </button>
  )
}
