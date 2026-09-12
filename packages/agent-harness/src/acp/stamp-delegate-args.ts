/**
 * ACP Task/Explore 写入 args.kind / title。
 * 无 parentToolCallId 时不要在这里编造嵌套；字符串 rawInput 不得因补字段丢掉。
 */

export function stampDelegateArgs(
  rec: Record<string, unknown>,
  recInput: Record<string, unknown>,
  input: unknown
): void {
  const title = String(rec.title ?? rec.name ?? "").trim()
  const kind = String(rec.kind ?? rec.toolKind ?? "")
  if (!isAcpDelegate(kind, title)) return
  if (/^(explore|scout)\b/i.test(title) && recInput.kind == null) recInput.kind = "explore"
  keepStringInput(recInput, input)
  if (hasDelegateHeading(recInput) || !title || /^(task|delegate|subagent)$/i.test(title)) return
  recInput.title = title.replace(/^(explore|scout)\b[:\s.-]*/i, "").trim() || title
}

function isAcpDelegate(kind: string, title: string): boolean {
  return (
    /^(task|delegate|subagent)$/i.test(kind) ||
    /^(task|delegate|subagent)$/i.test(title) ||
    /^(explore|scout)\b/i.test(title)
  )
}

function keepStringInput(recInput: Record<string, unknown>, input: unknown): void {
  if (typeof input !== "string") return
  const text = input.trim()
  if (!text || looksLikeJsonObject(text) || hasDelegateHeading(recInput)) return
  recInput.prompt = text
}

function hasDelegateHeading(recInput: Record<string, unknown>): boolean {
  return [recInput.title, recInput.task, recInput.description, recInput.prompt].some(
    (value) => typeof value === "string" && value.trim()
  )
}

function looksLikeJsonObject(text: string): boolean {
  return text.startsWith("{") && text.endsWith("}")
}
