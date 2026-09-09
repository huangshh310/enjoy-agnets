import assert from "node:assert/strict"
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { test } from "node:test"
import { runGit } from "./command.ts"
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
  const parent = join(process.cwd(), "apps/desktop/test-results")
  await mkdir(parent, { recursive: true })
  const root = await mkdtemp(join(parent, "nocheck-"))
  try {
    await writeFile(join(root, "a.txt"), "x\n", "utf8")
    assert.equal(await recordEnjoyCheckpoint(root), null)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("写盘后记检查点，HEAD 不动", async () => {
  const parent = join(process.cwd(), "apps/desktop/test-results")
  await mkdir(parent, { recursive: true })
  const root = await mkdtemp(join(parent, "checkpoint-"))
  try {
    const init = await runGit(root, ["init", "-b", "main"])
    assert.equal(init.exitCode, 0, init.stderr)
    await runGit(root, ["config", "user.email", "test@enjoy.local"])
    await runGit(root, ["config", "user.name", "Enjoy Test"])
    await writeFile(join(root, "seed.txt"), "seed\n", "utf8")
    assert.equal((await runGit(root, ["add", "seed.txt"])).exitCode, 0)
    assert.equal((await runGit(root, ["commit", "-m", "seed"])).exitCode, 0)
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
    await restoreEnjoyCheckpoint(root, ref ?? "")
    assert.equal((await runGit(root, ["rev-parse", "HEAD"])).stdout.trim(), head)
    assert.equal(await readFile(join(root, "note.txt"), "utf8"), "dirty\n")
    await assert.rejects(() => access(join(root, "extra.txt")))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
