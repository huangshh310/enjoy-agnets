/**
 * Files 预览/编辑：Monaco 可写，保存走 workspace.writeFile。
 */
import { useEffect, useRef, useState } from "react"
import { WorkspaceEditor } from "@enjoy-agents/editor"
import { useChatStore } from "@renderer/stores/chat-store"
import { getIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"

export function FilesPreviewEditor({
  workspaceId,
  path,
  content,
  error
}: {
  workspaceId: string
  path: string | null
  content: string
  error: string | null
}) {
  const t = useT()
  const sessionId = useChatStore((state) => state.sessionId)
  const [draft, setDraft] = useState(content)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const dirty = path !== null && draft !== content

  useEffect(() => {
    setDraft(content)
    setSaveError(null)
  }, [path, content])

  async function save() {
    if (!path || !dirty) return
    setSaving(true)
    setSaveError(null)
    try {
      await getIde().workspace.writeFile({
        workspaceId,
        path,
        content: draft,
        sessionId: sessionId ?? undefined
      })
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : t("chat.couldNotWrite"))
    } finally {
      setSaving(false)
    }
  }

  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return
      event.preventDefault()
      void saveRef.current()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  if (path && error) {
    return <p className="px-3 py-2 text-caption-1-medium text-text-error-primary">{error}</p>
  }
  if (!path) {
    return (
      <p className="flex h-full items-center justify-center px-3 text-center text-caption-1-medium text-text-tertiary">
        {t("chat.openAFile")}
      </p>
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-8 shrink-0 items-center justify-end gap-2 border-b border-separator-border px-2">
        {saveError ? (
          <span className="truncate text-caption-2-medium text-text-error-primary">{saveError}</span>
        ) : null}
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => void save()}
          className="rounded-md border border-border-button-default px-2 py-0.5 text-caption-2-medium text-text-primary disabled:opacity-40"
        >
          {saving ? t("chat.savingFile") : t("chat.saveFile")}
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <WorkspaceEditor path={path} value={draft} onChange={(value) => setDraft(value ?? "")} />
      </div>
    </div>
  )
}
