/**
 * Studio、知识库、媒体、MCP、工作流、可观测性。
 * 自定义 / 自动化走 studio 域。
 */
import { zhKnowledgePages } from "./pages-knowledge.ts"
import { zhMediaPages } from "./pages-media.ts"
import { zhMcpPages } from "./pages-mcp.ts"
import { zhObservabilityPages } from "./pages-observability.ts"
import { zhWorkflowPages } from "./pages-workflows.ts"

export const zhPages = {
  studioTitle: "Agent Studio",
  knowledge: zhKnowledgePages,
  media: zhMediaPages,
  mcp: zhMcpPages,
  workflows: zhWorkflowPages,
  observability: zhObservabilityPages
}
