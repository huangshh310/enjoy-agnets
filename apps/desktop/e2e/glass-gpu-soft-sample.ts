/**
 * SwiftShader 发射下：主栏 / 侧栏 painter dump + 平坦底板采样。
 */
import { expect, type Page } from "@playwright/test"
import { countGreyRingPixels, countHotYellowPixels, luminanceStats } from "./png-ring-pixels"

const MAX_STDDEV = 6
const MAX_RANGE = 22

export async function dumpMainSidebarPainters(window: Page) {
  return window.evaluate(() => {
    const dumpPoint = (x: number, y: number) =>
      document.elementsFromPoint(x, y).slice(0, 10).map((el) => {
        const cs = getComputedStyle(el)
        const before = getComputedStyle(el, "::before")
        const after = getComputedStyle(el, "::after")
        return {
          tag: el.tagName.toLowerCase(),
          testid: el.getAttribute("data-testid") || "",
          className: String(el.className || "").slice(0, 180),
          filter: cs.filter,
          backdrop: cs.backdropFilter,
          bg: cs.backgroundColor,
          bgImage: cs.backgroundImage.slice(0, 200),
          before: {
            content: before.content,
            display: before.display,
            bg: before.backgroundImage.slice(0, 180),
            opacity: before.opacity
          },
          after: { content: after.content, filter: after.filter }
        }
      })
    const layers = [...document.querySelectorAll(
      ".skin-glass-orbs, .skin-glass-orb, .skin-glass-mesh-gradient, .skin-glass-preview-orb"
    )].map((el) => {
      const cs = getComputedStyle(el)
      return { className: String(el.className), display: cs.display, filter: cs.filter }
    })
    const main = document.querySelector("main")
    const aside = document.querySelector("aside.rounded-3xl")
    const shell = (node: Element | null) => {
      if (!node) return null
      const cs = getComputedStyle(node)
      const before = getComputedStyle(node, "::before")
      return {
        bg: cs.backgroundColor,
        before: before.content,
        beforeBg: before.backgroundImage.slice(0, 160)
      }
    }
    return {
      gpu: document.documentElement.dataset.gpuCompositing || "",
      liquid: Boolean(document.getElementById("skin-liquid-glass")),
      layers,
      main: shell(main),
      aside: shell(aside),
      p450_480: dumpPoint(450, 480),
      p230_560: dumpPoint(230, 560)
    }
  })
}

export async function assertSoftwareLayersHidden(window: Page) {
  const state = await dumpMainSidebarPainters(window)
  expect(state.layers.length, "orb/mesh nodes").toBeGreaterThan(0)
  for (const layer of state.layers) {
    expect(layer.display, layer.className).toBe("none")
  }
  expect(state.main?.before === "none" || state.main?.before === "").toBeTruthy()
  expect(state.aside?.before === "none" || state.aside?.before === "").toBeTruthy()
  expect(state.main?.beforeBg === "none" || !state.main?.beforeBg).toBeTruthy()
  expect(state.aside?.beforeBg === "none" || !state.aside?.beforeBg).toBeTruthy()
  expect(opaqueFill(state.main?.bg)).toBeTruthy()
  expect(opaqueFill(state.aside?.bg)).toBeTruthy()
  return state
}

export async function sampleColumnPatches(window: Page, mode: "light" | "dark") {
  const clips = await columnClips(window)
  for (const clip of clips) {
    const buf = await window.screenshot({ clip })
    const stats = luminanceStats(buf)
    expect(stats.stddev, `${mode} ${clip.name} stddev`).toBeGreaterThanOrEqual(0)
    expect(stats.stddev, `${mode} ${clip.name} stddev`).toBeLessThan(MAX_STDDEV)
    expect(stats.range, `${mode} ${clip.name} range`).toBeLessThan(MAX_RANGE)
    expect(countHotYellowPixels(buf), `${mode} ${clip.name} yellow`).toBe(0)
    if (mode === "dark") {
      const area = clip.width * clip.height
      expect(countGreyRingPixels(buf) / area, `${mode} ${clip.name} grey`).toBeLessThan(0.02)
    }
  }
}

async function columnClips(window: Page) {
  return window.evaluate(() => {
    const size = 72
    const main = document.querySelector("main")
    const aside = document.querySelector("aside.rounded-3xl")
    const cluster = document.querySelector("main .max-w-3xl")
    const mainBox = main?.getBoundingClientRect()
    const asideBox = aside?.getBoundingClientRect()
    const clusterBox = cluster?.getBoundingClientRect()
    const chrome = "button, input, textarea, a, img, svg, [role='button'], p, h1, h2, h3, label, li, [data-testid='composer-input'], [data-testid='sidebar-session-row']"
    const empty = (cx: number, cy: number, box?: DOMRect) => {
      const x = Math.round(cx - size / 2)
      const y = Math.round(cy - size / 2)
      const points = [
        [x + 8, y + 8],
        [x + size / 2, y + size / 2],
        [x + size - 8, y + size - 8],
        [x + size / 2, y + 8],
        [x + 8, y + size / 2]
      ]
      const inside = !box || (
        x >= box.x + 12 &&
        y >= box.y + 12 &&
        x + size <= box.x + box.width - 12 &&
        y + size <= box.y + box.height - 12
      )
      if (!inside) return null
      const clean = points.every(([px, py]) => {
        const el = document.elementFromPoint(px, py)
        return Boolean(el && !el.closest(chrome))
      })
      return clean ? { x: Math.max(0, x), y: Math.max(0, y), width: size, height: size } : null
    }
    const scan = (box: DOMRect | undefined, preferred: Array<[number, number]>, fallback: [number, number]) => {
      for (const [cx, cy] of preferred) {
        const hit = empty(cx, cy, box)
        if (hit) return hit
      }
      if (!box) return { x: Math.max(0, fallback[0] - size / 2), y: Math.max(0, fallback[1] - size / 2), width: size, height: size }
      for (let y = box.y + 24; y <= box.bottom - size - 24; y += 28) {
        for (let x = box.x + 24; x <= box.right - size - 24; x += 28) {
          const hit = empty(x + size / 2, y + size / 2, box)
          if (hit) return hit
        }
      }
      return { x: Math.max(0, fallback[0] - size / 2), y: Math.max(0, fallback[1] - size / 2), width: size, height: size }
    }
    const aboveY = clusterBox && mainBox ? (mainBox.y + clusterBox.y) / 2 : 480
    const belowY = clusterBox ? clusterBox.bottom + 48 : 640
    const midX = mainBox ? mainBox.x + mainBox.width * 0.42 : 450
    return [
      { name: "main-welcome", ...scan(mainBox, [[450, 480], [midX, aboveY]], [450, 480]) },
      { name: "main-below-chips", ...scan(mainBox, [[midX, belowY], [midX, aboveY + 40]], [450, 360]) },
      { name: "sidebar-lower", ...scan(asideBox, [[230, 560], [asideBox ? asideBox.x + 36 : 80, asideBox ? asideBox.bottom - 90 : 560]], [230, 560]) }
    ]
  })
}

function opaqueFill(bg?: string) {
  if (!bg) return false
  if (bg === "transparent" || bg.includes("rgba(0, 0, 0, 0)")) return false
  if (/\/\s*0?\.26\s*\)/.test(bg)) return false
  return true
}
