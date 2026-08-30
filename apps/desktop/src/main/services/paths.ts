import { isAbsolute, join, normalize, relative, resolve, sep } from "node:path";

export function resolveInsideWorkspace(workspaceRoot: string, candidate: string): string {
  const absolute = isAbsolute(candidate) ? normalize(candidate) : resolve(workspaceRoot, candidate);
  const relativePath = relative(workspaceRoot, absolute);
  if (relativePath.startsWith("..") || relativePath.startsWith(sep) || isAbsolute(relativePath)) {
    throw new Error(`Path escapes the workspace: ${candidate}`);
  }
  return absolute;
}

export function toWorkspaceRelative(workspaceRoot: string, absolutePath: string): string {
  return relative(workspaceRoot, absolutePath).split(sep).join("/");
}

export function joinWorkspace(workspaceRoot: string, relativePath: string): string {
  return join(workspaceRoot, relativePath);
}
