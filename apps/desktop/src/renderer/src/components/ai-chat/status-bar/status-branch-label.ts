/**
 * 底栏分支按钮写什么；返回 null 就整颗不画（mike P3，#163 巡检：非 Git 文件夹底栏写「未检出分支 / No branch」）。
 * - 还没查到（加载中 / 查失败）：不画，免得先闪一下「未检出分支」；
 * - 非 Git 文件夹：主进程回 { current: "", branches: [] } → 不画；
 * - Git 仓库：有当前分支写分支名；HEAD 游离（有分支但当前不在任何分支上）才写「未检出分支」。
 */
export function statusBranchLabel(
  data: { current?: string | null; branches?: ReadonlyArray<unknown> | null } | null | undefined,
  noBranchLabel: string
): string | null {
  if (!data) return null
  const current = data.current?.trim() ?? ""
  if (current) return current
  return (data.branches?.length ?? 0) > 0 ? noBranchLabel : null
}
