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

test("同步打开会被同一次外点立刻关上；微任务打开则留下", async () => {
  const naive = { open: false }
  naive.open = true
  // Dialog 内容不在侧栏按钮下，同一次 pointerdown 被当成外点。
  if (naive.open) naive.open = false
  assert.equal(naive.open, false)

  useCreateProjectStore.setState({ open: false })
  let prevented = false
  let stopped = false
  requestCreateProject({
    button: 0,
    preventDefault: () => {
      prevented = true
    },
    stopPropagation: () => {
      stopped = true
    }
  })
  assert.equal(prevented, true)
  assert.equal(stopped, true)
  assert.equal(useCreateProjectStore.getState().open, false)
  await Promise.resolve()
  assert.equal(useCreateProjectStore.getState().open, true)
})

test("侧栏重挂清掉本地 open，壳层 store 还在", () => {
  let localOpen = true
  localOpen = false
  useCreateProjectStore.getState().show()
  assert.equal(localOpen, false)
  assert.equal(useCreateProjectStore.getState().open, true)
})

test("侧栏只发请求，Dialog 挂在应用壳", () => {
  const sidebar = readFileSync(join(dir, "../ai-chat/sidebar/sidebar-repos.tsx"), "utf8")
  const shell = readFileSync(join(dir, "../app-shell/app-shell.tsx"), "utf8")
  assert.match(sidebar, /requestCreateProject/)
  assert.doesNotMatch(sidebar, /<CreateProjectDialog/)
  assert.match(shell, /CreateProjectHost/)
})
