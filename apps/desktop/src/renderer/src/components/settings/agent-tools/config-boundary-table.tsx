/**
 * 配置归属：Key / CLI 登录 / MCP / Skills 各归谁，避免用户以为 Enjoy 密钥会传给 Cursor。
 */
import { useNavigate } from "@tanstack/react-router"
import { useT } from "@renderer/i18n"

const ROWS = [
  { id: "key", href: "/settings/$section", params: { section: "providers" } },
  { id: "login", href: "/settings/$section", params: { section: "agent" } },
  { id: "mcp", href: "/mcp" },
  { id: "skills", href: "/skills" }
] as const

export function ConfigBoundaryTable() {
  const t = useT()
  const navigate = useNavigate()
  return (
    <section className="flex flex-col gap-2.5">
      <div>
        <h3 className="text-body-medium font-semibold text-text-primary">{t("settings.boundary.title")}</h3>
        <p className="mt-0.5 text-caption-1-regular text-text-secondary">{t("settings.boundary.desc")}</p>
      </div>
      <div className="w-full overflow-x-auto rounded-xl border border-border-button-default">
        <table className="w-full min-w-[28rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-separator-border bg-background-secondary-default/60">
              <th className="px-3 py-2 text-caption-2-medium text-text-tertiary">{t("settings.boundary.colItem")}</th>
              <th className="px-3 py-2 text-caption-2-medium text-text-tertiary">{t("settings.boundary.colOwner")}</th>
              <th className="px-3 py-2 text-caption-2-medium text-text-tertiary">{t("settings.boundary.colGo")}</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.id} className="border-b border-separator-border/70 last:border-0">
                <td className="px-3 py-2.5 text-caption-1-medium text-text-primary">
                  {t(`settings.boundary.${row.id}`)}
                </td>
                <td className="px-3 py-2.5 text-caption-1-regular text-text-secondary">
                  {t(`settings.boundary.${row.id}Owner`)}
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      void navigate(
                        row.href === "/settings/$section"
                          ? { to: "/settings/$section", params: row.params }
                          : { to: row.href }
                      )
                    }
                    className="cursor-pointer text-caption-2-medium text-accent-600 hover:underline"
                  >
                    {t(`settings.boundary.${row.id}Go`)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
