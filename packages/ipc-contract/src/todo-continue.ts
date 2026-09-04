/**
 * 续跑未完成 Todo 的提示句。主进程落库与渲染 Dock 必须认同一套前缀。
 */
export const TODO_CONTINUE_PROMPT =
  "继续完成未完成的内容。Continue the in_progress Todo List item with write_file / edit_file; do not stop at a written plan."

const TODO_CONTINUE_MARKERS = [
  TODO_CONTINUE_PROMPT,
  "The Todo List still has unfinished items.",
  "Continue the unfinished Todo List",
  "继续完成 Todo List",
  "继续完成未完成的内容",
  "继续完成剩余任务"
]

export function isTodoContinueUserMessage(content: string | undefined): boolean {
  const text = content?.trim() ?? ""
  if (!text) return false
  return TODO_CONTINUE_MARKERS.some((marker) => text.startsWith(marker) || text === marker)
}
