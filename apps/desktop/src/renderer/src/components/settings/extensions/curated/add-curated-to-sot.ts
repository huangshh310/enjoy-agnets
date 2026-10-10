/**
 * 「添加到 MCP / 添加到技能」只写入现有 Enjoy SoT，再交给 P0-S 注入。
 */
import type { ExtensionCuratedCard } from "../extensions.types.ts"
import type { CuratedSotIde } from "./curated.types.ts"

export async function addCuratedToSot(card: ExtensionCuratedCard, ide: CuratedSotIde): Promise<void> {
  if (card.kind === "mcp") {
    await upsertMcpCard(card, ide)
    return
  }
  await addSkillCard(card, ide)
}

async function upsertMcpCard(card: ExtensionCuratedCard, ide: CuratedSotIde): Promise<void> {
  const servers = await ide.mcp.servers()
  const existing = servers.find((server) => server.name === card.id || server.name === card.title)
  await ide.mcp.upsert({
    id: existing?.id,
    name: card.id,
    transport: card.transport ?? "stdio",
    command: card.command,
    url: card.url,
    allowedResourceUris: [],
    modelVisibleTools: [],
    appOnlyTools: [],
    trusted: true,
    curatedPresetId: card.id
  })
}

async function addSkillCard(card: ExtensionCuratedCard, ide: CuratedSotIde): Promise<void> {
  const locator = card.locator?.trim()
  if (!locator) throw new Error("SOURCE_NOT_FOUND")
  const added = await ide.skills.sources.add({
    kind: "git",
    origin: locator,
    name: card.sourceName ?? card.title
  })
  if (typeof added?.id !== "string" || !added.id) throw new Error("SOURCE_NOT_FOUND")
  await ide.skills.sources.deploy({ sourceId: added.id })
}
