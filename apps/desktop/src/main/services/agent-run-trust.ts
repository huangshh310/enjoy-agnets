/**
 * 只有 main 可写补跑闸与 run origin。renderer 的 agent.run 必须剥掉。
 */
import type { RunAgentInput } from "@enjoy-agents/ipc-contract"
import { inferAgentRunOrigin, type AgentRunOrigin } from "@enjoy-agents/ipc-contract/agent-run-origin"
import { AutomationRunSource } from "@enjoy-agents/ipc-contract/automations-missed"

export type TrustedRunAgentOptions = {
  /** main 内部入口（自动化补跑 / 续跑）才为 true。 */
  trustAutomationFlags?: boolean
  /** 工作流子步 / ai.generate 不写 MRU。缺省跟前台用户开跑。 */
  rememberMru?: boolean
}

/** 工作流子步与 ai.generate：不写 MRU，也不走发送闸。 */
export const BACKGROUND_AGENT_TRUST = { rememberMru: false } as const satisfies TrustedRunAgentOptions

export function stripUntrustedAutomationFlags(input: RunAgentInput): RunAgentInput {
  if (!input.denyAnyDesktop && !input.automationSource && !input.origin) return input
  return { ...input, denyAnyDesktop: undefined, automationSource: undefined, origin: undefined }
}

export function trustedAutomationFlags(
  extras?: { denyAnyDesktop?: boolean; automationSource?: unknown; origin?: unknown },
  existing?: { denyAnyDesktop?: boolean; automationSource?: AutomationRunSource; origin?: AgentRunOrigin }
): { denyAnyDesktop?: boolean; automationSource?: AutomationRunSource; origin: AgentRunOrigin } {
  const source = extras?.automationSource ?? existing?.automationSource
  const parsedSource = isAutomationSource(source) ? source : undefined
  return {
    denyAnyDesktop: extras?.denyAnyDesktop === true || existing?.denyAnyDesktop === true ? true : undefined,
    automationSource: parsedSource,
    origin: inferAgentRunOrigin(extras?.origin ?? existing?.origin, parsedSource)
  }
}

function isAutomationSource(value: unknown): value is AutomationRunSource {
  return AutomationRunSource.safeParse(value).success
}
