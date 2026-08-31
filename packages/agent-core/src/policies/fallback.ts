/**
 * 主模型失败后按顺序切备用。认证失败不 fallback。
 */
import { classifyError, type RuntimeError } from "../runtime/errors.ts"

export async function withModelFallback<T>(
  models: string[],
  run: (modelId: string) => Promise<T>
): Promise<{ result: T; modelId: string }> {
  if (models.length === 0) throw new Error("No fallback models configured.")
  let lastError: RuntimeError | undefined
  for (const modelId of models) {
    try {
      return { result: await run(modelId), modelId }
    } catch (error) {
      const classified = classifyError(error)
      lastError = classified
      if (classified.errorClass === "auth" || classified.errorClass === "capability") {
        throw classified
      }
    }
  }
  throw lastError ?? new Error("All fallback models failed.")
}
