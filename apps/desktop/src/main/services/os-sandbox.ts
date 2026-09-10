/**
 * macOS Seatbelt 配置：写盘限工作区与临时目录，默认禁网。
 * 这是 OS 边界；审批仍是人边界。Linux/Windows 不包装。
 */
export function buildSeatbeltProfile(input: {
  workspaceRoot: string
  tmpDir: string
  allowNetwork: boolean
}): string {
  const workspace = escapeSeatbelt(input.workspaceRoot)
  const tmp = escapeSeatbelt(input.tmpDir)
  const network = input.allowNetwork ? "(allow network*)" : "(deny network*)"
  return `(version 1)
(deny default)
(allow process*)
(allow sysctl-read)
(allow mach-lookup)
(allow file-read*)
(allow file-write* (subpath "${workspace}") (subpath "${tmp}") (subpath "/private/tmp") (subpath "/tmp"))
${network}
`
}

export function seatbeltWrap(
  executable: string,
  args: string[],
  profile: string
): { executable: string; args: string[] } {
  return {
    executable: "sandbox-exec",
    args: ["-p", profile, executable, ...args]
  }
}

export function shouldUseOsSandbox(platform = process.platform): boolean {
  return platform === "darwin"
}

function escapeSeatbelt(path: string): string {
  return path.replace(/\\/g, "/").replace(/"/g, '\\"')
}
