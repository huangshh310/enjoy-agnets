/**
 * Studio, knowledge, media, MCP, workflows, observability, skills, workspaces.
 * Customize / automations live in the studio domain.
 */
import { enInboxPages } from "./pages-inbox.ts"
import { enKnowledgePages } from "./pages-knowledge.ts"
import { enMediaPages } from "./pages-media.ts"
import { enMcpPages } from "./pages-mcp.ts"
import { enObservabilityPages } from "./pages-observability.ts"
import { enWorkflowPages } from "./pages-workflows.ts"
import { enAccountPages } from "./pages-account.ts"
import { enSkillsPages } from "./pages-skills.ts"
import { enWorkspacesPages } from "./pages-workspaces.ts"
import { enExtensionsPages } from "./pages-extensions.ts"

export const enPages = {
  studioTitle: "Agent Studio",
  knowledge: enKnowledgePages,
  media: enMediaPages,
  mcp: enMcpPages,
  workflows: enWorkflowPages,
  observability: enObservabilityPages,
  inbox: enInboxPages,
  account: enAccountPages,
  skills: enSkillsPages,
  workspaces: enWorkspacesPages,
  extensions: enExtensionsPages
}
