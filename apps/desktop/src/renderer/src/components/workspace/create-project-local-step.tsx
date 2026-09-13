/**
 * 创建项目第二步（本地）：选本机文件夹后才 open。
 */
import { RiCheckLine, RiFolderAddLine, RiLoader4Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"

export function CreateProjectLocalStep({
  projectName,
  selectedPath,
  loading,
  onNameChange,
  onPickFolder,
  onBack,
  onCancel,
  onCreate
}: {
  projectName: string
  selectedPath: string
  loading: boolean
  onNameChange: (value: string) => void
  onPickFolder: () => void
  onBack: () => void
  onCancel: () => void
  onCreate: () => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-name" className="text-caption-1-medium font-semibold text-text-secondary">
          {t("pages.workspaces.createProject.nameLabel")}
        </Label>
        <Input
          id="project-name"
          value={projectName}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={t("pages.workspaces.createProject.namePlaceholder")}
          className="rounded-xl"
        />
      </div>
      <FolderPickerBox selectedPath={selectedPath} onPick={onPickFolder} />
      <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-4">
        <Button variant="outline" size="sm" onClick={onBack}>{t("pages.workspaces.createProject.back")}</Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>{t("pages.workspaces.createProject.cancel")}</Button>
          <Button size="sm" disabled={loading || !selectedPath} onClick={onCreate} className="gap-1.5 shadow-xs">
            {loading ? <RiLoader4Line className="size-3.5 animate-spin" /> : null}
            <span>{t("pages.workspaces.createProject.create")}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

function FolderPickerBox({ selectedPath, onPick }: { selectedPath: string; onPick: () => void }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-caption-1-medium font-semibold text-text-secondary">
        {t("pages.workspaces.createProject.folderLabel")}
      </Label>
      <button
        type="button"
        onClick={onPick}
        className={cx(
          "flex min-h-[108px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 text-center transition-all cursor-pointer",
          selectedPath
            ? "border-accent-500/40 bg-accent-500/[0.03] text-text-primary"
            : "border-border-button-default bg-background-secondary-default/40 hover:border-accent-500/30 hover:bg-background-secondary-hover"
        )}
      >
        {selectedPath ? (
          <>
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
              <RiCheckLine className="size-5 text-accent-500" />
            </div>
            <p className="text-caption-1-medium font-semibold text-text-primary">{t("pages.workspaces.createProject.folderPicked")}</p>
            <p className="max-w-[340px] truncate font-mono text-caption-2-medium text-text-tertiary">{selectedPath}</p>
            <span className="text-caption-2-medium text-accent-600 hover:underline">{t("pages.workspaces.createProject.changeFolder")}</span>
          </>
        ) : (
          <>
            <div className="flex size-9 items-center justify-center rounded-xl border border-border-button-default bg-background-primary-default text-text-secondary shadow-xs">
              <RiFolderAddLine className="size-5 text-foreground-icon-secondary" />
            </div>
            <p className="text-caption-1-medium font-medium text-text-secondary">{t("pages.workspaces.createProject.folderHint")}</p>
            <span className="text-caption-2-medium text-accent-600">{t("pages.workspaces.createProject.browseHint")}</span>
          </>
        )}
      </button>
    </div>
  )
}
