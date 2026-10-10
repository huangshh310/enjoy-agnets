/** Esc 关 Environment；本会话查找开着时先让查找吃掉。 */
export function shouldDismissEnvironment(input: {
  key: string
  defaultPrevented: boolean
  findOpen?: boolean
}): boolean {
  if (input.key !== "Escape") return false
  if (input.defaultPrevented) return false
  if (input.findOpen) return false
  return true
}
