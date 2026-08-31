import assert from "node:assert/strict"
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { collectKnowledgeFiles } from "./collect-files.ts"

test("collectKnowledgeFiles 扫到目录内可解析文件，不吞成空列表", async () => {
  const root = await mkdtemp(join(tmpdir(), "ea-knowledge-"))
  await mkdir(join(root, "design", "specs"), { recursive: true })
  await writeFile(join(root, "design", "specs", "ui.md"), "# ui\n")
  await writeFile(join(root, "design", "README.md"), "readme\n")
  const files = await collectKnowledgeFiles(root, "design", [])
  const names = files.map((f) => f.replace(/\\/g, "/"))
  assert.ok(names.some((f) => f.endsWith("design/specs/ui.md")))
  assert.ok(names.some((f) => f.endsWith("design/README.md")))
})

test("collectKnowledgeFiles 根路径不存在时抛错而不是返回空", async () => {
  const root = await mkdtemp(join(tmpdir(), "ea-knowledge-missing-"))
  await assert.rejects(
    () => collectKnowledgeFiles(root, "design", []),
    /Path not found in workspace: design/
  )
})
