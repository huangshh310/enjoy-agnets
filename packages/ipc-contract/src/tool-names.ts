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

/** 任务清单 / 问卷：名字带 write 但不是写盘。与 ledger `isTodoWriteName` 对齐。 */
const NOT_WRITE_TYPE_LEAVES = new Set(["todo_write", "todo", "update_todos", "ask_user_questions"])

/** 与 agent-core `isMcpWriteToolName` / MCP `isMutatingToolName` 同一套叶子启发式。 */
const MUTATING_LEAF = /(write|delete|create|update|remove|put|patch|insert|drop|exec|kill|send)/i
const MUTATING_SHELL_LEAF = /^(bash|shell|sh|zsh|cmd|command|run_command|run-command|terminal)$/i

/** MCP `mcp_server__leaf` 与 ACP 弱名都取叶子。 */
export function toolNameLeaf(name: string): string {
  const trimmed = name.trim()
  const sep = trimmed.indexOf("__")
  return sep >= 0 ? trimmed.slice(sep + 2) : trimmed
}

/**
 * 写类：MUTATING_TOOLS + 已有 MCP/ACP 叶子启发式。
 * 收工判定用这份，不要再维护 PATH_WRITE_TOOLS 之类的第二份名单。
 */
export function isWriteTypeToolName(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  const leaf = toolNameLeaf(trimmed)
  const normalized = leaf.toLowerCase().replace(/[\s-]/g, "_")
  if (NOT_WRITE_TYPE_LEAVES.has(normalized)) return false
  if (
    MUTATING_TOOLS.includes(trimmed) ||
    MUTATING_TOOLS.includes(leaf) ||
    MUTATING_TOOLS.includes(normalized)
  ) {
    return true
  }
  return MUTATING_LEAF.test(leaf) || MUTATING_SHELL_LEAF.test(normalized)
}
