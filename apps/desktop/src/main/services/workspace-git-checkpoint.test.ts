import assert from "node:assert/strict"
import { access, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { test } from "node:test"
import { runGit } from "./command.ts"
import { previewEnjoyCheckpointRestore } from "./workspace-git-checkpoint-plan.ts"
import { restoreEnjoyCheckpoint } from "./workspace-git-checkpoint-restore.ts"
import {
  enjoyCheckpointRef,
  listEnjoyCheckpoints,
  parseEnjoyCheckpointRef,
  recordEnjoyCheckpoint
} from "./workspace-git-checkpoint.ts"

test("检查点 ref 不进用户分支命名空间", () => {
  const ref = enjoyCheckpointRef(1_700_000_000_000)
  assert.equal(ref, "refs/enjoy/checkpoints/1700000000000")
  assert.ok(!ref.startsWith("refs/heads/"))
  assert.equal(parseEnjoyCheckpointRef(ref), 1_700_000_000_000)
  assert.equal(parseEnjoyCheckpointRef("refs/heads/main"), null)
  assert.equal(parseEnjoyCheckpointRef("refs/enjoy/checkpoints/../x"), null)
})

test("非法 ref 拒绝还原", async () => {
  await assert.rejects(
    () => restoreEnjoyCheckpoint(process.cwd(), "refs/heads/main"),
    /CHECKPOINT_REF_INVALID/
  )
})

test("非仓库不记检查点", async () => {
  await withTempDir(async (root) => {
    await writeFile(join(root, "a.txt"), "x\n", "utf8")
    assert.equal(await recordEnjoyCheckpoint(root), null)
  })
})

test("写盘后记检查点，HEAD 不动", async () => {
  await withRepo(async (root) => {
    const head = (await runGit(root, ["rev-parse", "HEAD"])).stdout.trim()
    await writeFile(join(root, "note.txt"), "dirty\n", "utf8")
    const ref = await recordEnjoyCheckpoint(root)
    assert.ok(ref?.startsWith("refs/enjoy/checkpoints/"))
    assert.equal((await runGit(root, ["rev-parse", "HEAD"])).stdout.trim(), head)
    const listed = await listEnjoyCheckpoints(root)
    assert.ok(listed.includes(ref ?? ""))
    await writeFile(join(root, "note.txt"), "later\n", "utf8")
    await writeFile(join(root, "extra.txt"), "gone\n", "utf8")
    await assert.rejects(
      () => restoreEnjoyCheckpoint(root, "refs/enjoy/checkpoints/1"),
      /CHECKPOINT_NOT_FOUND/
    )
    const restored = await restoreEnjoyCheckpoint(root, ref ?? "", {
      confirmDeleteUntracked: true
    })
    assert.equal(restored.ok, true)
    assert.equal((await runGit(root, ["rev-parse", "HEAD"])).stdout.trim(), head)
    assert.equal(await readFile(join(root, "note.txt"), "utf8"), "dirty\n")
    await assert.rejects(() => access(join(root, "extra.txt")))
    await assertTempIndexGone(root)
  })
})

test("还原用临时 index，不改用户暂存区", async () => {
  await withRepo(async (root) => {
    await writeFile(join(root, "note.txt"), "dirty\n", "utf8")
    const ref = await recordEnjoyCheckpoint(root)
    assert.ok(ref)
    await writeFile(join(root, "keep-staged.txt"), "mine\n", "utf8")
    assert.equal((await runGit(root, ["add", "keep-staged.txt"])).exitCode, 0)
    const stagedBefore = (await runGit(root, ["diff", "--cached", "--name-only"])).stdout
    assert.ok(stagedBefore.includes("keep-staged.txt"))
    await writeFile(join(root, "note.txt"), "later\n", "utf8")
    const restored = await restoreEnjoyCheckpoint(root, ref)
    assert.equal(restored.ok, true)
    assert.equal(await readFile(join(root, "note.txt"), "utf8"), "dirty\n")
    const stagedAfter = (await runGit(root, ["diff", "--cached", "--name-only"])).stdout
    assert.ok(stagedAfter.includes("keep-staged.txt"))
    assert.equal((await runGit(root, ["ls-files", "--stage", "keep-staged.txt"])).exitCode, 0)
    await assertTempIndexGone(root)
  })
})

test("未跟踪文件 dry-run 后必须确认才删除", async () => {
  await withRepo(async (root) => {
    await writeFile(join(root, "note.txt"), "dirty\n", "utf8")
    const ref = await recordEnjoyCheckpoint(root)
    assert.ok(ref)
    await writeFile(join(root, "extra.txt"), "gone\n", "utf8")
    const preview = await previewEnjoyCheckpointRestore(root, ref)
    assert.deepEqual(preview.untrackedToDelete, ["extra.txt"])
    const dry = await restoreEnjoyCheckpoint(root, ref)
    assert.deepEqual(dry, {
      ok: false,
      code: "CHECKPOINT_CONFIRM_REQUIRED",
      untrackedToDelete: ["extra.txt"]
    })
    assert.equal(await readFile(join(root, "extra.txt"), "utf8"), "gone\n")
    const restored = await restoreEnjoyCheckpoint(root, ref, {
      confirmDeleteUntracked: true
    })
    assert.equal(restored.ok, true)
    await assert.rejects(() => access(join(root, "extra.txt")))
    await assertTempIndexGone(root)
  })
})

async function withRepo(run: (root: string) => Promise<void>): Promise<void> {
  await withTempDir(async (root) => {
    const init = await runGit(root, ["init", "-b", "main"])
    assert.equal(init.exitCode, 0, init.stderr)
    await runGit(root, ["config", "user.email", "test@enjoy.local"])
    await runGit(root, ["config", "user.name", "Enjoy Test"])
    await runGit(root, ["config", "core.autocrlf", "false"])
    await runGit(root, ["config", "core.eol", "lf"])
    await writeFile(join(root, "seed.txt"), "seed\n", "utf8")
    assert.equal((await runGit(root, ["add", "seed.txt"])).exitCode, 0)
    assert.equal((await runGit(root, ["commit", "-m", "seed"])).exitCode, 0)
    await run(root)
  })
}

async function assertTempIndexGone(root: string): Promise<void> {
  const names = await readdir(join(root, ".git"))
  assert.deepEqual(
    names.filter((name) => name.startsWith("enjoy-index-")),
    []
  )
}

async function withTempDir(run: (root: string) => Promise<void>): Promise<void> {
  const parent = join(process.cwd(), "apps/desktop/test-results")
  await mkdir(parent, { recursive: true })
  const root = await mkdtemp(join(parent, "checkpoint-"))
  try {
    await run(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}
