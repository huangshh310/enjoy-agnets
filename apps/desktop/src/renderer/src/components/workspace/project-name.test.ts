import assert from "node:assert/strict"
import { test } from "node:test"
import { folderNameFromPath, nextProjectName } from "./project-name.ts"

test("folderNameFromPath 取路径最后一段", () => {
  assert.equal(folderNameFromPath("C:\\Users\\huangshh\\Desktop\\img\\_tmp"), "_tmp")
  assert.equal(folderNameFromPath("C:\\myfile\\workspaces\\proj\\enjoy-agents"), "enjoy-agents")
  assert.equal(folderNameFromPath("/home/dev/app/"), "app")
})

test("换文件夹后，未手改的项目名跟随新目录", () => {
  assert.equal(nextProjectName("_tmp", "enjoy-agents", false), "enjoy-agents")
  assert.equal(nextProjectName("", "enjoy-agents", false), "enjoy-agents")
})

test("用户手改过的非空名称不覆盖", () => {
  assert.equal(nextProjectName("我的项目", "enjoy-agents", true), "我的项目")
})

test("手改后若清空输入，再次选文件夹仍回填目录名", () => {
  assert.equal(nextProjectName("   ", "enjoy-agents", true), "enjoy-agents")
})
