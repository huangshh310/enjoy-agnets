import assert from "node:assert/strict"
import { test } from "node:test"
import { toolDisplayName } from "./tool-display-name.ts"

const zh: Record<string, string> = {
  "chat.toolName.writeFile": "写入文件",
  "chat.toolName.editFile": "编辑文件",
  "chat.toolName.readFile": "读取文件",
  "chat.toolName.bash": "运行命令"
}

function t(path: string): string {
  return zh[path] ?? path
}

test("write_file 显示写入文件，不摊裸 id", () => {
  assert.equal(toolDisplayName("write_file", t), "写入文件")
  assert.equal(toolDisplayName("write", t), "写入文件")
  assert.equal(toolDisplayName("edit_file", t), "编辑文件")
  assert.doesNotMatch(toolDisplayName("write_file", t), /write_file/)
})
