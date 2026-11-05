/**
 * 引擎选择器顶上的启动预设。点名字套用，保存记下当前组合。
 * 可选提示词草稿 + 可选「更倾向桌面操控」叙事（非批准）。
 */
import { useEffect, useState } from "react"
import { ComposerPreset, normalizePromptTemplate } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"
import { APP_TOAST_MS, showAppToast } from "@renderer/lib/app-toast"
import { applyComposerPreset, currentPresetDraft } from "./apply-composer-preset"

const PROMPT_LIMIT = 4000
const PROMPT_WARN_AT = 3800

export function ComposerPresetRow() {
  const t = useT()
  const [rows, setRows] = useState<ComposerPreset[]>([])
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState("")
  const [note, setNote] = useState("")
  const [promptTemplate, setPromptTemplate] = useState("")
  const [desktopBias, setDesktopBias] = useState(false)

  useEffect(() => {
    void reload(setRows)
  }, [])

  return (
    <div className="border-b border-separator-border px-3 py-2" data-testid="composer-preset-row">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption-2-medium text-text-secondary">{t("chat.presetTitle")}</p>
        <button
          type="button"
          className="cursor-pointer text-caption-2-medium text-accent-500"
          data-testid="composer-preset-save-toggle"
          onClick={() => setNaming((open) => !open)}
        >
          {t("chat.presetSave")}
        </button>
      </div>
      {naming ? (
        <PresetNameForm
          name={name}
          note={note}
          promptTemplate={promptTemplate}
          desktopBias={desktopBias}
          onName={setName}
          onNote={setNote}
          onPrompt={setPromptTemplate}
          onDesktopBias={setDesktopBias}
          onSave={() => {
            void saveCurrent(name, note, promptTemplate, desktopBias, setRows, t, () => {
              setNaming(false)
              setName("")
              setNote("")
              setPromptTemplate("")
              setDesktopBias(false)
            })
          }}
        />
      ) : null}
      <PresetList
        rows={rows}
        onApply={(row) => {
          void applyAndToast(row, t)
        }}
        onRemove={(id) => {
          void removePreset(id, setRows)
        }}
      />
    </div>
  )
}

function PresetNameForm({
  name,
  note,
  promptTemplate,
  desktopBias,
  onName,
  onNote,
  onPrompt,
  onDesktopBias,
  onSave
}: {
  name: string
  note: string
  promptTemplate: string
  desktopBias: boolean
  onName: (value: string) => void
  onNote: (value: string) => void
  onPrompt: (value: string) => void
  onDesktopBias: (value: boolean) => void
  onSave: () => void
}) {
  const t = useT()
  const count = promptTemplate.length
  const nearLimit = count >= PROMPT_WARN_AT
  return (
    <div className="mt-1.5 flex flex-col gap-1" data-testid="composer-preset-save-form">
      <input
        value={name}
        placeholder={t("chat.presetName")}
        onChange={(event) => onName(event.target.value)}
        className="h-7 rounded-md border border-border-button-default bg-transparent px-2 text-caption-1-regular text-text-primary"
        data-testid="composer-preset-name"
      />
      <input
        value={note}
        placeholder={t("chat.presetNote")}
        onChange={(event) => onNote(event.target.value)}
        className="h-7 rounded-md border border-border-button-default bg-transparent px-2 text-caption-1-regular text-text-primary"
        data-testid="composer-preset-note"
      />
      <div className="relative">
        <textarea
          value={promptTemplate}
          placeholder={t("chat.presetPromptPlaceholder")}
          maxLength={PROMPT_LIMIT}
          rows={3}
          onChange={(event) => onPrompt(event.target.value.slice(0, PROMPT_LIMIT))}
          className="min-h-[4.5rem] w-full resize-y rounded-md border border-border-button-default bg-transparent px-2 py-1.5 text-caption-1-regular text-text-primary"
          data-testid="composer-preset-prompt"
          aria-label={t("chat.presetPrompt")}
        />
        <span
          className={
            nearLimit
              ? "pointer-events-none absolute right-2 bottom-1.5 text-caption-2-regular text-status-yellow-text"
              : "pointer-events-none absolute right-2 bottom-1.5 text-caption-2-regular text-text-tertiary"
          }
          data-testid="composer-preset-prompt-count"
        >
          {count}/{PROMPT_LIMIT}
        </span>
      </div>
      <label className="flex cursor-pointer items-start gap-2 py-0.5" data-testid="composer-preset-desktop-bias">
        <input
          type="checkbox"
          checked={desktopBias}
          onChange={(event) => onDesktopBias(event.target.checked)}
          className="mt-0.5 size-3.5 shrink-0 rounded border-border-button-default"
        />
        <span className="min-w-0">
          <span className="block text-caption-1-medium text-text-primary">{t("chat.presetDesktopBias")}</span>
          <span className="block text-caption-2-regular text-text-tertiary">{t("chat.presetDesktopBiasHint")}</span>
        </span>
      </label>
      <button
        type="button"
        className="h-7 cursor-pointer self-start rounded-md border border-border-button-default px-2 text-caption-2-medium text-text-primary"
        data-testid="composer-preset-save-submit"
        onClick={onSave}
      >
        {t("chat.presetSave")}
      </button>
    </div>
  )
}

function PresetList({
  rows,
  onApply,
  onRemove
}: {
  rows: ComposerPreset[]
  onApply: (row: ComposerPreset) => void
  onRemove: (id: string) => void
}) {
  const t = useT()
  if (rows.length === 0) return null
  return (
    <ul className="mt-1 max-h-28 overflow-y-auto" data-testid="composer-preset-list">
      {rows.map((row) => {
        const hasPrompt = Boolean(normalizePromptTemplate(row.promptTemplate))
        return (
          <li key={row.id} className="flex items-center gap-2" data-testid={`composer-preset-item-${row.id}`}>
            <button
              type="button"
              title={row.note || undefined}
              className="min-w-0 flex-1 cursor-pointer truncate py-1 text-left text-caption-1-medium text-text-primary"
              data-testid="composer-preset-apply"
              onClick={() => onApply(row)}
            >
              <span className="truncate">{row.name}</span>
              {hasPrompt ? (
                <span className="ml-1.5 text-caption-2-regular text-text-tertiary">{t("chat.presetHasPrompt")}</span>
              ) : null}
              {row.desktopBias ? (
                <span className="ml-1.5 text-caption-2-regular text-accent-600">{t("chat.presetDesktopBiasMark")}</span>
              ) : null}
            </button>
            <button
              type="button"
              aria-label={t("chat.presetRemove")}
              className="cursor-pointer text-caption-2-medium text-text-tertiary"
              onClick={() => onRemove(row.id)}
            >
              {t("chat.presetRemove")}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

async function reload(setRows: (rows: ComposerPreset[]) => void): Promise<void> {
  const raw = await getIde().settings.composerPresets()
  const parsed = ComposerPreset.array().safeParse(raw)
  setRows(parsed.success ? parsed.data : [])
}

async function saveCurrent(
  name: string,
  note: string,
  promptTemplate: string,
  desktopBias: boolean,
  setRows: (rows: ComposerPreset[]) => void,
  t: (key: string, vars?: Record<string, string | number>) => string,
  done: () => void
): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) return
  const saved = await getIde().settings.saveComposerPreset(
    currentPresetDraft(trimmed, note.trim(), { promptTemplate, desktopBias })
  )
  const parsed = ComposerPreset.array().safeParse(saved)
  if (parsed.success) setRows(parsed.data)
  showAppToast(t("chat.presetSavedToast", { name: trimmed }), {
    duration: APP_TOAST_MS,
    testId: "composer-preset-saved-toast"
  })
  done()
}

async function applyAndToast(
  row: ComposerPreset,
  t: (key: string, vars?: Record<string, string | number>) => string
): Promise<void> {
  const wrotePrompt = await applyComposerPreset(row)
  if (wrotePrompt) {
    showAppToast(t("chat.presetAppliedToast", { name: row.name }), {
      duration: APP_TOAST_MS,
      testId: "composer-preset-applied-toast"
    })
  }
}

async function removePreset(id: string, setRows: (rows: ComposerPreset[]) => void): Promise<void> {
  const saved = await getIde().settings.removeComposerPreset({ id })
  const parsed = ComposerPreset.array().safeParse(saved)
  setRows(parsed.success ? parsed.data : [])
}
