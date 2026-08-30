import type { AgentRuntimeContext, AgentWorkspaceHost } from "../runtime-context";

type ToolExecuteOptions = {
  experimental_context?: unknown;
  runtimeContext?: unknown;
};

export function workspaceHostFrom(options: ToolExecuteOptions): AgentWorkspaceHost {
  const context = (options.runtimeContext ?? options.experimental_context) as
    | AgentRuntimeContext
    | undefined;
  if (!context?.host) {
    throw new Error("Workspace host is missing from agent runtime context.");
  }
  return context.host;
}
