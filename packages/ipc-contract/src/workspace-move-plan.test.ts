import assert from "node:assert/strict"
import { test } from "node:test"
import {
  MOVE_INTO_SELF,
  MOVE_ROOT,
  MOVE_SAME_LOCATION,
  dropTargetDir,
  planWorkspaceMove,
  posixRel,
  remapAfterMove
} from "./workspace-move-plan.ts"

test("posixRel 去尾斜杠、反斜杠与 ./", () => {
  assert.equal(posixRel("src/lib/"), "src/lib")
  assert.equal(posixRel("src\\lib"), "src/lib")
  assert.equal(posixRel("./a.ts"), "a.ts")
  assert.equal(posixRel(""), ".")
})

test("拖到文件上等于放进父目录", () => {
  assert.equal(dropTargetDir("src/a.ts", "file"), "src")
  assert.equal(dropTargetDir("a.ts", "file"), ".")
  assert.equal(dropTargetDir("src", "directory"), "src")
})

test("移进别的目录拼出 dest", () => {
  assert.deepEqual(planWorkspaceMove("src/a.ts", "lib"), { dest: "lib/a.ts" })
  assert.deepEqual(planWorkspaceMove("src/a.ts", "."), { dest: "a.ts" })
})

test("同位置、进自己、移动根都拒绝", () => {
  assert.throws(() => planWorkspaceMove("src/a.ts", "src"), (err: Error) => {
    return err.message === MOVE_SAME_LOCATION
  })
  assert.throws(() => planWorkspaceMove("src", "src/lib"), (err: Error) => {
    return err.message === MOVE_INTO_SELF
  })
  assert.throws(() => planWorkspaceMove(".", "lib"), (err: Error) => {
    return err.message === MOVE_ROOT
  })
})

test("remapAfterMove 跟着文件或整棵子树走", () => {
  assert.equal(remapAfterMove("src/a.ts", "src/a.ts", "lib/a.ts"), "lib/a.ts")
  assert.equal(remapAfterMove("src/lib/x.ts", "src", "pkg"), "pkg/lib/x.ts")
  assert.equal(remapAfterMove("readme.md", "src/a.ts", "lib/a.ts"), "readme.md")
})
