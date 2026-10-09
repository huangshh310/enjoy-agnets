/**
 * 桌面名片四选一：单选列表，testid 在选项上。继续才落决策。
 * 坐标 / 前台把本会话与始终允许划掉；敏感卡直接不画这两项。
 */
import { cx } from "@/utils/cx"
import { useT, type TranslateFn } from "@renderer/i18n"
import {
  desktopApprovalChoiceIds,
  desktopApprovalChoiceTestId,
  desktopApprovalStruckTestId,
  resolveDesktopApprovalChoice,
  type DesktopApprovalChoice
} from "./desktop-approval-choice"

export function DesktopApprovalChoices({
  appName,
  canSessionAllow,
  canAlwaysAllow,
  strikeSessionAllow,
  strikeAlwaysAllow,
  value,
  onChange
}: {
  appName: string
  canSessionAllow: boolean
  canAlwaysAllow: boolean
  strikeSessionAllow?: boolean
  strikeAlwaysAllow?: boolean
  value: DesktopApprovalChoice
  onChange: (choice: DesktopApprovalChoice) => void
}) {
  const t = useT()
  const ids = desktopApprovalChoiceIds({ canSessionAllow, canAlwaysAllow })
  const selected = resolveDesktopApprovalChoice(value, ids)
  return (
    <div role="radiogroup" aria-label={t("chat.desktopApprovalTitle", { app: appName })} className="mt-3 flex flex-col gap-1.5">
      <ChoiceRow
        choice="allow"
        selected={selected === "allow"}
        label={choiceLabel("allow", appName, t)}
        onSelect={() => onChange("allow")}
      />
      {canSessionAllow ? (
        <ChoiceRow
          choice="allow_session"
          selected={selected === "allow_session"}
          label={choiceLabel("allow_session", appName, t)}
          onSelect={() => onChange("allow_session")}
        />
      ) : strikeSessionAllow ? (
        <StruckRow choice="allow_session" label={t("chat.desktopAllowSession")} />
      ) : null}
      {canAlwaysAllow ? (
        <ChoiceRow
          choice="allow_always"
          selected={selected === "allow_always"}
          label={choiceLabel("allow_always", appName, t)}
          hint={t("chat.desktopAllowAlwaysHint")}
          onSelect={() => onChange("allow_always")}
        />
      ) : strikeAlwaysAllow ? (
        <StruckRow choice="allow_always" label={t("chat.desktopAllowAlways")} />
      ) : null}
      <ChoiceRow
        choice="deny"
        selected={selected === "deny"}
        label={choiceLabel("deny", appName, t)}
        onSelect={() => onChange("deny")}
      />
    </div>
  )
}

function ChoiceRow({
  choice,
  selected,
  label,
  hint,
  onSelect
}: {
  choice: DesktopApprovalChoice
  selected: boolean
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
        selected
          ? "border-accent-500 bg-accent-500/5"
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
        <span className="block text-text-primary">{label}</span>
        {hint ? <span className="mt-0.5 block text-caption-2-medium text-text-tertiary">{hint}</span> : null}
      </span>
    </button>
  )
}

function StruckRow({ choice, label }: { choice: DesktopApprovalChoice; label: string }) {
  return (
    <p
      data-testid={desktopApprovalStruckTestId(choice)}
      aria-disabled="true"
      className="rounded-lg border border-dashed border-border-button-default px-2.5 py-1.5 text-caption-1-medium text-text-tertiary line-through opacity-60"
    >
      {label}
    </p>
  )
}

function choiceLabel(id: DesktopApprovalChoice, appName: string, t: TranslateFn): string {
  if (id === "allow_session") return t("chat.desktopAllowSessionApp", { app: appName })
  if (id === "allow_always") return t("chat.desktopAllowAlwaysApp", { app: appName })
  if (id === "deny") return t("chat.deny")
  return t("chat.desktopAllowOnce")
}
