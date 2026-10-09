/**
 * 本机 Automations：列表 + 380px 抽屉。Chat `#/automations` 与设置段共用。
 */
import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import type { Automation } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { refreshAllWorkspaces } from "@renderer/hooks/session-lifecycle"
import { useI18n, useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import { DEFAULT_RUNTIME_ID } from "@renderer/lib/session-runtime"
import { requestInboxFilter } from "@renderer/components/inbox/lib/pending-inbox-filter"
import { AutomationDrawer } from "./components/automation-drawer"
import { AutomationFooter } from "./components/automation-footer"
import { AutomationList } from "./components/automation-list"
import { useAutomationMissed } from "./hooks/use-automation-missed"
import { draftFromAutomation, draftToUpsert, emptyAutomationDraft, type AutomationDraft } from "./lib/draft"

export function AutomationsPage() {
  const t = useT()
  const { locale } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const snapshot = useSettingsSnapshot()
  const tools = snapshot.data?.agentTools ?? []
  const defaults = {
    runtimeId: snapshot.data?.preferences.runtimeId ?? DEFAULT_RUNTIME_ID,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  }
  const [draft, setDraft] = useState<AutomationDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [now] = useState(() => Date.now())

  const automationsQuery = useQuery({
    queryKey: ["automations"],
    enabled: hasIde(),
    queryFn: () => getIde().automations.list() as Promise<Automation[]>
  })
  const automations = automationsQuery.data ?? []
  const missedQuery = useAutomationMissed(automations.map((item) => item.id))
  const missedById = missedQuery.data ?? {}

  useEffect(() => {
    if (!hasIde()) return
    const stop = getIde().automations.onChanged(() => {
      void queryClient.invalidateQueries({ queryKey: ["automations"] })
      void refreshAllWorkspaces()
    })
    return () => {
      stop()
    }
  }, [queryClient])

  async function persist(next: AutomationDraft) {
    if (!hasIde() || !next.name.trim()) return
    setSaving(true)
    try {
      const saved = (await getIde().automations.upsert(draftToUpsert(next))) as Automation
      setDraft(draftFromAutomation(saved, defaults))
      await automationsQuery.refetch()
    } finally {
      setSaving(false)
    }
  }

  async function toggleEnabled(item: Automation, enabled: boolean) {
    if (!hasIde()) return
    await getIde().automations.upsert(draftToUpsert({ ...draftFromAutomation(item, defaults), enabled }))
    await automationsQuery.refetch()
  }

  async function runDraft() {
    if (!hasIde() || !draft?.id) return
    setRunningId(draft.id)
    try {
      await getIde().automations.run({ id: draft.id })
      await automationsQuery.refetch()
      void refreshAllWorkspaces()
    } finally {
      setRunningId(null)
    }
  }

  async function removeDraft() {
    if (!hasIde() || !draft?.id) return
    await getIde().automations.remove({ id: draft.id })
    setDraft(null)
    await automationsQuery.refetch()
  }

  function openFailedInbox() {
    requestInboxFilter("failed")
    void navigate({ to: "/inbox" })
  }

  const body = (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="page-automations">
      <header className="flex items-center justify-between gap-2 border-b border-separator-border px-4 py-3">
        <div>
          <h1 className="text-title-3-semibold text-text-primary">{t("studio.automations.title")}</h1>
          <p className="mt-0.5 text-caption-1-medium text-text-secondary">{t("studio.automations.desc")}</p>
        </div>
        <Button size="sm" onClick={() => setDraft(emptyAutomationDraft(defaults))}>
          {t("studio.automations.newAutomation")}
        </Button>
      </header>
      <AutomationList
        automations={automations}
        missedById={missedById}
        tools={tools}
        locale={locale}
        now={now}
        onOpen={(item) => setDraft(draftFromAutomation(item, defaults))}
        onToggle={(item, enabled) => void toggleEnabled(item, enabled)}
        onOpenFailed={openFailedInbox}
      />
      <AutomationFooter />
      <AutomationDrawer
        open={Boolean(draft)}
        draft={draft}
        tools={tools}
        saving={saving}
        running={Boolean(draft?.id && runningId === draft.id)}
        records={draft?.id ? (missedById[draft.id] ?? []) : []}
        locale={locale}
        now={now}
        onClose={() => setDraft(null)}
        onChange={(patch) => setDraft((current) => (current ? { ...current, ...patch } : current))}
        onSave={() => draft && void persist(draft)}
        onRun={() => void runDraft()}
        onRemove={() => setConfirmDelete(true)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={t("studio.automations.deleteTitle")}
        description={t("studio.automations.deleteDesc", { name: draft?.name ?? "" })}
        destructive
        onOpenChange={setConfirmDelete}
        onConfirm={() => void removeDraft()}
      />
    </div>
  )

  return body
}
