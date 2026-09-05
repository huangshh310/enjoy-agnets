/**
 * skills.sh (The Open Agent Skills Ecosystem) 集市数据抓取与缓存服务。
 * 解析全网榜单技能套件，提供 12 小时本地落盘缓存与 100% 离线优雅降级。
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { CuratedSkillSource } from "@enjoy-agents/ipc-contract"
import { CURATED_SKILL_SOURCES } from "./source-curated.ts"



function parseInstallsToNumber(installs: string): number {
  const clean = installs.trim().toUpperCase()
  if (clean.endsWith("M")) {
    return Math.round(parseFloat(clean) * 1000)
  }
  if (clean.endsWith("K")) {
    return Math.round(parseFloat(clean))
  }
  const n = parseInt(clean.replace(/,/g, ""), 10)
  return isNaN(n) ? 100 : n
}

function inferCategory(repo: string, skills: string[]): string {
  const text = `${repo} ${skills.join(" ")}`.toLowerCase()
  if (text.includes("design") || text.includes("ui") || text.includes("ux") || text.includes("taste") || text.includes("css")) {
    return "design"
  }
  if (text.includes("video") || text.includes("image") || text.includes("music") || text.includes("media") || text.includes("article")) {
    return "content"
  }
  if (text.includes("azure") || text.includes("cloud") || text.includes("browser") || text.includes("git") || text.includes("tool")) {
    return "utility"
  }
  return "engineering"
}

export function parseSkillsShHtml(html: string): CuratedSkillSource[] {
  const regex = /<a[^>]*href="\/([a-zA-Z0-9_\-.]+\/[a-zA-Z0-9_\-.]+\/[a-zA-Z0-9_\-.]+)"[^>]*>([\s\S]*?)<\/a>/g
  let match: RegExpExecArray | null = null
  const repoMap = new Map<string, {
    owner: string
    repo: string
    locator: string
    topRank: number
    topInstalls: string
    skills: string[]
  }>()

  while ((match = regex.exec(html)) !== null) {
    const fullPath = match[1]
    const parts = fullPath.split("/")
    if (parts.length < 3) continue
    const [owner, repo, skillName] = parts
    const locator = `${owner}/${repo}`
    const innerText = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    const tokens = innerText.split(" ")
    const rank = parseInt(tokens[0], 10) || 999
    const installs = tokens.at(-1) || "0"

    if (!repoMap.has(locator)) {
      repoMap.set(locator, {
        owner,
        repo,
        locator,
        topRank: rank,
        topInstalls: installs,
        skills: []
      })
    }
    const current = repoMap.get(locator)!
    if (!current.skills.includes(skillName)) {
      current.skills.push(skillName)
    }
    if (rank < current.topRank) {
      current.topRank = rank
      current.topInstalls = installs
    }
  }

  const result: CuratedSkillSource[] = []
  const sortedRepos = [...repoMap.values()].sort((a, b) => a.topRank - b.topRank)

  for (const item of sortedRepos) {
    // 检查是否已有内置高质量中文翻译预设
    const existingPreset = CURATED_SKILL_SOURCES.find(
      (p) => p.locator.toLowerCase() === item.locator.toLowerCase()
    )

    if (existingPreset) {
      // 在保留中文介绍的前提下更新技能数与排行榜特色
      result.push({
        ...existingPreset,
        skillCount: Math.max(existingPreset.skillCount ?? 0, item.skills.length),
        featuredSkills: [...new Set([...existingPreset.featuredSkills, ...item.skills])].slice(0, 6)
      })
      continue
    }

    const id = `${item.owner.toLowerCase()}-${item.repo.toLowerCase()}`
    const title = `${item.repo.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`
    const category = inferCategory(item.repo, item.skills)

    result.push({
      id,
      name: item.locator,
      title,
      author: `@${item.owner}`,
      locator: item.locator,
      description: `skills.sh 开源榜 Top ${item.topRank} · 累计安装 ${item.topInstalls} · 包含 ${item.skills.length} 项 Agent 核心技能。`,
      category,
      tags: ["#Community", "#Skills.sh", `#${category.toUpperCase()}`],
      stars: parseInstallsToNumber(item.topInstalls),
      skillCount: item.skills.length,
      featuredSkills: item.skills.slice(0, 5)
    })
  }

  return result
}

export async function fetchSkillsMarket(cacheDir?: string): Promise<CuratedSkillSource[]> {
  const cachePath = cacheDir ? join(cacheDir, "skills-sh-market-cache.json") : null

  // 1. 尝试从本地缓存读取（12小时 TTL）
  if (cachePath && existsSync(cachePath)) {
    try {
      const raw = readFileSync(cachePath, "utf-8")
      const parsed = JSON.parse(raw) as { timestamp: number; data: CuratedSkillSource[] }
      const ageHours = (Date.now() - parsed.timestamp) / (1000 * 60 * 60)
      if (ageHours < 12 && Array.isArray(parsed.data) && parsed.data.length > 0) {
        return parsed.data
      }
    } catch {
      // 忽略损坏缓存
    }
  }

  // 2. 发起远端拉取（限时 4s，绝不卡死）
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const res = await fetch("https://www.skills.sh/", {
      headers: { "User-Agent": "EnjoyAgents/1.0 (Desktop)" },
      signal: controller.signal
    })
    clearTimeout(timer)

    if (res.ok) {
      const html = await res.text()
      const parsed = parseSkillsShHtml(html)
      if (parsed.length > 0) {
        // 合并未在 skills.sh 前排出现的本地经典预设（如宝玉创作套件等）
        const merged = [...parsed]
        for (const preset of CURATED_SKILL_SOURCES) {
          if (!merged.some((m) => m.locator.toLowerCase() === preset.locator.toLowerCase())) {
            merged.push(preset)
          }
        }

        // 写回缓存
        if (cachePath) {
          try {
            writeFileSync(cachePath, JSON.stringify({ timestamp: Date.now(), data: merged }, null, 2))
          } catch {
            // 忽略写入失败
          }
        }
        return merged
      }
    }
  } catch {
    // 离线或超时优雅降级
  }

  // 3. 兜底回落至本地静态预设
  return CURATED_SKILL_SOURCES
}
