export type CanvasColorTheme = "light" | "dark";
export type CanvasBackgroundMode = "dots" | "lines" | "blank";

export const canvasThemes = {
    light: {
        canvas: {
            background: "#f8fafc",
            dot: "rgba(100,116,139,.22)",
            line: "rgba(100,116,139,.12)",
            selectionStroke: "#3b82f6",
            selectionFill: "rgba(59,130,246,.08)",
        },
        node: {
            label: "#475569",
            fill: "#ffffff",
            headerBg: "#f8fafc",
            panel: "#ffffff",
            stroke: "#e2e8f0",
            activeStroke: "#3b82f6",
            placeholder: "#94a3b8",
            text: "#0f172a",
            muted: "#64748b",
            faint: "#cbd5e1",
        },
        toolbar: {
            panel: "rgba(255,255,255,.95)",
            border: "#e2e8f0",
            item: "#64748b",
            itemHover: "#f1f5f9",
            activeBg: "#eff6ff",
            activeText: "#2563eb",
        },
    },
    dark: {
        canvas: {
            background: "#09090b",
            dot: "rgba(148,163,184,.18)",
            line: "rgba(148,163,184,.08)",
            selectionStroke: "#60a5fa",
            selectionFill: "rgba(96,165,250,.12)",
        },
        node: {
            label: "#cbd5e1",
            fill: "#18181b",
            headerBg: "#202024",
            panel: "#18181b",
            stroke: "#27272a",
            activeStroke: "#60a5fa",
            placeholder: "#71717a",
            text: "#f4f4f5",
            muted: "#a1a1aa",
            faint: "#52525b",
        },
        toolbar: {
            panel: "rgba(24,24,27,.95)",
            border: "#27272a",
            item: "#a1a1aa",
            itemHover: "#27272a",
            activeBg: "#1e293b",
            activeText: "#60a5fa",
        },
    },
} as const;

export type CanvasTheme = (typeof canvasThemes)[CanvasColorTheme];
