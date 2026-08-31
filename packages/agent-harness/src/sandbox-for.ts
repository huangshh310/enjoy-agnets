/**
 * 按适配器选沙箱：桥接适配器要 Vercel（有端口），Pi 默认本机 just-bash。
 */
import { createJustBashSandbox } from "@ai-sdk/sandbox-just-bash"
import { createVercelSandbox } from "@ai-sdk/sandbox-vercel"
import type { HarnessAdapter } from "./catalog.ts"
import type { CreateHarnessCodingAgentInput } from "./types.ts"

/** 工作区文本同步进沙箱 session。 */
export async function syncWorkspaceIntoSession(
  workspaceRoot: string | undefined,
  session: { writeTextFile: (file: { path: string; content: string }) => PromiseLike<void> },
  sessionWorkDir: string
) {
  if (!workspaceRoot) return
  const { collectWorkspaceTexts } = await import("./sync-workspace")
  const files = await collectWorkspaceTexts(workspaceRoot)
  for (const file of files) {
    await session.writeTextFile({
      path: `${sessionWorkDir}/${file.path}`,
      content: file.content
    })
  }
}

export function sandboxConfigFor(workspaceRoot?: string) {
  if (!workspaceRoot) return {}
  return {
    sandboxConfig: {
      workDir: "workspace",
      onSession: async (opts: {
        session: { writeTextFile: (file: { path: string; content: string }) => PromiseLike<void> }
        sessionWorkDir: string
      }) => {
        await syncWorkspaceIntoSession(workspaceRoot, opts.session, opts.sessionWorkDir)
      }
    }
  }
}

export function createAdapterSandbox(
  adapter: HarnessAdapter,
  input: CreateHarnessCodingAgentInput
) {
  if (adapter.sandboxKind === "just-bash") {
    return createJustBashSandbox({
      cwd: input.workspaceRoot ?? "/work"
    })
  }
  if (adapter.sandboxKind !== "vercel") {
    throw new Error(`Adapter '${adapter.id}' has no sandbox provider.`)
  }
  const token = input.credentials.vercelToken?.trim()
  if (!token) {
    throw new Error(`${adapter.label} still needs a Vercel Sandbox token in Settings → Agent.`)
  }
  return createVercelSandbox({
    runtime: "node24",
    ports: [4000],
    token,
    teamId: input.credentials.vercelTeamId,
    projectId: input.credentials.vercelProjectId
  })
}
