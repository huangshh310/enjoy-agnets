import { promises as fs } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { dialog } from "electron";
import type { AgentWorkspaceHost } from "@enjoy-agents/agent-core";
import { getDatabase } from "./database";
import { createId } from "./ids";
import { resolveInsideWorkspace, toWorkspaceRelative } from "./paths";
import { parseExecutableCommand, runExecutable, runGit } from "./command";
const IGNORED = new Set(["node_modules", ".git", "dist", "out", ".turbo", "coverage"]);

export type WorkspaceRecord = {
  id: string;
  name: string;
  rootPath: string;
};

export async function openWorkspace(pathHint?: string): Promise<WorkspaceRecord> {
  let rootPath = pathHint;
  if (!rootPath) {
    const picked = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"]
    });
    if (picked.canceled || !picked.filePaths[0]) {
      throw new Error("No workspace folder selected.");
    }
    rootPath = picked.filePaths[0];
  }

  const now = Date.now();
  const existing = getDatabase()
    .prepare("SELECT id, name, root_path as rootPath FROM workspaces WHERE root_path = ?")
    .get(rootPath) as WorkspaceRecord | undefined;
  if (existing) {
    getDatabase().prepare("UPDATE workspaces SET updated_at = ? WHERE id = ?").run(now, existing.id);
    return existing;
  }

  const record: WorkspaceRecord = {
    id: createId("ws"),
    name: basename(rootPath),
    rootPath
  };
  getDatabase()
    .prepare(
      "INSERT INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(record.id, record.name, record.rootPath, now, now);
  return record;
}

export async function listWorkspaces(): Promise<WorkspaceRecord[]> {
  return getDatabase()
    .prepare("SELECT id, name, root_path as rootPath FROM workspaces ORDER BY updated_at DESC")
    .all() as WorkspaceRecord[];
}

export async function getWorkspace(workspaceId: string): Promise<WorkspaceRecord> {
  const record = getDatabase()
    .prepare("SELECT id, name, root_path as rootPath FROM workspaces WHERE id = ?")
    .get(workspaceId) as WorkspaceRecord | undefined;
  if (!record) throw new Error(`Unknown workspace: ${workspaceId}`);
  return record;
}

export function createWorkspaceHost(workspaceRoot: string): AgentWorkspaceHost {
  return {
    readFile: async (relativePath) => {
      const absolute = resolveInsideWorkspace(workspaceRoot, relativePath);
      return fs.readFile(absolute, "utf8");
    },
    writeFile: async (relativePath, content) => {
      const absolute = resolveInsideWorkspace(workspaceRoot, relativePath);
      await fs.mkdir(dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, content, "utf8");
    },
    editFile: async (relativePath, oldText, newText) => {
      const absolute = resolveInsideWorkspace(workspaceRoot, relativePath);
      const current = await fs.readFile(absolute, "utf8");
      if (!current.includes(oldText)) {
        throw new Error(`oldText not found in ${relativePath}`);
      }
      const next = current.replace(oldText, newText);
      await fs.writeFile(absolute, next, "utf8");
      return next;
    },
    listDir: async (relativePath) => {
      const absolute = resolveInsideWorkspace(workspaceRoot, relativePath);
      const entries = await fs.readdir(absolute, { withFileTypes: true });
      return entries
        .filter((entry) => !IGNORED.has(entry.name))
        .map((entry) => ({
          name: entry.name,
          kind: entry.isDirectory() ? ("directory" as const) : ("file" as const)
        }));
    },
    glob: async (pattern) => collectFiles(workspaceRoot, pattern),
    grep: async (pattern, glob) => grepFiles(workspaceRoot, pattern, glob),
    bash: async (command) => {
      const parsed = parseExecutableCommand(command)
      return runExecutable(workspaceRoot, parsed.executable, parsed.args)
    },
    gitStatus: async () => (await runGit(workspaceRoot, ["status", "--porcelain"])).stdout,
    gitDiff: async (filePath) => {
      const args = filePath ? ["diff", "--", filePath] : ["diff"]
      return (await runGit(workspaceRoot, args)).stdout
    },
    gitCommit: async (message) => {
      const staged = await runGit(workspaceRoot, ["add", "-A"])
      if (staged.exitCode !== 0) {
        throw new Error(staged.stderr || "git add failed")
      }
      const committed = await runGit(workspaceRoot, ["commit", "-m", message])
      if (committed.exitCode !== 0) {
        throw new Error(committed.stderr || "git commit failed")
      }
      return committed.stdout
    }
  };
}

export async function readWorkspaceFile(workspaceId: string, relativePath: string) {
  const workspace = await getWorkspace(workspaceId);
  const absolute = resolveInsideWorkspace(workspace.rootPath, relativePath);
  return fs.readFile(absolute, "utf8");
}

export async function listWorkspaceDir(workspaceId: string, relativePath: string) {
  const workspace = await getWorkspace(workspaceId);
  const host = createWorkspaceHost(workspace.rootPath);
  const entries = await host.listDir(relativePath);
  return entries.map((entry) => ({
    ...entry,
    path: relativePath === "." ? entry.name : `${relativePath.replace(/\\/g, "/")}/${entry.name}`
  }));
}

export async function changedFiles(workspaceRoot: string) {
  const status = (await runGit(workspaceRoot, ["status", "--porcelain"])).stdout
  return status
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const code = line.slice(0, 2).trim();
      const filePath = line.slice(3).replace(/"/g, "");
      const statusMap: Record<string, "added" | "modified" | "deleted" | "untracked"> = {
        A: "added",
        M: "modified",
        D: "deleted",
        "??": "untracked"
      };
      return {
        path: filePath,
        status: statusMap[code] ?? "modified",
        additions: 0,
        deletions: 0
      };
    });
}

async function collectFiles(workspaceRoot: string, pattern: string): Promise<string[]> {
  const matcher = globToRegExp(pattern);
  const files: string[] = [];
  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED.has(entry.name)) continue;
      const absolute = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
        continue;
      }
      const relativePath = toWorkspaceRelative(workspaceRoot, absolute);
      if (matcher.test(relativePath)) files.push(relativePath);
    }
  }
  await walk(workspaceRoot);
  return files;
}

async function grepFiles(workspaceRoot: string, pattern: string, glob?: string) {
  const expression = new RegExp(pattern, "m");
  const files = await collectFiles(workspaceRoot, glob ?? "**/*");
  const matches: Array<{ path: string; line: number; text: string }> = [];
  for (const filePath of files) {
    if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".exe"].includes(extname(filePath))) {
      continue;
    }
    const absolute = resolveInsideWorkspace(workspaceRoot, filePath);
    let content = "";
    try {
      content = await fs.readFile(absolute, "utf8");
    } catch {
      continue;
    }
    content.split(/\r?\n/).forEach((text, index) => {
      if (expression.test(text)) {
        matches.push({ path: filePath, line: index + 1, text });
      }
    });
  }
  return matches;
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^$(){}|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, ":::DOUBLE:::")
    .replace(/\*/g, "[^/]*")
    .replace(/:::DOUBLE:::/g, ".*")
    .replace(/\?/g, "[^/]");
  return new RegExp(`^${escaped}$`);
}
