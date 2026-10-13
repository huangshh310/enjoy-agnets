/**
 * luna P3：收件箱不露原始工具名 / ses_ id，换成给人看的短句。
 */
import { TOOL_NAMES } from "@enjoy-agents/ipc-contract/tool-names"

type Translate = (key: string) => string

const EDIT_TOOLS = new Set<string>([TOOL_NAMES.editFile, TOOL_NAMES.writeFile, "write", "edit"])
const COMMAND_TOOLS = new Set<string>([TOOL_NAMES.bash])

export function inboxToolPhraseKey(name: string | null | undefined): string {
  const tool = (name ?? "").trim()
  if (tool === TOOL_NAMES.codeMode) return "pages.inbox.toolPhraseRunCode"
  if (COMMAND_TOOLS.has(tool)) return "pages.inbox.toolPhraseRunCommand"
  if (EDIT_TOOLS.has(tool)) return "pages.inbox.toolPhraseEditFiles"
  return "pages.inbox.toolPhraseConfirm"
}

export function inboxToolPhrase(name: string | null | undefined, t: Translate): string {
  return t(inboxToolPhraseKey(name))
}

/** 执行过的多个工具：只列认得的（命令 / 改文件 / 代码），去重用「、」连；一个都不认得给 null（不露原名）。 */
export function inboxToolsPhrase(names: readonly string[], t: Translate): string | null {
  const keys = names.map(inboxToolPhraseKey).filter((key) => key !== "pages.inbox.toolPhraseConfirm")
  const phrases = Array.from(new Set(keys)).map((key) => t(key))
  return phrases.length > 0 ? phrases.join("、") : null
}

/** 会话标题为空或是内部 id（ses_…）时换成「未命名对话」。 */
export function inboxSessionTitle(title: string | null | undefined, t: Translate): string {
  const value = (title ?? "").trim()
  if (!value || /^ses_/i.test(value)) return t("pages.inbox.untitledSession")
  return value
}
