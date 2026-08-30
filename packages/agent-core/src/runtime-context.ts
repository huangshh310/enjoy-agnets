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
  gitCommit: (message: string) => Promise<string>;
};

export type AgentRuntimeContext = {
  workspaceRoot: string;
  sessionId: string;
  runId: string;
  host: AgentWorkspaceHost;
};
