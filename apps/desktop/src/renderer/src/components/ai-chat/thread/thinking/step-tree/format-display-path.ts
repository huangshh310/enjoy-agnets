/**
 * 把绝对路径裁成思考树里显示的工作区相对路径。纯函数，无 React / Electron 依赖。
 */

/** 工作区根匹配则剥前缀；绝对路径折叠保留末两段，相对路径原样返回。 */
export function formatDisplayPath(
  filePath?: string,
  fileName?: string,
  workspaceRoot?: string | null
): string {
  if (!filePath) return fileName || ""
  const norm = (s: string) => s.replace(/\\/g, "/").replace(/\/+$/, "")
  const normFile = norm(filePath)
  if (workspaceRoot) {
    const normRoot = norm(workspaceRoot)
    if (normFile.toLowerCase().startsWith(`${normRoot.toLowerCase()}/`)) {
      return normFile.slice(normRoot.length + 1)
    }
  }
  // 折叠只为救绝对路径（含 Windows 盘符）；相对路径本身已是工作区视角，截它会丢目录上下文。
  const isAbsolute = normFile.startsWith("/") || /^[A-Za-z]:\//.test(normFile)
  if (!isAbsolute) return normFile || fileName || ""
  if (fileName && normFile !== fileName && normFile.includes("/")) {
    const segments = normFile.split("/").filter(Boolean)
    if (segments.length > 3) {
      return segments.slice(-2).join("/")
    }
  }
  return fileName || filePath
}
