/**
 * 官方 login argv。OMP 必须带供应商，禁止无参打开交互选择器。
 */

const PROVIDER_RE = /^[a-zA-Z][a-zA-Z0-9._:-]{0,62}$/

export function resolveLoginArgv(
  id: string,
  provider?: string,
  catalogArgs: readonly string[] = []
): { ok: true; args: string[] } | { ok: false; message: string } {
  if (id === "omp") {
    const slug = provider?.trim() ?? ""
    if (!PROVIDER_RE.test(slug)) {
      return { ok: false, message: "Pick an Oh My Pi provider to log in." }
    }
    return { ok: true, args: ["auth-broker", "login", slug] }
  }
  if (!catalogArgs.length) {
    return { ok: false, message: "This CLI has no login command." }
  }
  return { ok: true, args: [...catalogArgs] }
}
