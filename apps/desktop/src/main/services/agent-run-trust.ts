/**
 * 只有 main 可写补跑闸。renderer 的 agent.run 必须剥掉这两项。
 */
import type { AutomationRunSource, RunAgentInput } from "@enjoy-agents/ipc-contract"

export type TrustedRunAgentOptions = {
  /** main 内部入口（自动化补跑 / 续跑）才为 true。 */
  trustAutomationFlags?: boolean
  /** 工作流子步 / ai.generate 不写 MRU。缺省跟前台用户开跑。 */
  rememberMru?: boolean
}

/** 工作流子步与 ai.generate：不写 MRU，也不走发送闸。 */
export const BACKGROUND_AGENT_TRUST = { rememberMru: false } as const satisfies TrustedRunAgentOptions

export function stripUntrustedAutomationFlags(input: RunAgentInput): RunAgentInput {
  if (!input.denyAnyDesktop && !input.automationSource) return input
  return { ...input, denyAnyDesktop: undefined, automationSource: undefined }
}

export function trustedAutomationFlags(
  extras?: { denyAnyDesktop?: boolean; automationSource?: unknown },
  existing?: { denyAnyDesktop?: boolean; automationSource?: AutomationRunSource }
): { denyAnyDesktop?: boolean; automationSource?: AutomationRunSource } {
  const source = extras?.automationSource ?? existing?.automationSource
  return {
    denyAnyDesktop: extras?.denyAnyDesktop === true || existing?.denyAnyDesktop === true ? true : undefined,
    automationSource: isAutomationSource(source) ? source : undefined
  }
}

function isAutomationSource(value: unknown): value is AutomationRunSource {
  if (!value || typeof value !== "object") return false
  const row = value as Record<string, unknown>
  return (
    typeof row.automationId === "string" &&
    typeof row.automationName === "string" &&
    typeof row.scheduledAt === "number" &&
    typeof row.isCatchUp === "boolean"
  )
}
