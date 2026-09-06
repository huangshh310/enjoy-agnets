/**
 * 改动条顶边只养一只 8×8 像素猫：# 上色、. 透明。两帧换嘴/腿。
 */
const GRID = 8

type MascotRows = readonly string[]

export type SessionMascot = {
  name: "cat"
  restPath: string
  talkPath: string
}

const CAT_REST: MascotRows = [
  ".#....#.",
  ".##..##.",
  "########",
  "#.####.#",
  "########",
  "###..###",
  ".######.",
  "..#..#.."
]

const CAT_TALK: MascotRows = [
  ".#....#.",
  ".##..##.",
  "########",
  "#.####.#",
  "########",
  "########",
  ".######.",
  ".#....#."
]

function mascotPath(rows: MascotRows): string {
  let path = ""
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      if (row[x] !== "#") {
        x += 1
        continue
      }
      let run = 1
      while (row[x + run] === "#") run += 1
      path += `M${x} ${y}h${run}v1h-${run}z`
      x += run
    }
  })
  return path
}

export const SESSION_CAT: SessionMascot = {
  name: "cat",
  restPath: mascotPath(CAT_REST),
  talkPath: mascotPath(CAT_TALK)
}

export const COIN_FACE_PATH = mascotPath([
  "........",
  "..####..",
  ".######.",
  "########",
  "########",
  ".######.",
  "..####..",
  "........"
])

export const COIN_EDGE_PATH = mascotPath([
  "........",
  "...##...",
  "...##...",
  "...##...",
  "...##...",
  "...##...",
  "...##...",
  "........"
])

export const STAR_FACE_PATH = mascotPath([
  "...##...",
  "...##...",
  "..####..",
  "########",
  "########",
  "..####..",
  "...##...",
  "...##..."
])

export const STAR_EDGE_PATH = mascotPath([
  "........",
  "...##...",
  "...##...",
  "........",
  "........",
  "...##...",
  "...##...",
  "........"
])

export const MASCOT_GRID = GRID
