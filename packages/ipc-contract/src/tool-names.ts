/**
 * 内置工具名的唯一来源：main 的审批策略集合与 renderer 的显示分类共用这份名册。
 * 叶子文件，零 import —— agent-core / harness 的 node:test 要能直接 value-import 它。
 * 名字改动会同时影响审批集合与思考树显示，改前先跑 `pnpm test`。
 */

export const TOOL_NAMES = {
  readFile: "read_file",
  listDir: "list_dir",
  glob: "glob",
  grep: "grep",
  repoOutline: "repo_outline",
  skill: "skill",
  todoWrite: "todo_write",
  askUserQuestions: "ask_user_questions",
  submitPlan: "submit_plan",
  editFile: "edit_file",
  writeFile: "write_file",
  bash: "bash",
  codeMode: "code_mode",
  gitStatus: "git_status",
  gitDiff: "git_diff",
  gitLog: "git_log",
  gitCommit: "git_commit",
  gitBranch: "git_branch",
  gitPush: "git_push",
  delegate: "delegate",
  browserNavigate: "browser_navigate",
  browserExtractContent: "browser_extract_content",
  desktopDoctor: "desktop_doctor",
  desktopListApps: "desktop_list_apps",
  desktopSnapshot: "desktop_snapshot",
  desktopScreenshot: "desktop_screenshot",
  desktopAct: "desktop_act"
} as const

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES]

export const ASK_USER_QUESTIONS_TOOL: ToolName = TOOL_NAMES.askUserQuestions

/**
 * 本机写盘工具名 + Claude Code 内置别名（`write` / `edit`），Files 开关同时管两边。
 * 含 `code_mode`：它先写脚本再执行，写盘与 shell 两道审批都要走，所以有意同属两个集合。
 */
export const WRITE_TOOLS: readonly string[] = [
  TOOL_NAMES.editFile,
  TOOL_NAMES.writeFile,
  "write",
  "edit",
  TOOL_NAMES.codeMode
]

/** shell 类。 */
export const BASH_TOOLS: readonly string[] = [TOOL_NAMES.bash, TOOL_NAMES.codeMode]

/** Git 写操作，走同一档 Git 审批。 */
export const COMMIT_TOOLS: readonly string[] = [
  TOOL_NAMES.gitCommit,
  TOOL_NAMES.gitPush,
  TOOL_NAMES.gitBranch
]

/** 桌面 / 浏览器控制：默认停车，不跟 Edits 写盘档走。 */
export const HOST_CONTROL_TOOLS: readonly string[] = [
  TOOL_NAMES.browserNavigate,
  TOOL_NAMES.desktopAct
]

/** 探索态要宿主拦截的全集。 */
export const MUTATING_TOOLS: readonly string[] = [
  ...WRITE_TOOLS,
  ...BASH_TOOLS,
  ...COMMIT_TOOLS,
  ...HOST_CONTROL_TOOLS
]

/**
 * 收工判定唯一只读白名单。未知 MCP / ACP 弱名默认当可能改盘。
 * `delegate` 本身不改盘，子工具已折进同一份 `run.tools`。
 */
const READ_ONLY_TYPE_LEAVES = new Set([
  "read_file",
  "read",
  "list_dir",
  "list",
  "desktop_list_apps",
  "glob",
  "grep",
  "repo_outline",
  "outline",
  "git_status",
  "git_diff",
  "git_log",
  "desktop_snapshot",
  "snapshot",
  "desktop_screenshot",
  "screenshot",
  "browser_extract_content",
  "extract",
  "todo_write",
  "todo",
  "update_todos",
  "ask_user_questions",
  "ask",
  "submit_plan",
  "plan",
  "delegate",
  "task",
  "subagent"
])

/** MCP `mcp_server__leaf` 与 ACP 弱名都取叶子。 */
export function toolNameLeaf(name: string): string {
  const trimmed = name.trim()
  const sep = trimmed.indexOf("__")
  return sep >= 0 ? trimmed.slice(sep + 2) : trimmed
}

/**
 * 写类：不在只读白名单里的都算可能改盘。
 * 未知 MCP（`move_file` / `rename` / `apply_diff` / `git_merge` / `set_config` / `run_script`）
 * 与 ACP `kind:"move"` 映射名都走这里，禁止再靠写名单 + 正则漏掉。
 */
export function isWriteTypeToolName(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  const leaf = toolNameLeaf(trimmed)
  const normalized = leaf.toLowerCase().replace(/[\s-]/g, "_")
  return !READ_ONLY_TYPE_LEAVES.has(normalized)
}
