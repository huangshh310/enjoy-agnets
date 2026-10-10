/**
 * I2 精选：写入现有 SoT、catalog 失败诚实空、禁「已同步到助手」。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { addCuratedToSot } from "./add-curated-to-sot.ts"
import { loadCuratedCatalog } from "./load-curated-catalog.ts"
import { configuredNames, isMcpWritten, isSkillWritten } from "../extensions-written.ts"
import type { CuratedSotIde } from "./curated.types.ts"
import type { ExtensionCuratedCard } from "../extensions.types.ts"

const dir = dirname(fileURLToPath(import.meta.url))

function readPreview(): string {
  let cursor = dir
  for (let i = 0; i < 12; i += 1) {
    const candidate = join(cursor, "design/previews/i2-extensions-curated.html")
    try {
      return readFileSync(candidate, "utf8")
    } catch {
      cursor = join(cursor, "..")
    }
  }
  throw new Error("i2-extensions-curated.html 必须在仓内")
}

const page = readFileSync(join(dir, "../extensions-page.tsx"), "utf8")
const section = readFileSync(join(dir, "curated-section.tsx"), "utf8")
const empty = readFileSync(join(dir, "curated-empty.tsx"), "utf8")
const addSrc = readFileSync(join(dir, "add-curated-to-sot.ts"), "utf8")
const slim = readFileSync(join(dir, "../../../ai-chat/composer/composer-slim-density.test.ts"), "utf8")
const preview = readPreview()

const mcpCard: ExtensionCuratedCard = {
  id: "github",
  kind: "mcp",
  title: "GitHub",
  description: "仓库、Issue、PR",
  transport: "stdio",
  command: "npx -y @modelcontextprotocol/server-github"
}

const skillCard: ExtensionCuratedCard = {
  id: "obra-superpowers",
  kind: "skills",
  title: "Superpowers for Agents",
  description: "TDD",
  locator: "obra/superpowers",
  sourceName: "obra/superpowers"
}

test("预览真源仍锁写入 SoT 与 catalog 失败空", () => {
  assert.ok(preview.includes("【视觉真源】I2"))
  assert.ok(preview.includes("添加到 MCP"))
  assert.ok(preview.includes("添加到技能"))
  assert.ok(preview.includes("已写入 Enjoy · 下一轮可注入"))
  assert.ok(preview.includes("精选暂时加载不了"))
  assert.ok(preview.includes("已同步到助手"))
})

test("扩展页同页挂精选区，不上 #/settings/curated", () => {
  assert.ok(page.includes("<CuratedSection"))
  assert.ok(page.includes("page-extensions"))
  assert.equal(page.includes("/settings/curated"), false)
  assert.ok(section.includes("extensions-curated"))
  assert.ok(empty.includes("extensions-curated-retry"))
})

test("添加 MCP 走 mcp.upsert 且 trusted，不新开存储", async () => {
  const upserts: unknown[] = []
  const ide: CuratedSotIde = {
    mcp: {
      servers: async () => [],
      upsert: async (input) => {
        upserts.push(input)
        return input
      }
    },
    skills: {
      sources: {
        add: async () => {
          throw new Error("skills must not run")
        },
        deploy: async () => {
          throw new Error("skills must not run")
        }
      }
    }
  }
  await addCuratedToSot(mcpCard, ide)
  assert.equal(upserts.length, 1)
  assert.deepEqual(upserts[0], {
    id: undefined,
    name: "github",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-github",
    url: undefined,
    allowedResourceUris: [],
    modelVisibleTools: [],
    appOnlyTools: [],
    trusted: true,
    curatedPresetId: "github"
  })
  assert.ok(addSrc.includes("trusted: true"))
  assert.ok(addSrc.includes("skills.sources.add"))
})

test("添加技能走 sources.add + deploy，locator 作 origin", async () => {
  const calls: string[] = []
  const ide: CuratedSotIde = {
    mcp: {
      servers: async () => {
        throw new Error("mcp must not run")
      },
      upsert: async () => {
        throw new Error("mcp must not run")
      }
    },
    skills: {
      sources: {
        add: async (input) => {
          calls.push(`add:${input.kind}:${input.origin}`)
          return { id: "obra-superpowers" }
        },
        deploy: async (input) => {
          calls.push(`deploy:${input.sourceId}`)
          return { ok: true }
        }
      }
    }
  }
  await addCuratedToSot(skillCard, ide)
  assert.deepEqual(calls, ["add:git:obra/superpowers", "deploy:obra-superpowers"])
})

test("catalog 任一端失败则 loadCuratedCatalog 拒绝，不得 silently 填假卡", async () => {
  await assert.rejects(
    () =>
      loadCuratedCatalog({
        loadMcp: async () => [mcpCard],
        loadSkills: async () => {
          throw new Error("CATALOG_UNAVAILABLE")
        }
      }),
    /CATALOG_UNAVAILABLE/
  )
  const ok = await loadCuratedCatalog({
    loadMcp: async () => [mcpCard],
    loadSkills: async () => [skillCard]
  })
  assert.equal(ok.mcp[0]?.id, "github")
  assert.equal(ok.skills[0]?.id, "obra-superpowers")
})

test("已写入判定认 SoT 名 / locator，不认精选列表自己", () => {
  assert.equal(isMcpWritten([{ name: "github" }], mcpCard), true)
  assert.equal(isMcpWritten([{ name: "filesystem" }], mcpCard), false)
  assert.equal(
    isSkillWritten(
      [{ id: "obra-superpowers", name: "obra/superpowers", origin: "https://github.com/obra/superpowers.git" }],
      skillCard
    ),
    true
  )
  assert.equal(
    isSkillWritten([{ id: "other", name: "other", origin: "https://github.com/acme/other.git" }], skillCard),
    false
  )
  assert.deepEqual(configuredNames([{ name: "Filesystem" }, { name: "GitHub" }]), ["Filesystem", "GitHub"])
})

test("本刀不改 Composer 瘦身守门文件", () => {
  assert.ok(slim.includes("顶栏铬序是探索/执行"))
  assert.ok(slim.includes("HostInject 空不画"))
  assert.equal(page.includes("HostInjectBar"), false)
  assert.equal(section.includes("已同步到助手"), false)
  assert.equal(empty.includes("已同步到助手"), false)
})
