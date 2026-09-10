/**
 * 编辑已添加的自定义 ACP：右侧抽屉，删除需确认。
 */
import { RiCloseLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useState } from "react"
import { SettingsSideDrawer } from "../settings-side-drawer"
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
  const close = () => onOpenChange(false)
  return (
    <>
      <SettingsSideDrawer
        open={open}
        onClose={close}
        labelledBy="custom-acp-editor-title"
        closeLabel={t("common.close")}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-separator-border/60 px-6 py-4">
          <h3 id="custom-acp-editor-title" className="text-title-3-semibold text-text-primary">
            {t("settings.registry.editCustom")}
          </h3>
          <Button type="button" size="sm" variant="ghost" onClick={close} className="size-8 p-0">
            <RiCloseLine className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <CustomAcpAgentForm
            initialId={id}
            onSaved={() => {
              onChanged()
              close()
            }}
            onCancel={close}
          />
          {id ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="mt-3 self-start text-caption-2-medium text-text-error-primary"
            >
              {t("settings.registry.deleteCustom")}
            </button>
          ) : null}
        </div>
      </SettingsSideDrawer>
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
