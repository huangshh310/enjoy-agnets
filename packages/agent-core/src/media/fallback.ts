/**
 * 媒体第二路径：主模型失败后换备用模型，不把错误吞成空结果。
 */
export async function withMediaFallback<T>(
  primary: () => Promise<T>,
  secondary: () => Promise<T>
): Promise<{ value: T; usedFallback: boolean }> {
  try {
    return { value: await primary(), usedFallback: false }
  } catch (error) {
    try {
      return { value: await secondary(), usedFallback: true }
    } catch {
      throw error
    }
  }
}
