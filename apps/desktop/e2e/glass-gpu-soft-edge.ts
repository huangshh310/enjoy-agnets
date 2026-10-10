/**
 * 侧栏右缘 / 12px 缝：软件 GL 下不得画黄半环。
 */
import { expect, type Page } from "@playwright/test"
import { countHotYellowPixels } from "./png-ring-pixels"

export async function dumpSidebarEdgeStrip(window: Page) {
  return window.evaluate(() => {
    const dumpEl = (el: Element) => {
      const cs = getComputedStyle(el)
      const before = getComputedStyle(el, "::before")
      const after = getComputedStyle(el, "::after")
      return {
        tag: el.tagName.toLowerCase(),
        testid: el.getAttribute("data-testid") || "",
        className: String(el.className || "").slice(0, 180),
        bg: cs.backgroundColor,
        bgImage: cs.backgroundImage.slice(0, 180),
        shadow: cs.boxShadow.slice(0, 180),
        filter: cs.filter,
        backdrop: cs.backdropFilter,
        mask: String(cs.maskImage || cs.mask || "").slice(0, 100),
        opacity: cs.opacity,
        before: {
          content: before.content,
          bg: before.backgroundImage.slice(0, 140),
          filter: before.filter,
          shadow: before.boxShadow.slice(0, 80),
          opacity: before.opacity
        },
        after: {
          content: after.content,
          bg: after.backgroundImage.slice(0, 140),
          filter: after.filter,
          shadow: after.boxShadow.slice(0, 80)
        }
      }
    }
    const scaleX = window.innerWidth / 1920
    const scaleY = window.innerHeight / 1200
    const aside = document.querySelector("aside.rounded-3xl")
    const box = aside?.getBoundingClientRect()
    const ys = [220, 300, 380, 460].map((y) => Math.round(y * scaleY))
    const xs = [175, 185, 195].map((x) => Math.round(x * scaleX))
    const points: Array<{ x: number; y: number; where: string; chain: ReturnType<typeof dumpEl>[] }> = []
    for (const x of xs) {
      for (const y of ys) {
        points.push({ x, y, where: "jojo-strip", chain: document.elementsFromPoint(x, y).slice(0, 8).map(dumpEl) })
      }
    }
    if (box) {
      for (const y of ys) {
        points.push({
          x: Math.round(box.right - 3),
          y,
          where: "aside-edge",
          chain: document.elementsFromPoint(Math.round(box.right - 3), y).slice(0, 8).map(dumpEl)
        })
        points.push({
          x: Math.round(box.right + 6),
          y,
          where: "gutter",
          chain: document.elementsFromPoint(Math.round(box.right + 6), y).slice(0, 8).map(dumpEl)
        })
      }
    }
    const ambient = [...document.querySelectorAll(".skin-ambient-glow, .skin-ambient-orb")].map((el) => ({
      className: String(el.className),
      display: getComputedStyle(el).display,
      filter: getComputedStyle(el).filter
    }))
    const canvas = document.querySelector("[data-shell-canvas]")
    const frame = document.querySelector('[data-testid="window-frame"]')
    return {
      gpu: document.documentElement.dataset.gpuCompositing || "",
      viewport: { w: window.innerWidth, h: window.innerHeight },
      aside: box ? { x: box.x, y: box.y, w: box.width, right: box.right } : null,
      ambient,
      canvas: canvas ? dumpEl(canvas) : null,
      frame: frame ? dumpEl(frame) : null,
      body: dumpEl(document.body),
      points
    }
  })
}

export async function assertAmbientHidden(window: Page) {
  const dump = await dumpSidebarEdgeStrip(window)
  expect(dump.ambient.length, "ambient nodes").toBeGreaterThan(0)
  for (const layer of dump.ambient) {
    expect(layer.display, layer.className).toBe("none")
  }
  expect(opaque(dump.canvas?.bg)).toBeTruthy()
  expect(opaque(dump.frame?.bg)).toBeTruthy()
  expect(opaque(dump.body.bg)).toBeTruthy()
  return dump
}

export async function insideStripClip(window: Page) {
  return window.evaluate(() => {
    const scaleX = window.innerWidth / 1920
    const scaleY = window.innerHeight / 1200
    return {
      x: Math.max(0, Math.round(175 * scaleX)),
      y: Math.max(0, Math.round(220 * scaleY)),
      width: Math.max(20, Math.round(20 * scaleX)),
      height: Math.max(80, Math.round(240 * scaleY))
    }
  })
}

export async function edgeClip(window: Page) {
  return window.evaluate(() => {
    const aside = document.querySelector("aside.rounded-3xl")?.getBoundingClientRect()
    const scaleY = window.innerHeight / 1200
    return {
      x: Math.max(0, Math.round((aside?.right ?? 293) - 18)),
      y: Math.max(0, Math.round(200 * scaleY)),
      width: 40,
      height: Math.max(80, Math.round(280 * scaleY))
    }
  })
}

export async function assertInsideSidebarFlat(window: Page) {
  const dump = await dumpSidebarEdgeStrip(window)
  const inside = dump.points.filter((point) => point.where === "jojo-strip")
  expect(inside.length).toBe(12)
  for (const point of inside) {
    for (const el of point.chain) {
      expect(el.filter === "none" || !el.filter, `${point.x},${point.y} filter`).toBeTruthy()
      expect(el.backdrop === "none" || !el.backdrop, `${point.x},${point.y} backdrop`).toBeTruthy()
      expect(el.shadow === "none" || !el.shadow, `${point.x},${point.y} shadow`).toBeTruthy()
      expect(el.bgImage === "none" || !el.bgImage, `${point.x},${point.y} bgImage`).toBeTruthy()
      expect(el.before.bg === "none" || !el.before.bg, `${point.x},${point.y} ::before`).toBeTruthy()
      expect(el.after.bg === "none" || !el.after.bg, `${point.x},${point.y} ::after`).toBeTruthy()
    }
  }
  return dump
}

export async function sampleSidebarEdgeStrip(window: Page, label: string) {
  const clips = await window.evaluate(() => {
    const scaleX = window.innerWidth / 1920
    const scaleY = window.innerHeight / 1200
    const aside = document.querySelector("aside.rounded-3xl")?.getBoundingClientRect()
    const jojo = {
      name: "jojo-175-195",
      x: Math.max(0, Math.round(175 * scaleX)),
      y: Math.max(0, Math.round(220 * scaleY)),
      width: Math.max(20, Math.round(20 * scaleX)),
      height: Math.max(80, Math.round(240 * scaleY))
    }
    const gutter = aside
      ? {
          name: "gutter",
          x: Math.max(0, Math.round(aside.right - 2)),
          y: Math.max(0, Math.round(210 * scaleY)),
          width: 16,
          height: Math.max(80, Math.round(255 * scaleY))
        }
      : null
    return gutter ? [jojo, gutter] : [jojo]
  })
  for (const clip of clips) {
    const buf = await window.screenshot({ clip })
    expect(countHotYellowPixels(buf), `${label} ${clip.name} yellow`).toBe(0)
  }
}

export async function sendStubMessage(window: Page) {
  const composer = window.locator('[data-testid="composer-input"]')
  await composer.click()
  await composer.fill("hello")
  await composer.press("Enter")
  await window.waitForTimeout(900)
}

function opaque(bg?: string) {
  if (!bg) return false
  if (bg === "transparent" || bg.includes("rgba(0, 0, 0, 0)")) return false
  return true
}
