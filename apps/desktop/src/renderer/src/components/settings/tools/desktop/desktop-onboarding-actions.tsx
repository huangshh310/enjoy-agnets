/**
 * 开通动作：检测权限 / 拍一张屏 / 试一下·计算器。试一下只预填执行态，不自动开跑。
 */
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"

export function DesktopOnboardingActions({
  checking,
  capturing,
  preview,
  onCheck,
  onCapture,
  onTryCalculator
}: {
  checking: boolean
  capturing: boolean
  preview: string
  onCheck: () => void
  onCapture: () => void
  onTryCalculator: () => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-caption-1-medium" onClick={onCheck} disabled={checking}>
          {t("settings.builtinTools.checkPermissions")}
        </Button>
        <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-caption-1-medium" onClick={onCapture} disabled={capturing}>
          {t("settings.builtinTools.captureScreen")}
        </Button>
        <Button size="sm" className="h-8 rounded-lg px-3 text-caption-1-semibold" onClick={onTryCalculator}>
          {t("settings.builtinTools.tryCalculator")}
        </Button>
      </div>
      {preview ? (
        <img src={preview} alt="" className="max-h-28 w-40 rounded-lg border border-border-button-default object-cover" />
      ) : null}
    </div>
  )
}
