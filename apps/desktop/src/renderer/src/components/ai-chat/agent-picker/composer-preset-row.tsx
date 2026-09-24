/**
 * 引擎选择器顶上的启动预设。点名字套用，保存记下当前组合。
 */
import { useEffect, useState } from "react"
import { ComposerPreset } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"
import { applyComposerPreset, currentPresetDraft } from "./apply-composer-preset"

export function ComposerPresetRow() {
  const t = useT()
  const [rows, setRows] = useState<ComposerPreset[]>([])
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState("")
  const [note, setNote] = useState("")

  useEffect(() => {
    void reload(setRows)
  }, [])

  return (
    <div className="border-b border-separator-border px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption-2-medium text-text-secondary">{t("chat.presetTitle")}</p>
        <button
          type="button"
          className="cursor-pointer text-caption-2-medium text-accent-500"
          onClick={() => setNaming((open) => !open)}
        >
          {t("chat.presetSave")}
        </button>
      </div>
      {naming ? (
        <PresetNameForm
          name={name}
          note={note}
          onName={setName}
          onNote={setNote}
          onSave={() => {
            void saveCurrent(name, note, setRows, () => {
              setNaming(false)
              setName("")
              setNote("")
            })
          }}
        />
      ) : null}
      <PresetList
        rows={rows}
        onApply={(row) => {
          void applyComposerPreset(row)
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
  onName,
  onNote,
  onSave
}: {
  name: string
  note: string
  onName: (value: string) => void
  onNote: (value: string) => void
  onSave: () => void
}) {
  const t = useT()
  return (
    <div className="mt-1.5 flex flex-col gap-1">
      <input
        value={name}
        placeholder={t("chat.presetName")}
        onChange={(event) => onName(event.target.value)}
        className="h-7 rounded-md border border-border-button-default bg-transparent px-2 text-caption-1-regular text-text-primary"
      />
      <input
        value={note}
        placeholder={t("chat.presetNote")}
        onChange={(event) => onNote(event.target.value)}
        className="h-7 rounded-md border border-border-button-default bg-transparent px-2 text-caption-1-regular text-text-primary"
      />
      <button
        type="button"
        className="h-7 cursor-pointer self-start rounded-md border border-border-button-default px-2 text-caption-2-medium text-text-primary"
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
    <ul className="mt-1 max-h-24 overflow-y-auto">
      {rows.map((row) => (
        <li key={row.id} className="flex items-center gap-2">
          <button
            type="button"
            title={row.note || undefined}
            className="min-w-0 flex-1 cursor-pointer truncate py-1 text-left text-caption-1-medium text-text-primary"
            onClick={() => onApply(row)}
          >
            {row.name}
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
      ))}
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
  setRows: (rows: ComposerPreset[]) => void,
  done: () => void
): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) return
  const saved = await getIde().settings.saveComposerPreset(currentPresetDraft(trimmed, note.trim()))
  const parsed = ComposerPreset.array().safeParse(saved)
  if (parsed.success) setRows(parsed.data)
  done()
}

async function removePreset(id: string, setRows: (rows: ComposerPreset[]) => void): Promise<void> {
  const saved = await getIde().settings.removeComposerPreset({ id })
  const parsed = ComposerPreset.array().safeParse(saved)
  setRows(parsed.success ? parsed.data : [])
}
