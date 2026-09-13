/**
 * Settings → General：权限预设、界面语言、当前版本与检查更新。
 * 顶部看板与 Workspace / MCP 同构，下方仍是 SettingsCard 行。
 * 从智能体发现条进来时顶栏可返回，并滚到已有权限卡。
 */
import { useEffect } from "react"
import { useSearch } from "@tanstack/react-router"
import { classifyPermissionMode, type PermissionMode } from "@enjoy-agents/ipc-contract"
import { RiSettings4Line } from "@remixicon/react"
import { ApprovalDiscoverReturn } from "./approval-discover/approval-discover-return"
import {
  APPROVAL_PERMISSIONS_ANCHOR,
  parseApprovalDiscoverFrom
} from "./approval-discover/approval-discover-nav"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { useT, type TranslateFn } from "@renderer/i18n"
import { SettingsHub } from "./settings-hub"
import { SettingsNotificationsCard } from "./general/settings-notifications-card"
import { SettingsPermissions } from "./settings-permissions"
import { SettingsCard, SettingsRow } from "./settings-row"
import { SettingsUpdateCard } from "./settings-update-card"
import { parseSettingsSectionSearch } from "./settings-section-search"
import { usePrefUpdate } from "./settings-pref"

function permissionModeLabel(t: TranslateFn): Record<PermissionMode | "custom", string> {
  return {
    "allow-reads": t("common.permissionReads"),
    "allow-edits": t("common.permissionEdits"),
    "allow-all": t("common.permissionAll"),
    custom: t("common.permissionCustom")
  }
}

function languageLabel(t: TranslateFn): Record<"auto" | "en" | "zh", string> {
  return {
    auto: t("common.auto"),
    en: t("common.english"),
    zh: t("common.chinese")
  }
}

export function GeneralSettings() {
  const t = useT()
  const { preferences, update } = usePrefUpdate()
  const returnOrigin = parseApprovalDiscoverFrom(parseSettingsSectionSearch(useSearch({ strict: false })).from)
  const flags = {
    requireWriteApproval: preferences?.requireWriteApproval ?? true,
    requireBashApproval: preferences?.requireBashApproval ?? true,
    requireCommitApproval: preferences?.requireCommitApproval ?? true
  }
  const kind = classifyPermissionMode(flags)
  const language = preferences?.language ?? "zh"
  const modes = permissionModeLabel(t)
  const languages = languageLabel(t)
  const autoCount = [
    !flags.requireWriteApproval,
    !flags.requireBashApproval,
    !flags.requireCommitApproval
  ].filter(Boolean).length

  useEffect(() => {
    if (!returnOrigin) return
    document.getElementById(APPROVAL_PERMISSIONS_ANCHOR)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [returnOrigin])

  return (
    <div className="flex flex-col gap-6">
      {returnOrigin ? <ApprovalDiscoverReturn origin={returnOrigin} /> : null}
      <SettingsHub
        icon={RiSettings4Line}
        title={t("settings.general.hubTitle")}
        badge={modes[kind]}
        description={t("settings.general.hubDesc")}
        pulses={[
          { label: t("settings.general.permissionMode"), value: modes[kind] },
          {
            label: t("settings.general.autoRunFlags"),
            value: t("settings.general.autoRunValue", { count: autoCount }),
            tone: autoCount === 3 ? "warning" : autoCount === 0 ? "success" : "default"
          },
          { label: t("settings.language"), value: languages[language] }
        ]}
      />

      <SettingsPermissions flags={flags} onChange={(patch) => void update(patch)} />
      <SettingsNotificationsCard
        desktopPush={preferences?.desktopPush ?? true}
        approvalRequiredAlert={preferences?.approvalRequiredAlert ?? true}
        agentCompleteSound={preferences?.agentCompleteSound ?? true}
        onChange={(patch) => void update(patch)}
      />
      <LanguageCard language={language} onChange={(value) => void update({ language: value })} />
      <SettingsUpdateCard />
    </div>
  )
}

function LanguageCard({
  language,
  onChange
}: {
  language: "auto" | "en" | "zh"
  onChange: (value: "auto" | "en" | "zh") => void
}) {
  const t = useT()
  return (
    <SettingsCard title={t("nav.general")}>
      <SettingsRow title={t("settings.language")} description={t("settings.languageDesc")}>
        <Select value={language} onValueChange={(value) => onChange(value as "auto" | "en" | "zh")}>
          <SelectTrigger className="min-w-[9rem] rounded-2lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">{t("settings.detectAuto")}</SelectItem>
            <SelectItem value="en">{t("common.english")}</SelectItem>
            <SelectItem value="zh">{t("common.chinese")}</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>
    </SettingsCard>
  )
}
