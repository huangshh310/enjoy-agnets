/**
 * 子 Agent：独立上下文，只向主 Agent 回传结构化摘要；审批策略不可绕过。
 */
export type SubagentSummary = {
  title: string
  findings: string[]
  filesTouched: string[]
}

export function summarizeSubagent(input: {
  title: string
  text: string
  filesTouched?: string[]
}): SubagentSummary {
  const findings = input.text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
  return {
    title: input.title,
    findings,
    filesTouched: input.filesTouched ?? []
  }
}
