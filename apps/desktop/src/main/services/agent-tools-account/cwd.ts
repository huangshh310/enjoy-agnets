/**
 * inspect / login 的工作目录：只信已登记工作区，没有就用家目录。
 */
import { homedir } from "node:os"
import { resolveCustomizeWorkspace } from "../customize-workspace"

export async function agentToolsCwd(): Promise<string> {
  return (await resolveCustomizeWorkspace()) ?? homedir()
}
