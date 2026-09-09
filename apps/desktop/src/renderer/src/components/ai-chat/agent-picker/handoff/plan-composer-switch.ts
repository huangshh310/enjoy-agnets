/**
 * 空会话直切；有用户轮进入 handoff；未决审批默认阻切。
 */
import type { EngineSwitchPhase, EngineSwitchPlan } from "./plan-composer-switch.types.ts"

/** pending 时只留确认坞，禁止再叠 390px Picker。 */
export function canOpenAgentPicker(phase: EngineSwitchPhase): boolean {
  return phase === "idle"
}

export function sessionHasUserTurns(messages: Array<{ role: string }>): boolean {
  return messages.some((message) => message.role === "user")
}

export function planComposerSwitch(input: {
  from: string
  to: string
  hasUserTurns: boolean
  hasPendingApproval: boolean
}): EngineSwitchPlan {
  if (!input.to || input.to === input.from) return { kind: "noop" }
  if (input.hasPendingApproval) {
    return { kind: "blocked_by_approval", from: input.from, to: input.to }
  }
  if (!input.hasUserTurns) return { kind: "apply", to: input.to }
  return { kind: "handoff", from: input.from, to: input.to }
}
