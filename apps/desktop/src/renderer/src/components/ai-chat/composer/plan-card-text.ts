/**
 * 从 submit_plan 正文取出标题和最多四行摘要。
 */

export type PlanCardText = {
  title: string
  preview: string[]
  rest: string
}

export function planCardFromText(plan: string): PlanCardText {
  const lines = plan.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const heading = lines.find((line) => /^#{1,6}\s+/.test(line))
  const title = (heading ? heading.replace(/^#{1,6}\s+/, "") : lines[0] ?? "").trim()
  const body = heading ? lines.filter((line) => line !== heading) : lines.slice(1)
  return {
    title,
    preview: body.slice(0, 4),
    rest: body.slice(4).join("\n")
  }
}

export function planTextFromResult(result: unknown): string | null {
  if (!result || typeof result !== "object") return null
  const plan = (result as { plan?: unknown }).plan
  return typeof plan === "string" && plan.trim() ? plan : null
}

export function latestPlanLocation(
  messages: ReadonlyArray<{ id: string; tools?: ReadonlyArray<{ name: string; result?: unknown }> }>
): { messageId: string; plan: string } | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (!message) continue
    const submitted = [...(message.tools ?? [])].reverse().find((tool) => tool.name === "submit_plan")
    const plan = planTextFromResult(submitted?.result)
    if (plan) return { messageId: message.id, plan }
  }
  return null
}
