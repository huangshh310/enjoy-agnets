/** 安装日志只留短人话，不进 Electron。 */
export function sanitizeInstallLog(raw: string): string | null {
  const line = raw.trim().replace(/\s+/g, " ")
  if (!line) return null
  if (/^\s*at\s/.test(line)) return null
  if (/node_modules[\\/]/.test(line) && !/EACCES|EPERM|ENOTFOUND/i.test(line)) return null
  return line.slice(0, 160)
}
