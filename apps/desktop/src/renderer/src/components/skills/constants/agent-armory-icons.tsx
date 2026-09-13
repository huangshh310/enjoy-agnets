/**
 * Agent 整备舱各目标品牌图标适配组件。
 * 遵循 Enjoy Agents 规范：官方品牌使用 Lobe Icons 与 AppMark。
 */
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import type { SkillTargetId } from "@enjoy-agents/ipc-contract"

export function TargetArmoryIcon({
  targetId,
  className
}: {
  targetId: SkillTargetId | string
  className?: string
}) {
  return <AgentBrandIcon id={targetId} className={className} />
}

export const PiTargetIcon = ({ className }: { className?: string }) => (
  <AgentBrandIcon id="pi" className={className} />
)
export const ClaudeTargetIcon = ({ className }: { className?: string }) => (
  <AgentBrandIcon id="claude" className={className} />
)
export const CursorTargetIcon = ({ className }: { className?: string }) => (
  <AgentBrandIcon id="cursor" className={className} />
)
export const CodexTargetIcon = ({ className }: { className?: string }) => (
  <AgentBrandIcon id="codex" className={className} />
)
export const EnjoyTargetIcon = ({ className }: { className?: string }) => (
  <AgentBrandIcon id="enjoy-agents" className={className} />
)
export const OmpTargetIcon = ({ className }: { className?: string }) => (
  <AgentBrandIcon id="omp" className={className} />
)
export const GrokTargetIcon = ({ className }: { className?: string }) => (
  <AgentBrandIcon id="grok" className={className} />
)
export const AntigravityTargetIcon = ({ className }: { className?: string }) => (
  <AgentBrandIcon id="antigravity" className={className} />
)
export const GeminiTargetIcon = ({ className }: { className?: string }) => (
  <AgentBrandIcon id="gemini" className={className} />
)
export const OpenCodeTargetIcon = ({ className }: { className?: string }) => (
  <AgentBrandIcon id="opencode" className={className} />
)
export const HermesTargetIcon = ({ className }: { className?: string }) => (
  <AgentBrandIcon id="hermes" className={className} />
)
export const AmpTargetIcon = ({ className }: { className?: string }) => (
  <AgentBrandIcon id="amp" className={className} />
)
export const DeepSeekTargetIcon = ({ className }: { className?: string }) => (
  <AgentBrandIcon id="deepseek" className={className} />
)

export function createDynamicTargetIcon(targetId: string) {
  return function DynamicTargetIcon({ className }: { className?: string }) {
    return <AgentBrandIcon id={targetId} className={className} />
  }
}
