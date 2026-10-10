/**
 * 工具显示名唯一入口：线程 / Inbox / 审批共用。开发者档才露裸 id。
 */
import { TOOL_NAMES } from "@enjoy-agents/ipc-contract/tool-names"
import type { TranslateFn } from "../i18n/use-i18n.ts"
import { isDevCopyEnabled } from "./dev-copy.ts"

const TOOL_LABEL_KEY: Record<string, string> = {
  [TOOL_NAMES.writeFile]: "chat.toolName.writeFile",
  write: "chat.toolName.writeFile",
  [TOOL_NAMES.editFile]: "chat.toolName.editFile",
  edit: "chat.toolName.editFile",
  [TOOL_NAMES.readFile]: "chat.toolName.readFile",
  read: "chat.toolName.readFile",
  [TOOL_NAMES.bash]: "chat.toolName.bash",
  [TOOL_NAMES.listDir]: "chat.toolName.listDir",
  [TOOL_NAMES.glob]: "chat.toolName.glob",
  [TOOL_NAMES.grep]: "chat.toolName.grep",
  [TOOL_NAMES.gitCommit]: "chat.toolName.gitCommit",
  [TOOL_NAMES.gitDiff]: "chat.toolName.gitDiff",
  [TOOL_NAMES.gitStatus]: "chat.toolName.gitStatus",
  [TOOL_NAMES.gitLog]: "chat.toolName.gitLog",
  [TOOL_NAMES.gitPush]: "chat.toolName.gitPush",
  [TOOL_NAMES.todoWrite]: "chat.toolName.todoWrite"
}

export function toolDisplayName(name: string, t: TranslateFn): string {
  if (isDevCopyEnabled()) return name.replaceAll("_", " ")
  const key = TOOL_LABEL_KEY[name]
  return key ? t(key) : name.replaceAll("_", " ")
}
