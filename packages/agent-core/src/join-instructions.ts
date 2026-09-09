/**
 * 把可选尾巴接到系统提示后面。空串当没有。
 */

/** 有 extra 时用空行隔开；没有则原样返回 base。 */
export function joinInstructions(base: string, extra?: string): string {
  const tail = extra?.trim()
  return tail ? `${base}\n\n${tail}` : base
}
