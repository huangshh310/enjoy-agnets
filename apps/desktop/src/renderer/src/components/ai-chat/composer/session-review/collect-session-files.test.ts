import assert from "node:assert/strict"
import { test } from "node:test"
import {
  collectDirtySessionFiles,
  collectSessionFiles,
  describeReviewFiles,
  pickReviewFiles,
  sessionEntryKind
} from "./collect-session-files.ts"

test("按上一轮 path 列文件，并贴上 Git 增减", () => {
  const files = collectSessionFiles(
    ["src/a.ts", "src/a.ts", "./src/b.ts"],
    [
      { path: "src/a.ts", status: "modified", additions: 4, deletions: 1 },
      { path: "other.ts", status: "modified", additions: 9, deletions: 2 }
    ]
  )
  assert.deepEqual(files, [
    { path: "src/a.ts", name: "a.ts", dir: "src", additions: 4, deletions: 1, kind: "file" },
    { path: "src/b.ts", name: "b.ts", dir: "src", additions: 0, deletions: 0, kind: "file" }
  ])
})

test("已提交、Git 里没有的 path 不进 dirty 列表", () => {
  const files = collectDirtySessionFiles(
    ["src/a.ts", "src/b.ts"],
    [{ path: "src/a.ts", status: "modified", additions: 1, deletions: 0 }]
  )
  assert.deepEqual(
    files.map((file) => file.path),
    ["src/a.ts"]
  )
})

test("停跑后本轮已提交文件不再出现", () => {
  assert.deepEqual(pickReviewFiles(["src/a.ts", "src/b.ts"], [], false), [])
})

test("运行中 Git 未跟上仍列出本轮写盘", () => {
  const files = pickReviewFiles(["src/a.ts"], [], true)
  assert.equal(files[0]?.path, "src/a.ts")
})

test("本轮都已提交时回落其余未提交改动", () => {
  const files = pickReviewFiles(
    ["src/a.ts"],
    [{ path: "notes.md", status: "untracked", additions: 1, deletions: 0 }],
    false
  )
  assert.equal(files[0]?.path, "notes.md")
})

test("磁盘上已有文件但本轮没有已执行写盘，不算本轮改动", () => {
  const pick = describeReviewFiles(
    [],
    [{ path: "e2e-stub.txt", status: "untracked", additions: 1, deletions: 0 }],
    false
  )
  assert.equal(pick.fromLastTurn, false)
  assert.equal(pick.files[0]?.path, "e2e-stub.txt")
})

test("没有本轮写盘时回落工作区改动，并标记非本轮", () => {
  const pick = describeReviewFiles(
    [],
    [{ path: "notes.md", status: "untracked", additions: 1, deletions: 0 }],
    false
  )
  assert.equal(pick.fromLastTurn, false)
  assert.equal(pick.files[0]?.path, "notes.md")
})

test("本轮仍 dirty 时 fromLastTurn 为 true", () => {
  const pick = describeReviewFiles(
    ["src/a.ts"],
    [{ path: "src/a.ts", status: "modified", additions: 2, deletions: 0 }],
    false
  )
  assert.equal(pick.fromLastTurn, true)
})

test("无扩展名且无行统计的未跟踪目录画文件夹", () => {
  assert.equal(sessionEntryKind("src/app/(marketing)/", "(marketing)", 0, 0), "directory")
  assert.equal(sessionEntryKind("src/app/login", "login", 0, 0), "directory")
  assert.equal(sessionEntryKind("src/a.ts", "a.ts", 0, 0), "file")
  assert.equal(sessionEntryKind("Dockerfile", "Dockerfile", 0, 0), "file")
})

test("相对路径后缀也能对上 Git 行", () => {
  const files = collectSessionFiles(
    ["b.ts"],
    [{ path: "apps/desktop/src/b.ts", status: "added", additions: 3, deletions: 0 }]
  )
  assert.equal(files[0]?.additions, 3)
  assert.equal(files[0]?.path, "apps/desktop/src/b.ts")
})
