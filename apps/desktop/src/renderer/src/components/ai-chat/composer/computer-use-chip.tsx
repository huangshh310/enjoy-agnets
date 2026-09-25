/**
 * Composer 瘦身铬：执行态且电脑操控开启时画一枚「桌面」可用性芯片。
 * 提及偏置芯片在输入下方，见 ComposerDesktopBiasBar；本枚不是第二引擎条。
 */
import { useComputerUseEnabled } from "@renderer/hooks/use-computer-use-enabled"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { surfaceForMode } from "./composer-mode"

export function ComputerUseChip() {
  const t = useT()
  const mode = useChatStore((state) => state.mode)
  const enabled = useComputerUseEnabled()
  if (!enabled || surfaceForMode(mode) !== "execute") return null
  return (
    <span
      data-testid="computer-use-chip"
      className="inline-flex h-6 items-center rounded-full bg-accent-500/10 px-2 text-caption-2-semibold text-accent-600 ring-1 ring-accent-500/25"
    >
      {t("chat.desktopChip")}
    </span>
  )
}
