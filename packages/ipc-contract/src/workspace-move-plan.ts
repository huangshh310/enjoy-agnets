/**
 * 工作区相对路径移动规划。只用 posix 斜杠，不碰 fs。
 * main 再 jail + rename；renderer 用来判断能否放下。
 */

export const MOVE_SAME_LOCATION = "MOVE_SAME_LOCATION"
export const MOVE_INTO_SELF = "MOVE_INTO_SELF"
export const MOVE_ROOT = "MOVE_ROOT"

/** 统一成 posix 相对路径；空或根为 `.`。 */
export function posixRel(path: string): string {
  const trimmed = path.replace(/\\/g, "/").replace(/\/+$/, "")
  return trimmed === "" || trimmed === "." ? "." : trimmed.replace(/^\.\//, "")
}

export function parentDir(path: string): string {
  const normalized = posixRel(path)
  if (normalized === "." || !normalized.includes("/")) return "."
  return normalized.slice(0, normalized.lastIndexOf("/")) || "."
}

export function baseName(path: string): string {
  const normalized = posixRel(path)
  const index = normalized.lastIndexOf("/")
  return index === -1 ? normalized : normalized.slice(index + 1)
}

export function joinRel(dir: string, name: string): string {
  const parent = posixRel(dir)
  if (parent === ".") return name
  return `${parent}/${name}`
}

/** parent 为 `.` 时，工作区内任意非根路径都算在内。 */
export function isPathInside(parent: string, child: string): boolean {
  const root = posixRel(parent)
  const nested = posixRel(child)
  if (root === ".") return nested !== "."
  return nested === root || nested.startsWith(`${root}/`)
}

/** 拖到文件上 = 放进该文件所在目录。 */
export function dropTargetDir(targetPath: string, targetKind: "file" | "directory"): string {
  return targetKind === "directory" ? posixRel(targetPath) : parentDir(targetPath)
}

/**
 * 算出目标相对路径。同位置 / 把自己拖进自己 / 移动工作区根 会抛英文码。
 */
export function planWorkspaceMove(from: string, toDir: string): { dest: string } {
  const src = posixRel(from)
  if (src === ".") throw new Error(MOVE_ROOT)
  const dest = joinRel(toDir, baseName(src))
  if (dest === src) throw new Error(MOVE_SAME_LOCATION)
  if (isPathInside(src, dest)) throw new Error(MOVE_INTO_SELF)
  return { dest }
}

/** 预览选中路径：被搬走的文件或子路径跟着改。 */
export function remapAfterMove(current: string, from: string, dest: string): string {
  const cur = posixRel(current)
  const src = posixRel(from)
  const to = posixRel(dest)
  if (cur === src) return to
  if (cur.startsWith(`${src}/`)) return `${to}${cur.slice(src.length)}`
  return cur
}
