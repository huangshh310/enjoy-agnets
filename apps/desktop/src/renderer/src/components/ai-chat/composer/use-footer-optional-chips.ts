/**
 * 底栏三颗可选 chip（桌面 / 更倾向桌面 / 扩展）在不在、HostInject 视图：只读组合，供选级 contentKey、
 * L3 溢出钮的状态点与 sr-only 文本用。判据与各 chip 组件一字一致；不写 store、不加 action、不改 IPC。
 */
import { useComputerUseEnabled } from "@renderer/hooks/use-computer-use-enabled"
import { useChatStore } from "@renderer/stores/chat-store"
import { usePresetDesktopBias } from "../agent-picker/preset-desktop-bias"
import { surfaceForMode } from "./composer-mode"
import { hostInjectChipLane, type HostInjectChipLane } from "./host-inject/host-inject-chip-label.ts"
import type { HostInjectBarView } from "./host-inject/host-inject-view.ts"
import { hostInjectChipShown } from "./footer-dot-tone.ts"
import { useHostInjectBar } from "./host-inject/use-host-inject-bar.ts"

export { footerDotTone, hostInjectChipShown, type FooterDotTone } from "./footer-dot-tone.ts"

export type FooterOptionalChips = {
  /** ComputerUseChip 会画（同 computer-use-chip.tsx） */
  cu: boolean
  /** PresetDesktopBiasPill 会画（同 preset-desktop-bias-pill.tsx） */
  pb: boolean
  /** HostInjectBar 会画（同 host-inject-bar.tsx：非 hidden 且有 lane） */
  hi: boolean
  hostView: HostInjectBarView
  hostLane: HostInjectChipLane | null
  enabledMcp: number
  enabledSkills: number
}

export function useFooterOptionalChips(): FooterOptionalChips {
  const mode = useChatStore((state) => state.mode)
  const computerUse = useComputerUseEnabled()
  const pb = usePresetDesktopBias()
  const { view, enabledMcp, enabledSkills } = useHostInjectBar()
  const cu = computerUse && surfaceForMode(mode) === "execute"
  const hi = hostInjectChipShown(view, enabledMcp, enabledSkills)
  return {
    cu,
    pb,
    hi,
    hostView: view,
    hostLane: view.kind === "hidden" ? null : hostInjectChipLane(enabledMcp, enabledSkills),
    enabledMcp,
    enabledSkills
  }
}
