/**
 * L3 溢出钮状态点的纯判据（单测可直接 import）：
 * 菜单里有 chip 才有点；HostInject 黄色判据严格镜像底栏芯片（failed / unsupported），黄优先；部分跳过不亮黄。
 */
import { hostInjectChipLane } from "./host-inject/host-inject-chip-label.ts"
import { hostInjectWarns, type HostInjectBarView } from "./host-inject/host-inject-view.ts"

export type FooterDotTone = "none" | "accent" | "warn"

/** HostInjectBar 是否会画出芯片（与 host-inject-bar.tsx 的两道 return null 同判据）。 */
export function hostInjectChipShown(view: HostInjectBarView, enabledMcp: number, enabledSkills: number): boolean {
  return view.kind !== "hidden" && hostInjectChipLane(enabledMcp, enabledSkills) != null
}

export function footerDotTone(input: { cu: boolean; pb: boolean; hi: boolean; view: HostInjectBarView }): FooterDotTone {
  if (input.hi && hostInjectWarns(input.view)) return "warn"
  if (input.cu || input.pb || input.hi) return "accent"
  return "none"
}
