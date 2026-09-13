/**
 * 解析远程工作区标签 (e.g. "ubuntu@152.32.225.119:/home/ubuntu/workspace")
 * 提取主机 endpoint 与远端路径 path
 */

export interface ParsedRemoteLabel {
  endpoint: string
  path: string
}

export function parseRemoteLabel(label?: string | null): ParsedRemoteLabel {
  if (!label || !label.trim()) {
    return { endpoint: "", path: "" }
  }
  const trimmed = label.trim()
  const colonSlashIdx = trimmed.indexOf(":/")
  if (colonSlashIdx !== -1) {
    return {
      endpoint: trimmed.slice(0, colonSlashIdx),
      path: trimmed.slice(colonSlashIdx + 1)
    }
  }
  const colonIdx = trimmed.indexOf(":")
  if (colonIdx > 0) {
    return {
      endpoint: trimmed.slice(0, colonIdx),
      path: trimmed.slice(colonIdx + 1)
    }
  }
  if (trimmed.startsWith("/") || trimmed.startsWith("~")) {
    return {
      endpoint: "",
      path: trimmed
    }
  }
  return {
    endpoint: trimmed,
    path: ""
  }
}
