/**
 * 快捷键一行：标题、说明、按键、录制、加一条、删除、恢复此项。
 */
import type { ReactNode } from "react"
import { RiAddLine, RiDeleteBinLine, RiPencilLine, RiRestartLine } from "@remixicon/react"
import type { KeybindingCommand, KeybindingRule } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import type { KeybindingCommandMeta } from "./keybinding-catalog"
import { KeybindingKeys } from "./keybinding-keys"
import { KeybindingRecorder } from "./keybinding-recorder"

export function KeybindingRow({
  meta,
  chord,
  customized,
  editing,
  recordFromKey,
  userRules,
  baseline,
  onEdit,
  onAdd,
  onDelete,
  onReset,
  onSave,
  onCancel
}: {
  meta: KeybindingCommandMeta
  chord: string
  customized: boolean
  editing: boolean
  recordFromKey: string | null
  userRules: readonly KeybindingRule[]
  baseline: string
  onEdit: () => void
  onAdd: () => void
  onDelete: () => void
  onReset: () => void
  onSave: (rules: KeybindingRule[]) => void
  onCancel: () => void
}) {
  const t = useT()
  return (
    <div className="flex items-center gap-3 px-4 py-3" data-testid={`keybinding-${meta.command}`}>
      <div className="min-w-0 flex-1">
        <p className="text-body-2-semibold text-text-primary">{t(meta.actionKey)}</p>
        <p className="mt-0.5 text-caption-2-regular text-text-tertiary">{t(meta.descKey)}</p>
      </div>
      {editing ? (
        <KeybindingRecorder
          command={meta.command}
          fromKey={recordFromKey}
          userRules={userRules}
          baseline={baseline}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : (
        <RowActions
          command={meta.command}
          chord={chord}
          customized={customized}
          onEdit={onEdit}
          onAdd={onAdd}
          onDelete={onDelete}
          onReset={onReset}
        />
      )}
    </div>
  )
}

function RowActions({
  command,
  chord,
  customized,
  onEdit,
  onAdd,
  onDelete,
  onReset
}: {
  command: KeybindingCommand
  chord: string
  customized: boolean
  onEdit: () => void
  onAdd: () => void
  onDelete: () => void
  onReset: () => void
}) {
  const t = useT()
  const unassigned = chord === "unassigned"
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {unassigned ? (
        <span className="px-1 text-caption-2-medium text-text-tertiary">{t("settings.shortcuts.unassigned")}</span>
      ) : (
        <KeybindingKeys chord={chord} />
      )}
      <IconButton label={t("settings.shortcuts.record")} onClick={onEdit} testId={`keybinding-edit-${command}`}>
        <RiPencilLine className="size-3.5" />
      </IconButton>
      <IconButton label={t("settings.shortcuts.add")} onClick={onAdd} testId={`keybinding-add-${command}`}>
        <RiAddLine className="size-3.5" />
      </IconButton>
      <IconButton label={t("settings.shortcuts.remove")} onClick={onDelete} disabled={unassigned} testId={`keybinding-remove-${command}`}>
        <RiDeleteBinLine className="size-3.5" />
      </IconButton>
      {customized ? (
        <IconButton label={t("settings.shortcuts.resetOne")} onClick={onReset}>
          <RiRestartLine className="size-3.5" />
        </IconButton>
      ) : null}
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  testId,
  children
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  testId?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      data-testid={testId}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  )
}
