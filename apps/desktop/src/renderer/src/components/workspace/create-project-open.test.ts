/**
 * 「创建项目」首次点击：指针先吃掉，状态不跟侧栏一起卸。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { requestCreateProject, useCreateProjectStore } from "./create-project-open.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("主键 pointerdown 先 preventDefault，微任务后打开", async () => {
  useCreateProjectStore.setState({ open: false })
  let prevented = false
  requestCreateProject({
    button: 0,
    preventDefault: () => {
      prevented = true
    }
  })
  assert.equal(prevented, true)
  assert.equal(useCreateProjectStore.getState().open, false)
  await Promise.resolve()
  assert.equal(useCreateProjectStore.getState().open, true)
})

test("右键不打开", async () => {
  useCreateProjectStore.setState({ open: false })
  requestCreateProject({
    button: 2,
    preventDefault: () => undefined
  })
  await Promise.resolve()
  assert.equal(useCreateProjectStore.getState().open, false)
})

test("打开后侧栏重挂不会把窗关掉", () => {
  useCreateProjectStore.getState().show()
  assert.equal(useCreateProjectStore.getState().open, true)
})

test("侧栏只发请求，Dialog 挂在应用壳", () => {
  const sidebar = readFileSync(join(dir, "../ai-chat/sidebar/sidebar-repos.tsx"), "utf8")
  const shell = readFileSync(join(dir, "../app-shell/app-shell.tsx"), "utf8")
  assert.match(sidebar, /requestCreateProject/)
  assert.doesNotMatch(sidebar, /<CreateProjectDialog/)
  assert.match(shell, /CreateProjectHost/)
})
