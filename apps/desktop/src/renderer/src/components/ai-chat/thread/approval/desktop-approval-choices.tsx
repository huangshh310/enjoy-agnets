/**
 * 桌面名片四选一：单选列表，testid 在选项上。继续才落决策。
 */
import { cx } from "@/utils/cx"
import { useT, type TranslateFn } from "@renderer/i18n"
import {
  desktopApprovalChoiceIds,
  desktopApprovalChoiceTestId,
  resolveDesktopApprovalChoice,
  type DesktopApprovalChoice
} from "./desktop-approval-choice"

export function DesktopApprovalChoices({
  appName,
  canSessionAllow,
  canAlwaysAllow,
  value,
  onChange
}: {
  appName: string
  canSessionAllow: boolean
  canAlwaysAllow: boolean
  value: DesktopApprovalChoice
  onChange: (choice: DesktopApprovalChoice) => void
}) {
  const t = useT()
  const ids = desktopApprovalChoiceIds({ canSessionAllow, canAlwaysAllow })
  const selected = resolveDesktopApprovalChoice(value, ids)
  return (
    <div role="radiogroup" aria-label={t("chat.desktopApprovalTitle", { app: appName })} className="mt-3 flex flex-col gap-1.5">
      {ids.map((id) => (
        <ChoiceRow
          key={id}
          choice={id}
          selected={selected === id}
          featured={id === "allow_always"}
          label={choiceLabel(id, appName, t)}
          hint={id === "allow_always" ? t("chat.desktopAllowAlwaysHint") : undefined}
          onSelect={() => onChange(id)}
        />
      ))}
    </div>
  )
}

function ChoiceRow({
  choice,
  selected,
  featured,
  label,
  hint,
  onSelect
}: {
  choice: DesktopApprovalChoice
  selected: boolean
  featured: boolean
  label: string
  hint?: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-testid={desktopApprovalChoiceTestId(choice)}
      onClick={onSelect}
      className={cx(
        "flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left text-caption-1-medium transition-colors",
        selected && featured
          ? "border-accent-500 bg-accent-500/5 ring-1 ring-accent-500/30"
          : selected
            ? "border-accent-500/40 bg-background-primary-default"
            : "border-border-button-default hover:bg-background-secondary-hover"
      )}
    >
      <span
        className={cx(
          "mt-0.5 size-3.5 shrink-0 rounded-full border",
          selected ? "border-2 border-accent-500 bg-accent-500" : "border-border-button-default"
        )}
      />
      <span className="min-w-0 flex-1">
        <span className={cx("block text-text-primary", featured && "font-semibold")}>{label}</span>
        {hint ? <span className="mt-0.5 block text-caption-2-medium text-text-tertiary">{hint}</span> : null}
      </span>
    </button>
  )
}

function choiceLabel(id: DesktopApprovalChoice, appName: string, t: TranslateFn): string {
  if (id === "allow_session") return t("chat.desktopAllowSessionApp", { app: appName })
  if (id === "allow_always") return t("chat.desktopAllowAlwaysApp", { app: appName })
  if (id === "deny") return t("chat.deny")
  return t("chat.desktopAllowOnce")
}
