/**
 * 企业中心页面壳：集成 SecondaryPageShell，分发 billing / details / integrations。
 */
import { useMemo } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { RiBankCardLine, RiBox3Line, RiSchoolLine } from "@remixicon/react"
import { SecondaryPageShell, type SecondaryNavGroup } from "@renderer/components/app-pages/secondary-page-shell"
import { useT } from "@renderer/i18n"
import { CompanyBillingSection } from "./company-billing-section"
import { CompanyDetailsSection } from "./company-details-section"
import { CompanyIntegrationsSection } from "./company-integrations-section"

export function CompanyPage() {
  const t = useT()
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { section?: string }
  const currentSection = params.section === "details" ? "details" : params.section === "integrations" ? "integrations" : "billing"

  const navGroups: SecondaryNavGroup[] = useMemo(
    () => [
      {
        id: "company_nav",
        label: t("chat.company") || "Company",
        items: [
          {
            id: "billing",
            label: "账单与订阅",
            icon: RiBankCardLine
          },
          {
            id: "details",
            label: "公司详情",
            icon: RiSchoolLine
          },
          {
            id: "integrations",
            label: "企业集成",
            icon: RiBox3Line
          }
        ]
      }
    ],
    [t]
  )

  function handleSelect(id: string) {
    void navigate({
      to: "/company/$section",
      params: { section: id }
    })
  }

  const breadcrumbName =
    currentSection === "details" ? "公司详情" : currentSection === "integrations" ? "企业集成" : "账单与订阅"

  return (
    <SecondaryPageShell
      searchPlaceholder="搜索商业与组织设置..."
      groups={navGroups}
      selectedId={currentSection}
      onSelect={handleSelect}
      contentWidth="wide"
      breadcrumbTitle={`企业中心 > ${breadcrumbName}`}
    >
      {currentSection === "details" ? (
        <CompanyDetailsSection />
      ) : currentSection === "integrations" ? (
        <CompanyIntegrationsSection />
      ) : (
        <CompanyBillingSection />
      )}
    </SecondaryPageShell>
  )
}
