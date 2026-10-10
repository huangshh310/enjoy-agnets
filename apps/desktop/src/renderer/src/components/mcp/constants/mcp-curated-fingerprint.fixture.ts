/**
 * 精选指纹独立对照表。测试拿它比 presets / contract，禁止自己和自己比。
 */
export const CURATED_MCP_FINGERPRINT_FIXTURE = [
  { id: "filesystem", transport: "stdio", command: "npx -y @modelcontextprotocol/server-filesystem ." },
  { id: "everything", transport: "stdio", command: "npx -y @modelcontextprotocol/server-everything" },
  { id: "github", transport: "stdio", command: "npx -y @modelcontextprotocol/server-github" },
  { id: "postgres", transport: "stdio", command: "npx -y @modelcontextprotocol/server-postgres postgresql://localhost/mydb" },
  { id: "sqlite", transport: "stdio", command: "npx -y @modelcontextprotocol/server-sqlite --file ./app.db" },
  { id: "puppeteer", transport: "stdio", command: "npx -y @modelcontextprotocol/server-puppeteer" },
  { id: "brave-search", transport: "stdio", command: "npx -y @modelcontextprotocol/server-brave-search" },
  { id: "memory", transport: "stdio", command: "npx -y @modelcontextprotocol/server-memory" },
  { id: "docker", transport: "stdio", command: "npx -y @modelcontextprotocol/server-docker" },
  { id: "redis", transport: "stdio", command: "npx -y @modelcontextprotocol/server-redis redis://localhost:6379" },
  { id: "gitlab", transport: "stdio", command: "npx -y @modelcontextprotocol/server-gitlab" },
  { id: "slack", transport: "stdio", command: "npx -y @modelcontextprotocol/server-slack" },
  { id: "notion", transport: "stdio", command: "npx -y @modelcontextprotocol/server-notion" },
  { id: "linear", transport: "stdio", command: "npx -y @modelcontextprotocol/server-linear" },
  { id: "sentry", transport: "stdio", command: "npx -y @modelcontextprotocol/server-sentry" },
  { id: "fetch", transport: "stdio", command: "npx -y @modelcontextprotocol/server-fetch" },
  { id: "sequential-thinking", transport: "stdio", command: "npx -y @modelcontextprotocol/server-sequential-thinking" },
  { id: "git", transport: "stdio", command: "npx -y @modelcontextprotocol/server-git" },
  { id: "mysql", transport: "stdio", command: "npx -y @modelcontextprotocol/server-mysql mysql://root@localhost/db" },
  { id: "playwright", transport: "stdio", command: "npx -y @modelcontextprotocol/server-playwright" }
] as const
