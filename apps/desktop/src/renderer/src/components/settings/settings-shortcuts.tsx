/**
 * 设置 → 快捷键。行可以录、加、删、恢复。真正生效的是解析后的用户规则。
 */
import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { RiInformationLine, RiKeyboardBoxLine, RiSearchLine } from "@remixicon/react"
import {
  rebindKeybinding,
  resetKeybindingCommand,
  resolveKeybindings,
  type KeybindingCommand,
  type KeybindingRule
} from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { patchPreferences, useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { SettingsCard } from "./settings-row"
import { KEYBINDING_CATALOG, metaFor, type KeybindingCategory } from "./keybindings/keybinding-catalog"
import { isApplePlatform, keybindingPlatform } from "./keybindings/keybinding-format"
import { KeybindingRow } from "./keybindings/keybinding-row"

type EditState = { command: KeybindingCommand; fromKey: string | null; rowKey: string }

export function ShortcutSettings() {
  const t = useT()
  const queryClient = useQueryClient()
  const { data } = useSettingsSnapshot()
  const [search, setSearch] = useState("")
  const [edit, setEdit] = useState<EditState | null>(null)
  const [error, setError] = useState("")
  const userRules = data?.preferences.keybindings ?? []
  const baseline = JSON.stringify(userRules)
  const issues = data?.keybindingIssues ?? []
  const rows = useMemo(() => visibleRows(userRules, search, t), [userRules, search, t])

  async function save(rules: KeybindingRule[]) {
    if (rules.length > 256) {
      setError(t("settings.shortcuts.tooMany"))
      return
    }
    setError("")
    setEdit(null)
    await patchPreferences({ keybindings: rules })
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  function removeChord(command: KeybindingCommand, chord: string) {
    const result = rebindKeybinding({
      userRules,
      command,
      fromKey: chord,
      toKey: "unassigned",
      platform: keybindingPlatform()
    })
    if (result.ok) void save(result.rules)
  }

  return (
    <div className="flex flex-col gap-6">
      <ShortcutHeader
        search={search}
        mac={isApplePlatform()}
        canReset={userRules.length > 0}
        onSearch={setSearch}
        onResetAll={() => void save([])}
      />
      {issues.length > 0 ? <IssueBanner names={issueNames(issues, t)} /> : null}
      {error ? <p className="text-caption-1-medium text-destructive">{error}</p> : null}
      <ShortcutGroups
        rows={rows}
        userRules={userRules}
        baseline={baseline}
        edit={edit}
        onEdit={setEdit}
        onDelete={removeChord}
        onReset={(command) => void save(resetKeybindingCommand(userRules, command))}
        onSave={(rules) => void save(rules)}
        onCancel={() => setEdit(null)}
      />
      {rows.length === 0 ? <EmptyShortcuts /> : null}
    </div>
  )
}

function ShortcutGroups(props: {
  rows: ReturnType<typeof visibleRows>
  userRules: readonly KeybindingRule[]
  baseline: string
  edit: EditState | null
  onEdit: (edit: EditState) => void
  onDelete: (command: KeybindingCommand, chord: string) => void
  onReset: (command: KeybindingCommand) => void
  onSave: (rules: KeybindingRule[]) => void
  onCancel: () => void
}) {
  const t = useT()
  const customized = new Set(props.userRules.map((rule) => rule.command))
  return (
    <>
      {(["global", "views", "chat"] as const).map((category) => {
        const items = props.rows.filter((row) => row.category === category)
        if (items.length === 0) return null
        return (
          <SettingsCard key={category} title={t(groupTitle(category))}>
            {items.map((row) => (
              <KeybindingRow
                key={`${row.command}-${row.chord}`}
                meta={metaFor(row.command)}
                chord={row.chord}
                customized={customized.has(row.command)}
                editing={props.edit?.command === row.command && props.edit.rowKey === row.chord}
                recordFromKey={props.edit?.fromKey ?? null}
                userRules={props.userRules}
                baseline={props.baseline}
                onEdit={() => props.onEdit({ command: row.command, fromKey: row.chord === "unassigned" ? null : row.chord, rowKey: row.chord })}
                onAdd={() => props.onEdit({ command: row.command, fromKey: null, rowKey: row.chord })}
                onDelete={() => props.onDelete(row.command, row.chord)}
                onReset={() => props.onReset(row.command)}
                onSave={props.onSave}
                onCancel={props.onCancel}
              />
            ))}
          </SettingsCard>
        )
      })}
    </>
  )
}

function visibleRows(userRules: readonly KeybindingRule[], search: string, t: (path: string) => string) {
  const query = search.trim().toLowerCase()
  return resolveKeybindings(userRules)
    .map((rule) => ({ ...metaFor(rule.command), chord: rule.key }))
    .filter((row) => {
      if (!query) return true
      const title = t(row.actionKey).toLowerCase()
      const desc = t(row.descKey).toLowerCase()
      return title.includes(query) || desc.includes(query) || row.chord.includes(query)
    })
}

function groupTitle(category: KeybindingCategory): string {
  if (category === "global") return "settings.shortcuts.groupGlobal"
  if (category === "views") return "settings.shortcuts.groupViews"
  return "settings.shortcuts.groupChat"
}

function issueNames(issues: string[], t: (path: string, vars?: Record<string, string | number>) => string): string {
  return issues
    .map((issue) => {
      const meta = KEYBINDING_CATALOG.find((item) => item.command === issue)
      return meta ? t(meta.actionKey) : issue
    })
    .join("、")
}

function ShortcutHeader({
  search,
  mac,
  canReset,
  onSearch,
  onResetAll
}: {
  search: string
  mac: boolean
  canReset: boolean
  onSearch: (value: string) => void
  onResetAll: () => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10 text-accent-500">
            <RiKeyboardBoxLine className="size-6" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-title-3-semibold text-text-primary">{t("settings.shortcuts.hubTitle")}</span>
              <span className="rounded-md bg-background-secondary-default px-2 py-0.5 text-caption-2-medium text-text-tertiary">
                {mac ? t("settings.shortcuts.layoutMac") : t("settings.shortcuts.layoutWin")}
              </span>
            </div>
            <span className="mt-0.5 text-caption-2-regular text-text-tertiary">{t("settings.shortcuts.hubDesc")}</span>
          </div>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative w-full sm:w-64">
            <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder={t("settings.shortcuts.searchPlaceholder")}
              className="h-8 w-full rounded-lg border border-border-button-default bg-background-secondary-default pl-8 pr-2.5 text-caption-2-regular text-text-primary outline-none focus:border-border-focus-ring"
            />
          </div>
          <button
            type="button"
            disabled={!canReset}
            onClick={onResetAll}
            className="h-8 shrink-0 rounded-lg border border-border-button-default px-2.5 text-caption-2-medium text-text-secondary hover:bg-background-secondary-hover disabled:opacity-40"
          >
            {t("settings.shortcuts.resetAll")}
          </button>
        </div>
      </div>
      <p className="text-caption-2-regular text-text-tertiary">{t("settings.shortcuts.fixedHint")}</p>
    </div>
  )
}

function IssueBanner({ names }: { names: string }) {
  const t = useT()
  return <p className="text-caption-1-medium text-destructive">{t("settings.shortcuts.invalid", { names })}</p>
}

function EmptyShortcuts() {
  const t = useT()
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border-button-default bg-background-primary-default p-8 text-center shadow-card">
      <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-background-secondary-default text-text-tertiary">
        <RiInformationLine className="size-5" />
      </div>
      <p className="text-caption-1-medium text-text-primary">{t("settings.shortcuts.empty")}</p>
    </div>
  )
}
