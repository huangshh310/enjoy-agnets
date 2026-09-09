/**
 * OMP 供应商 id / 展示名：截断与 Title Case，禁止把密钥当 label。
 */

export const OMP_PROVIDER_ID_RE = /^[a-zA-Z][a-zA-Z0-9._:-]{0,62}$/

export function clipCliLabel(text: string): string {
  return text.length > 80 ? `${text.slice(0, 79)}…` : text
}

export function formatOmpProviderLabel(id: string): string {
  return id
    .split(/[-_.]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
