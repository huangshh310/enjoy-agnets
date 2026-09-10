/**
 * 「按此执行」注入 hidden/system 的计划正文，不进用户气泡。
 */
export const IMPLEMENTATION_PLAN_HINT =
  "The user confirmed Execute plan. Follow the approved plan. Do not paste the whole plan back as a user message."

const PLAN_BUDGET = 8_000

export function formatExecutePlanInstructions(planText: string | null | undefined): string {
  const body = planText?.trim() ?? ""
  if (!body) {
    return `# Approved implementation plan\n${IMPLEMENTATION_PLAN_HINT}\nRead implementation_plan.md at the workspace root first.`
  }
  const clipped = body.length > PLAN_BUDGET ? `${body.slice(0, PLAN_BUDGET)}\n...[truncated]` : body
  return [
    "# Approved implementation plan",
    IMPLEMENTATION_PLAN_HINT,
    "The same text is on disk as implementation_plan.md.",
    "",
    clipped
  ].join("\n")
}
