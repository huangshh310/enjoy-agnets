/**
 * 渲染崩溃人话：默认面只出短句，英文堆栈只进开发者档或 console。
 */
export const CRASH_FALLBACK_COPY = {
  zh: {
    title: "这里出了点问题。",
    reload: "重新加载"
  },
  en: {
    title: "This view hit a problem.",
    reload: "Reload"
  }
} as const

const STACK_LEAK = /Something went wrong!|Element type is invalid/i

export function crashFallbackCopy(locale: "zh" | "en" = "zh"): {
  title: string
  reload: string
} {
  return CRASH_FALLBACK_COPY[locale]
}

/** 默认面不把 error.message / stack 摊给用户；开发者档才回原文。 */
export function userFacingCrashDetail(error: unknown, isDev: boolean): string | null {
  if (!isDev) return null
  if (error instanceof Error) return error.stack ?? error.message
  if (error == null) return null
  return String(error)
}

export function logRendererCrash(
  error: unknown,
  info?: { componentStack?: string | null }
): void {
  console.error("[renderer-crash]", error, info?.componentStack ?? "")
}

export function crashFallbackLeaksEnglishStack(text: string): boolean {
  return STACK_LEAK.test(text)
}
