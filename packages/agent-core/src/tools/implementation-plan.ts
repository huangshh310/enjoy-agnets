/**
 * Plan 模式的落盘产物：固定工作区相对路径，不让模型自选路径。
 */

export const IMPLEMENTATION_PLAN_PATH = "implementation_plan.md"

/** 把 submit_plan 入参收成 Markdown。files 只接受相对路径名，丢掉逃逸段。 */
export function formatImplementationPlan(plan: string, files?: readonly string[]): string {
  const body = plan.trim()
  const listed = (files ?? []).map(sanitizePlanFile).filter(Boolean)
  const fileBlock =
    listed.length > 0 ? `\n\n## Files\n\n${listed.map((path) => `- ${path}`).join("\n")}\n` : "\n"
  return `# Implementation plan\n\n${body}${fileBlock}`
}

export async function persistImplementationPlan(
  writeFile: (path: string, content: string) => Promise<void>,
  plan: string,
  files?: readonly string[]
): Promise<{ path: string; writeError?: string }> {
  const path = IMPLEMENTATION_PLAN_PATH
  try {
    await writeFile(path, formatImplementationPlan(plan, files))
    return { path }
  } catch (error) {
    return { path, writeError: error instanceof Error ? error.message : String(error) }
  }
}

function sanitizePlanFile(path: string): string {
  const normalized = path.replace(/\\/g, "/").trim()
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) return ""
  return normalized
}
