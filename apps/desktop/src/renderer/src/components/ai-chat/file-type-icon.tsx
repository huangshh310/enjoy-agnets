/**
 * 结构化文件类型微标（对标 monocode / VS Code Material Icon）。
 */
import { cx } from "@/utils/cx"

export function FileTypeIcon({
  name,
  size = 14,
  className
}: {
  name: string
  size?: number
  className?: string
}) {
  const lower = name.toLowerCase()
  const cls = cx("shrink-0", className)
  if (isTestFile(lower)) return <TestGlyph size={size} className={cls} />
  if (lower.endsWith(".tsx") || lower.endsWith(".jsx")) return <ReactGlyph size={size} className={cls} />
  if (lower.endsWith(".ts") || lower.endsWith(".mts") || lower.endsWith(".cts")) {
    return <TsGlyph size={size} className={cls} />
  }
  if (lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) {
    return <JsGlyph size={size} className={cls} />
  }
  if (lower.endsWith(".json")) return <MarkGlyph size={size} className={cls} fill="#f59e0b" label="{}" />
  if (lower.endsWith(".css") || lower.endsWith(".scss") || lower.endsWith(".less")) {
    return <MarkGlyph size={size} className={cls} fill="#6366f1" label="#" ink="#818cf8" />
  }
  if (lower.endsWith(".rs")) return <RustGlyph size={size} className={cls} />
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
    return <MarkGlyph size={size} className={cls} fill="#0284c7" label="M↓" ink="#38bdf8" />
  }
  if (lower.endsWith(".sh") || lower.endsWith(".bash") || lower.endsWith(".zsh")) {
    return <MarkGlyph size={size} className={cls} fill="#10b981" label="$_" />
  }
  return <DefaultGlyph size={size} className={cls} />
}

function isTestFile(lower: string): boolean {
  return (
    lower.endsWith(".test.ts") ||
    lower.endsWith(".spec.ts") ||
    lower.endsWith(".test.tsx") ||
    lower.endsWith(".spec.tsx") ||
    lower.endsWith(".test.js")
  )
}

function TestGlyph({ size, className }: { size: number; className: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M5 2.5h6M6.5 2.5v3.5L3.2 12.2A1.2 1.2 0 0 0 4.2 14h7.6a1.2 1.2 0 0 0 1-1.8L9.5 6V2.5"
        stroke="#38bdf8"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="11.5" r="1" fill="#38bdf8" />
      <circle cx="6" cy="10" r="0.75" fill="#38bdf8" />
    </svg>
  )
}

function ReactGlyph({ size, className }: { size: number; className: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <ellipse cx="8" cy="8" rx="6.5" ry="2.6" stroke="#06b6d4" strokeWidth="1.2" transform="rotate(30 8 8)" />
      <ellipse cx="8" cy="8" rx="6.5" ry="2.6" stroke="#06b6d4" strokeWidth="1.2" transform="rotate(90 8 8)" />
      <ellipse cx="8" cy="8" rx="6.5" ry="2.6" stroke="#06b6d4" strokeWidth="1.2" transform="rotate(150 8 8)" />
      <circle cx="8" cy="8" r="1.2" fill="#06b6d4" />
    </svg>
  )
}

function TsGlyph({ size, className }: { size: number; className: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <rect width="16" height="16" rx="2.5" fill="#3178c6" />
      <path
        d="M3.2 6.5h3.6M5 6.5v6M8.2 12.2c.8.4 1.8.5 2.5.1.7-.4.9-1.2.6-1.9-.3-.6-1.2-.9-1.8-1.2-.7-.3-1.4-.7-1.4-1.5 0-.9.7-1.5 1.7-1.5.8 0 1.5.3 2 .7M8.6 9.8c.8.4 2.2.7 2.2 1.8 0 .8-.7 1.2-1.6 1.2-.8 0-1.6-.3-2.1-.7"
        stroke="#ffffff"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function JsGlyph({ size, className }: { size: number; className: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <rect width="16" height="16" rx="2.5" fill="#f7df1e" />
      <path
        d="M5 9v2.8c0 .8-.5 1.2-1.3 1.2-.6 0-1.1-.3-1.4-.7M8.8 12.2c.8.4 1.8.5 2.5.1.7-.4.9-1.2.6-1.9-.3-.6-1.2-.9-1.8-1.2-.7-.3-1.4-.7-1.4-1.5 0-.9.7-1.5 1.7-1.5.8 0 1.5.3 2 .7"
        stroke="#1e1e1e"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function RustGlyph({ size, className }: { size: number; className: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <rect width="16" height="16" rx="2.5" fill="#ea580c" />
      <circle cx="8" cy="8" r="4.5" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 1.5" />
      <text x="8" y="10.8" textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="bold">
        R
      </text>
    </svg>
  )
}

function MarkGlyph({
  size,
  className,
  fill,
  label,
  ink
}: {
  size: number
  className: string
  fill: string
  label: string
  ink?: string
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <rect width="16" height="16" rx="2.5" fill={fill} fillOpacity="0.15" stroke={fill} strokeWidth="1" />
      <text x="8" y="11.5" textAnchor="middle" fill={ink ?? fill} fontSize="10" fontFamily="monospace" fontWeight="bold">
        {label}
      </text>
    </svg>
  )
}

function DefaultGlyph({ size, className }: { size: number; className: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <rect x="2.5" y="1.5" width="11" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" />
      <path d="M5.5 5.5h5M5.5 8.5h5M5.5 11.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.4" />
    </svg>
  )
}
