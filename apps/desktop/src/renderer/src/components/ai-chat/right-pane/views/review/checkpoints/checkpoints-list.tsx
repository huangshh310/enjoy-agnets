/**
 * Review「检查点」列表：时间、短 sha、还原到此步。必须 ConfirmDialog。
 */
import { useState } from "react"
import { RiHistoryLine, RiRefreshLine } from "@remixicon/react"
import type { EnjoyCheckpointItem } from "@enjoy-agents/ipc-contract"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { useT } from "@renderer/i18n"
import { checkpointErrorMessage } from "./checkpoint-error"

export function CheckpointsList(props: {
  items: EnjoyCheckpointItem[]
  isRefreshing?: boolean
  error?: string | null
  onRefresh?: () => void
  onRestore: (ref: string) => Promise<string | null>
}) {
  const { items, isRefreshing, error, onRefresh, onRestore } = props
  const t = useT()
  const [pending, setPending] = useState<EnjoyCheckpointItem | null>(null)
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const shownError = localError ?? error

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background-primary-default">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-separator-border px-3.5 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-title-3-semibold text-text-primary">
            {t("chat.reviewCheckpointsTitle")}
          </h2>
          <p className="mt-0.5 truncate text-caption-2-regular text-text-tertiary">
            {t("chat.reviewCheckpointsHint")}
          </p>
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title={t("chat.reviewRefreshHistory")}
            className="cursor-pointer rounded-md p-1.5 text-text-tertiary transition-colors hover:bg-background-secondary-hover hover:text-text-primary"
          >
            <RiRefreshLine className={`size-4 ${isRefreshing ? "animate-spin text-accent-500" : ""}`} />
          </button>
        ) : null}
      </div>
      {shownError ? (
        <p className="shrink-0 px-3.5 py-2 text-caption-1-medium text-text-error-primary">
          {checkpointErrorMessage(shownError, t)}
        </p>
      ) : null}
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-8 text-center text-text-tertiary">
          <RiHistoryLine className="mb-1 size-8 text-accent-500 opacity-40" />
          <span className="text-caption-1-medium text-text-secondary">
            {t("chat.reviewCheckpointsEmpty")}
          </span>
          <span className="text-caption-2-regular">{t("chat.reviewCheckpointsEmptyHint")}</span>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {items.map((item) => (
            <CheckpointRow
              key={item.ref}
              item={item}
              disabled={busy}
              onRestore={() => setPending(item)}
            />
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={pending != null}
        destructive
        title={t("chat.reviewCheckpointRestoreTitle")}
        description={t("chat.reviewCheckpointRestoreDesc")}
        confirmLabel={t("chat.reviewCheckpointRestore")}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
        onConfirm={() => {
          if (!pending) return
          void runRestore(pending.ref, onRestore, setBusy, setLocalError, setPending)
        }}
      />
    </div>
  )
}

function CheckpointRow(props: {
  item: EnjoyCheckpointItem
  disabled: boolean
  onRestore: () => void
}) {
  const { item, disabled, onRestore } = props
  const t = useT()
  const shortSha = item.sha.slice(0, 7)
  return (
    <li className="flex items-center justify-between gap-3 border-b border-separator-border/30 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-caption-1-medium text-text-primary">
          {new Date(item.createdAt).toLocaleString()}
        </p>
        <p className="mt-0.5 font-mono text-caption-2-regular text-text-tertiary">{shortSha}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onRestore}
        className="shrink-0 cursor-pointer rounded-md bg-accent-500 px-2.5 py-1 text-caption-2-medium text-text-white hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("chat.reviewCheckpointRestore")}
      </button>
    </li>
  )
}

async function runRestore(
  ref: string,
  onRestore: (ref: string) => Promise<string | null>,
  setBusy: (busy: boolean) => void,
  setLocalError: (message: string | null) => void,
  setPending: (item: EnjoyCheckpointItem | null) => void
) {
  setBusy(true)
  setLocalError(null)
  const message = await onRestore(ref)
  setBusy(false)
  setPending(null)
  if (message) setLocalError(message)
}
