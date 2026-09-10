import type { AskUserAnswers } from "@enjoy-agents/ipc-contract"

export type AgentWorkspaceHost = {
  readFile: (relativePath: string) => Promise<string>;
  writeFile: (relativePath: string, content: string) => Promise<void>;
  editFile: (relativePath: string, oldText: string, newText: string) => Promise<string>;
  listDir: (relativePath: string) => Promise<Array<{ name: string; kind: "file" | "directory" }>>;
  glob: (pattern: string) => Promise<string[]>;
  grep: (pattern: string, glob?: string) => Promise<Array<{ path: string; line: number; text: string }>>;
  bash: (command: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  gitStatus: () => Promise<string>;
  gitDiff: (path?: string) => Promise<string>;
  /** 线性 git log，不是拓扑图。limit 默认 20、上限 100。 */
  gitLog: (options?: { limit?: number; path?: string }) => Promise<string>;
  gitCommit: (message: string) => Promise<string>;
  gitPush: () => Promise<string>;
  /** 审批放行后取出 ask_user_questions 的答案。 */
  takeQuestionAnswers?: () => AskUserAnswers | undefined;
};

export type AgentRuntimeContext = {
  workspaceRoot: string;
  sessionId: string;
  runId: string;
  host: AgentWorkspaceHost;
};
