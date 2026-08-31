/**
 * 创建项目弹窗的名称同步：换源文件夹时，未手改过的名称跟随新目录名。
 */

/** 从绝对路径取最后一段作为默认项目名。 */
export function folderNameFromPath(rootPath: string): string {
  return rootPath.split(/[\\/]/).filter(Boolean).at(-1) ?? ""
}

/**
 * 选中新文件夹后的项目名称。
 * 用户已手改且当前名非空时保留；否则用新目录名。
 */
export function nextProjectName(
  currentName: string,
  suggested: string,
  nameTouched: boolean
): string {
  if (nameTouched && currentName.trim() !== "") return currentName
  return suggested
}
