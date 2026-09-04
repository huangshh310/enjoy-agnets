/**
 * 把 Electron IPC 错误剥成英文码，再翻成界面中文。
 */
export function ipcErrorMessage(error: unknown): string {
  const raw = rawErrorText(error)
  const stripped = raw.replace(/^Error invoking remote method '[^']+': (?:Error: )?/u, "").trim()
  if (SKILL_SOURCE_ERROR_ZH[stripped]) return SKILL_SOURCE_ERROR_ZH[stripped]
  if (/Failed to connect|Could not connect to server|via 127\.0\.0\.1|Proxy CONNECT/i.test(stripped)) {
    return SKILL_SOURCE_ERROR_ZH.GIT_PROXY_UNREACHABLE
  }
  return stripped
}

function rawErrorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message
    if (typeof message === "string" && message.trim()) return message
  }
  return String(error)
}

const SKILL_SOURCE_ERROR_ZH: Record<string, string> = {
  SOURCE_NOT_FOUND: "找不到该技能来源，请刷新后重试",
  SKILL_NOT_FOUND: "找不到该技能",
  CANNOT_DELETE_SOURCE_ROOT: "不能删除技能根目录，请删除其中的单个技能包",
  SOURCE_EXISTS: "该来源已经添加过了",
  GIT_NOT_FOUND: "未找到 git，请先安装并加入 PATH",
  GIT_CLONE_FAILED: "Git 克隆失败",
  GIT_PULL_FAILED: "Git 拉取失败",
  GIT_PROXY_UNREACHABLE:
    "无法连接 GitHub。Git 走了本机代理 127.0.0.1，但代理没通。请打开 Clash/VPN，或执行 git config --global --unset http.proxy 后再试",
  EMPTY_SELECTION: "请先选择要投影的技能和目标 Agent",
  MISSING_CHECKOUT: "来源尚未检出，请先更新或重新导入",
  UNMANAGED_SOURCE: "本机自动发现的技能目录不能从列表移除",
  "Open a workspace first.": "请先打开一个工作区"
}
