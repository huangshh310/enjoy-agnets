/**
 * 工作区监视的噪声目录。这些目录一变就推 IPC，渲染进程会被打满。
 * main 的 fs.watch 与 renderer 的刷新判断用同一份名单。
 */
const IGNORED_WORKSPACE_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "out",
  ".next",
  ".turbo",
  "coverage",
  "build"
])

/** 目录名是否在噪声名单里。指纹轮询跳过整棵子树时用。 */
export function isIgnoredWorkspaceDirName(name: string): boolean {
  return IGNORED_WORKSPACE_DIR_NAMES.has(name)
}

/**
 * 相对路径任一段落在噪声目录里就不发 workspace.changed。
 * `.` 是 Windows 指纹轮询的整树信号，保留。
 */
export function isIgnoredWorkspaceEventPath(relativePath: string): boolean {
  const normalized = relativePath.replaceAll("\\", "/")
  if (!normalized || normalized === ".") return false
  return normalized.split("/").some((part) => IGNORED_WORKSPACE_DIR_NAMES.has(part))
}
