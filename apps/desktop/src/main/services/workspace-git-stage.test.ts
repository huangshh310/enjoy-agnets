/**
 * 目录暂存只碰该前缀下的 porcelain 变更；字面 pathspec 不把 `*` 当成通配符。
 */
import assert from "node:assert/strict"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { test } from "node:test"
import { runGit } from "./command.ts"
import { expandStageTargets, stageWorkspacePaths } from "./workspace-git-stage.ts"

test("目录前缀暂存、越界拒绝、星号文件名不展开", async () => {
  await withRepo(async (root) => {
    await mkdir(join(root, "dir"))
    await writeFile(join(root, "dir", "a.txt"), "inside\n", "utf8")
    await writeFile(join(root, "out.txt"), "outside\n", "utf8")
    await writeFile(join(root, "wildX.txt"), "other\n", "utf8")
    // Windows 文件名不能含 *；字面星号只在 POSIX 上落盘验证。
    if (process.platform !== "win32") {
      await writeFile(join(root, "wild*.txt"), "star\n", "utf8")
    }

    const stagedDir = await stageWorkspacePaths(root, ["dir"], "add")
    assert.equal(stagedDir.count, 1)
    assert.deepEqual(await stagedNames(root), ["dir/a.txt"])

    if (process.platform !== "win32") {
      await stageWorkspacePaths(root, ["wild*.txt"], "add")
      const afterStar = await stagedNames(root)
      assert.ok(afterStar.includes("wild*.txt"))
      assert.equal(afterStar.includes("wildX.txt"), false)
      assert.equal(afterStar.includes("out.txt"), false)
    }

    await stageWorkspacePaths(root, ["dir"], "unstage")
    assert.equal((await stagedNames(root)).includes("dir/a.txt"), false)

    await mkdir(join(root, "empty"))
    await assert.rejects(
      () => stageWorkspacePaths(root, ["empty"], "add"),
      /STAGE_NOTHING_MATCHED/
    )

    await assert.rejects(
      () => stageWorkspacePaths(root, ["../outside"], "add"),
      /escapes the workspace/
    )
  })
})

test("目录展开只收文件行，不把 dir/ 整目录交给 git", () => {
  const collapsed = expandStageTargets(["dir"], [{ path: "dir/", staged: false }], "add")
  assert.deepEqual(collapsed, [])
  const files = expandStageTargets(
    ["dir"],
    [
      { path: "dir/a.txt", staged: true },
      { path: "out.txt", staged: false }
    ],
    "add"
  )
  assert.deepEqual(files, ["dir/a.txt"])
  const unstagedOnly = expandStageTargets(
    ["dir"],
    [{ path: "dir/a.txt", staged: false }],
    "unstage"
  )
  assert.deepEqual(unstagedOnly, [])
})

async function stagedNames(root: string): Promise<string[]> {
  const listed = await runGit(root, ["diff", "--cached", "--name-only"])
  assert.equal(listed.exitCode, 0, listed.stderr)
  return listed.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .sort()
}

async function withRepo(run: (root: string) => Promise<void>): Promise<void> {
  const parent = join(process.cwd(), "apps/desktop/test-results")
  await mkdir(parent, { recursive: true })
  const root = await mkdtemp(join(parent, "stage-"))
  try {
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
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}
