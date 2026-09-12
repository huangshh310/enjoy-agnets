/**
 * Studio、知识库、媒体、MCP、工作流、可观测性、技能、工作区。
 * 自定义 / 自动化走 studio 域。
 */
import { zhInboxPages } from "./pages-inbox.ts"
import { zhKnowledgePages } from "./pages-knowledge.ts"
import { zhMediaPages } from "./pages-media.ts"
import { zhMcpPages } from "./pages-mcp.ts"
import { zhObservabilityPages } from "./pages-observability.ts"
import { zhWorkflowPages } from "./pages-workflows.ts"
import { zhAccountPages } from "./pages-account.ts"
import { zhSkillsPages } from "./pages-skills.ts"
import { zhWorkspacesPages } from "./pages-workspaces.ts"

export const zhPages = {
  studioTitle: "Agent Studio",
  knowledge: zhKnowledgePages,
  media: zhMediaPages,
  mcp: zhMcpPages,
  workflows: zhWorkflowPages,
  observability: zhObservabilityPages,
  inbox: zhInboxPages,
  account: zhAccountPages,
  skills: zhSkillsPages,
  workspaces: zhWorkspacesPages
}
