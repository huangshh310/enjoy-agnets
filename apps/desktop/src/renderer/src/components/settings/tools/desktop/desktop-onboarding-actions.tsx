/**
 * 开通动作：检测权限 / 测试屏幕感知 / 试一下·计算器。
 * 试一下只预填执行态，不自动开跑。
 * 测试屏幕感知呼出 Midscene.js 风格视觉回显面板。
 */
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import {
  DesktopPerceptionInspector,
  type DesktopView
} from "./desktop-perception-inspector"

export function DesktopOnboardingActions({
  checking,
  capturing,
  inspectorOpen,
  preview,
  view,
  onCheck,
  onInspect,
  onCloseInspector,
  onTryCalculator
}: {
  checking: boolean
  capturing: boolean
  inspectorOpen: boolean
  preview: string
  view?: DesktopView | null
  onCheck: () => void
  onInspect: () => void
  onCloseInspector: () => void
  onTryCalculator: () => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-caption-1-medium" onClick={onCheck} disabled={checking}>
          {t("settings.builtinTools.checkPermissions")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-lg px-3 text-caption-1-medium"
          onClick={onInspect}
          disabled={capturing}
        >
          {t("settings.builtinTools.perceptionInspect")}
        </Button>
        <Button size="sm" className="h-8 rounded-lg px-3 text-caption-1-semibold" onClick={onTryCalculator}>
          {t("settings.builtinTools.tryCalculator")}
        </Button>
      </div>

      <DesktopPerceptionInspector
        open={inspectorOpen}
        onClose={onCloseInspector}
        onRecapture={onInspect}
        capturing={capturing}
        thumbnailDataUrl={preview}
        view={view}
      />
    </div>
  )
}
