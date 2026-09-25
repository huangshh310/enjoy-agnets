/**
 * 右栏「正在看的窗口」：最近一次观察的缩略图和控件名。没有观察不占位。
 */
import { useEffect, useState } from "react"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"

type View = {
  observationId: string
  appName: string
  elements: Array<{ id: string; role: string; name: string; clickable: boolean }>
  thumbnailDataUrl?: string
}

export function DesktopObservationView() {
  const t = useT()
  const [view, setView] = useState<View | null>(null)

  useEffect(() => {
    if (!hasIde()) return
    const load = () => {
      void getIde()
        .builtinTools.desktopView()
        .then((next: View | null) => setView(next))
        .catch(() => setView(null))
    }
    load()
    const timer = setInterval(load, 1500)
    return () => clearInterval(timer)
  }, [])

  if (!view) {
    return <p className="px-3 py-4 text-caption-1-medium text-text-tertiary">{t("chat.paneDesktopEmpty")}</p>
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-3">
      <p className="text-body-medium text-text-primary">{view.appName}</p>
      {view.thumbnailDataUrl ? (
        <img src={view.thumbnailDataUrl} alt={view.appName} className="max-h-40 w-full rounded-lg object-contain" />
      ) : null}
      <ul className="flex flex-col gap-1">
        {view.elements.slice(0, 40).map((item) => (
          <li key={item.id} className="truncate text-caption-1-medium text-text-secondary">
            {item.name}
            <span className="ml-1 text-text-tertiary">{item.role}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
