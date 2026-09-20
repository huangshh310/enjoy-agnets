/**
 * Picker 选中引擎行：人话名 +「重命名」。悬停仍见引擎真名。
 */
import { EngineRenameAction } from "./engine-rename-action"
import { useEngineFace } from "@renderer/hooks/use-engine-display-name"

export function EnginePickerRenameRow({
  runtimeId,
  brandLabel
}: {
  runtimeId: string
  brandLabel: string
}) {
  const { face, trueNameTitle } = useEngineFace(runtimeId, brandLabel)
  return (
    <div className="flex items-center justify-between gap-2 border-b border-separator-border px-3 py-1.5">
      <p className="min-w-0 truncate text-caption-2-medium text-text-secondary" title={trueNameTitle}>
        {face}
      </p>
      <EngineRenameAction runtimeId={runtimeId} />
    </div>
  )
}
