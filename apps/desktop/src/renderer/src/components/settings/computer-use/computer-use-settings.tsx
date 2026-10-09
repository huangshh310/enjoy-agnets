/**
 * 设置 → 电脑操控。开关、权限、指针、预览、蓝边和始终允许都只在这一页。
 */
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"
import { SettingsCard } from "../settings-row"
import { desktopBlock, desktopReadiness } from "../tools/desktop/desktop-readiness"
import { ComputerUseAccess } from "./computer-use-access"
import { ComputerUseGuide } from "./computer-use-guide"
import { ComputerUseOperations } from "./computer-use-operations"
import { ComputerUsePreferences } from "./computer-use-preferences"
import { ComputerUseSwitch } from "./computer-use-switch"
import { useComputerUsePage } from "./use-computer-use-page"

export function ComputerUseSettings() {
  const t = useT()
  const page = useComputerUsePage()
  const pointer = page.prefs?.computerUsePointer ?? "stock"
  const preview = page.prefs?.computerUsePreview !== false
  const size = page.prefs?.computerUsePreviewSize === "large" ? "large" : "compact"
  const report = page.doctorPhase.kind === "ready" ? page.doctorPhase.report : null
  const block = page.doctorPhase.kind === "error" ? "unavailable" : desktopBlock(report)
  const ready = desktopReadiness(page.desktop, report).ready

  return (
    <div className="flex flex-col gap-6">
      <ComputerUseSwitch
        enabled={page.desktop.enabled}
        ready={ready}
        block={block}
        onToggle={(enabled) => page.toggleTool("computerUse", enabled)}
      />
      <SettingsCard title={t("settings.computerUse.permissions")}>
        <div className="px-5 py-4">
          <ComputerUseAccess
            phase={page.doctorPhase}
            onOpen={(permission) => void getIde().builtinTools.openSystemPermission({ permission })}
          />
        </div>
      </SettingsCard>
      <ComputerUsePreferences
        pointer={pointer}
        preview={preview}
        size={size}
        visualsOn={page.desktop.screenVisuals !== false}
        canPreviewChrome={page.desktop.enabled && page.desktop.screenVisuals !== false}
        onSave={(patch) => void page.savePrefs(patch)}
        onToggleVisuals={(enabled) => page.toggleTool("screenVisuals", enabled)}
      />
      <ComputerUseOperations
        desktop={page.desktop}
        sessionId={page.sessionId}
        advancedCoords={page.prefs?.desktopAdvancedCoords === true}
        onToggleAnyDesktop={(enabled) => page.toggleTool("anyDesktopSession", enabled)}
        onToggleAdvancedCoords={(enabled) => void page.savePrefs({ desktopAdvancedCoords: enabled })}
        onRevoke={page.revoke}
        onRecheck={page.load}
      />
      <ComputerUseGuide />
      <div className="flex items-center justify-between gap-4">
        <p className="text-caption-1-medium text-text-tertiary">{t("settings.computerUse.appsnapFoot")}</p>
        <Button variant="outline" size="sm" onClick={() => void page.restore()}>
          {t("settings.computerUse.restore")}
        </Button>
      </div>
    </div>
  )
}
