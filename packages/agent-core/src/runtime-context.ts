import type { AskUserAnswers } from "@enjoy-agents/ipc-contract"
import type { SessionHeartbeatRequest } from "./tools/session-heartbeat-name"

export type AgentWorkspaceHost = {
  readFile: (relativePath: string) => Promise<string>;
  writeFile: (relativePath: string, content: string) => Promise<void>;
  editFile: (relativePath: string, oldText: string, newText: string) => Promise<string>;
  listDir: (
    relativePath: string,
    options?: { touch?: boolean }
  ) => Promise<Array<{ name: string; kind: "file" | "directory" }>>;
  glob: (pattern: string) => Promise<string[]>;
  grep: (pattern: string, glob?: string) => Promise<Array<{ path: string; line: number; text: string }>>;
  bash: (command: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  gitStatus: () => Promise<string>;
  gitDiff: (path?: string) => Promise<string>;
  /** 线性 git log，不是拓扑图。limit 默认 20、上限 100。 */
  gitLog: (options?: { limit?: number; path?: string }) => Promise<string>;
  gitCommit: (message: string, options?: { stageAll?: boolean }) => Promise<string>;
  gitPush: () => Promise<string>;
  /** 创建分支；checkout 为真才切换。走 Git 审批。 */
  gitBranch?: (name: string, checkout?: boolean) => Promise<string>;
  /** 审批放行后取出 ask_user_questions 的答案。 */
  takeQuestionAnswers?: () => AskUserAnswers | undefined;
};

export type SaveSessionHeartbeat = (
  input: SessionHeartbeatRequest
) => Promise<{ ok: true; cronExpr: string } | { ok: false; error: string }>;

export type AgentRuntimeContext = {
  workspaceRoot: string;
  sessionId: string;
  runId: string;
  host: AgentWorkspaceHost;
  /** 本机心跳，不经过工作区文件。ACP 不提供。 */
  setSessionHeartbeat?: SaveSessionHeartbeat;
};
