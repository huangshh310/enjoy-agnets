/**
 * 编辑已添加的自定义 ACP：BoardUI Dialog，删除需确认。
 */
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useState } from "react"
import { CustomAcpAgentForm } from "./custom-acp-agent-form"

export function CustomAcpAgentDialog({
  id,
  open,
  onOpenChange,
  onChanged
}: {
  id?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}) {
  const t = useT()
  const [confirmDelete, setConfirmDelete] = useState(false)
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[85vh] max-w-xl flex-col overflow-y-auto rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-dialog outline-none"
        >
          <h3 className="text-body-medium font-semibold text-text-primary">{t("settings.registry.editCustom")}</h3>
          <div className="mt-3">
            <CustomAcpAgentForm
              initialId={id}
              onSaved={() => {
                onChanged()
                onOpenChange(false)
              }}
              onCancel={() => onOpenChange(false)}
            />
          </div>
          {id ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="mt-3 self-start text-caption-2-medium text-text-error-primary"
            >
              {t("settings.registry.deleteCustom")}
            </button>
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        title={t("settings.registry.deleteTitle")}
        description={t("settings.registry.deleteDesc")}
        confirmLabel={t("settings.registry.deleteCustom")}
        destructive
        onOpenChange={setConfirmDelete}
        onConfirm={() => void removeCustom(id, onChanged, onOpenChange)}
      />
    </>
  )
}

async function removeCustom(id: string | undefined, onChanged: () => void, onOpenChange: (open: boolean) => void) {
  if (!id || !hasIde()) return
  await getIde().agentTools.removeCustom({ id })
  onChanged()
  onOpenChange(false)
}
