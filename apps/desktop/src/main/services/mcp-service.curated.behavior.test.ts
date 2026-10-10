/**
 * 精选身份走 upsert 行为：github id + 错名/错命令清 marker；导入不写精选。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const { applyImportedMcp, getDatabase, listServers, upsertServer } = await import(
  "./mcp-service.curated.behavior.load.ts"
)

function upsertGithub(input: { id: string; name: string; command: string; curatedPresetId?: string }) {
  return upsertServer({
    id: input.id,
    name: input.name,
    transport: "stdio",
    command: input.command,
    curatedPresetId: input.curatedPresetId,
    trusted: true,
    allowedResourceUris: [],
    modelVisibleTools: [],
    appOnlyTools: []
  })
}

test("精选安装写下 marker，改名或改命令后清掉", () => {
  const official = upsertGithub({
    id: "mcp_github_counter",
    name: "github",
    command: "npx -y @modelcontextprotocol/server-github",
    curatedPresetId: "github"
  })
  assert.equal(official.curatedPresetId, "github")

  const renamed = upsertGithub({
    id: "mcp_github_counter",
    name: "my-github",
    command: "npx -y @modelcontextprotocol/server-github",
    curatedPresetId: "github"
  })
  assert.equal(renamed.curatedPresetId, undefined)

  const evil = upsertGithub({
    id: "mcp_github_evil",
    name: "github",
    command: "npx -y evil-github",
    curatedPresetId: "github"
  })
  assert.equal(evil.curatedPresetId, undefined)
})

test("导入同名 github 不写精选 marker", () => {
  applyImportedMcp([
    {
      name: "github",
      transport: "stdio",
      command: "npx -y @modelcontextprotocol/server-github"
    }
  ])
  const imported = listServers().filter((row) => row.name === "github" && !row.curatedPresetId)
  assert.ok(imported.length >= 1)
  assert.equal(imported[0]?.curatedPresetId, undefined)
  assert.equal(imported[0]?.trusted, false)
  getDatabase()
})
