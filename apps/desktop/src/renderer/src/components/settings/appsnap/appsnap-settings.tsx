/**
 * 设置 → AppSnap。macOS 才能截其它窗口。开关关着时 main 不登记全局快捷键。
 */
import { useCallback, useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { AppsnapDoctor } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useT } from "@renderer/i18n"
import { patchPreferences, useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { getIde, hasIde } from "@renderer/lib/ide"
import { SettingsCard, SettingsRow } from "../settings-row"
import { KeybindingKeys } from "../keybindings/keybinding-keys"
import { AppsnapRecorder } from "./appsnap-recorder"
import { playShutter } from "./appsnap-sound"

export function AppsnapSettings() {
  const t = useT()
  const queryClient = useQueryClient()
  const { data } = useSettingsSnapshot()
  const prefs = data?.preferences
  const [doctor, setDoctor] = useState<AppsnapDoctor | null>(null)
  const [recording, setRecording] = useState(false)
  const [notice, setNotice] = useState("")

  const refresh = useCallback(async () => {
    if (!hasIde()) return
    setDoctor((await getIde().appsnap.doctor()) as AppsnapDoctor)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const mac = doctor?.platform === "darwin"
  const chord = prefs?.appsnapChord ?? "alt.left+alt.right"

  async function save(patch: Parameters<typeof patchPreferences>[0]) {
    setNotice("")
    await patchPreferences(patch)
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsCard>
        <SettingsRow title={t("settings.appsnap.switchTitle")} description={mac ? t("settings.appsnap.switchDesc") : t("settings.appsnap.unavailable")}>
          <Switch
            checked={Boolean(prefs?.appsnapEnabled) && mac}
            disabled={!mac}
            onCheckedChange={(value) => void save({ appsnapEnabled: value })}
            aria-label={t("settings.appsnap.switchTitle")}
          />
        </SettingsRow>
        {mac ? (
          <SettingsRow title={t("settings.appsnap.chord")} description={t("settings.appsnap.destination")}>
            {recording ? (
              <AppsnapRecorder
                baseline={JSON.stringify(chord)}
                onSave={(next) => {
                  setRecording(false)
                  void save({ appsnapChord: next })
                }}
                onCancel={() => setRecording(false)}
              />
            ) : (
              <button type="button" className="flex items-center gap-2" onClick={() => setRecording(true)}>
                <KeybindingKeys chord={chord} />
              </button>
            )}
          </SettingsRow>
        ) : null}
      </SettingsCard>
      {mac ? (
        <SettingsCard title={t("settings.appsnap.sound")}>
          <SettingsRow title={t("settings.appsnap.sound")} description={t("settings.appsnap.soundDesc")}>
            <div className="flex items-center gap-2">
              <Switch
                checked={prefs?.appsnapSound !== false}
                onCheckedChange={(value) => void save({ appsnapSound: value })}
                aria-label={t("settings.appsnap.sound")}
              />
              <Button variant="outline" size="sm" onClick={() => playShutter()}>
                {t("settings.appsnap.previewSound")}
              </Button>
            </div>
          </SettingsRow>
          <div className="flex flex-col gap-3 px-5 py-4">
            <AppsnapAccess doctor={doctor} />
            <Button variant="outline" size="sm" className="self-start" onClick={() => void refresh()}>
              {t("settings.appsnap.recheck")}
            </Button>
            {notice ? <p className="text-caption-2-medium text-destructive">{notice}</p> : null}
          </div>
        </SettingsCard>
      ) : null}
    </div>
  )
}

function AppsnapAccess({ doctor }: { doctor: AppsnapDoctor | null }) {
  const t = useT()
  if (!doctor) return <p className="text-caption-1-medium text-text-secondary">{t("settings.computerUse.checking")}</p>
  if (!doctor.helperSigned) {
    return <p className="text-caption-1-medium text-text-secondary">{t("settings.appsnap.unsigned")}</p>
  }
  return (
    <div className="flex flex-col gap-3">
      <GrantRow
        title={t("settings.builtinTools.screenCapture")}
        granted={doctor.screenCapture === true}
        onOpen={() => void getIde().builtinTools.openSystemPermission({ permission: "screenCapture" })}
      />
      <GrantRow
        title={t("settings.computerUse.inputMonitoring")}
        granted={doctor.inputMonitoring === true}
        onOpen={() => void getIde().builtinTools.openSystemPermission({ permission: "inputMonitoring" })}
      />
    </div>
  )
}

function GrantRow({ title, granted, onOpen }: { title: string; granted: boolean; onOpen: () => void }) {
  const t = useT()
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-body-medium text-text-primary">{title}</p>
      <div className="flex items-center gap-3">
        <span className="text-caption-2-medium text-text-tertiary">
          {t(granted ? "settings.builtinTools.granted" : "settings.builtinTools.notGranted")}
        </span>
        <Button variant="outline" size="sm" onClick={onOpen}>
          {t("settings.builtinTools.openSettings")}
        </Button>
      </div>
    </div>
  )
}


