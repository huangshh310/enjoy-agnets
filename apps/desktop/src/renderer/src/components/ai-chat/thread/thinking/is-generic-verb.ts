/**
 * 工具标题残词：不能当文件名。
 */
const GENERIC_VERB =
  /^(编辑|写入|读取|创建|修改|删除|运行|edit|write|read|create|modify|delete|run|file|folder|command)$/i

export function isGenericVerb(text: string): boolean {
  return GENERIC_VERB.test(text.trim())
}
