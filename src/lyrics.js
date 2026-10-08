/**
 * lyrics.js — 歌词 / 字幕文件解析与类型识别（纯前端）
 * 支持：.lrc（逐行时间轴歌词）、.ass / .ssa、.srt、.txt
 * 返回：{ type, text }  text 为拼接后的歌词文本，供音节计数
 */

/** 提取一行文本里的时间轴标签（LRC）剩余部分 */
function stripLrcTimestamps(line) {
  // 去掉所有 [mm:ss.xx] / <mm:ss.xx> 等时间轴标签（含行内交错的多时间戳）
  const re = /[\[<]\d{1,2}:\d{1,2}(?:[.:]\d{1,3})?[\]>]/g
  const text = line.replace(re, '')
  return { text, cleaned: text !== line }
}

function parseLrc(content) {
  const lines = content.split(/\r?\n/)
  const parts = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const { text } = stripLrcTimestamps(line)
    // 过滤元数据行如 [ti:][ar:] 等
    if (/^\[[a-zA-Z]+:/.test(text)) continue
    const t = text.trim()
    if (t) parts.push(t)
  }
  // 若完全无法拆出歌词，则按整行处理
  const text = parts.join('\n') || content.trim()
  return { type: 'lrc', text }
}

function parseAss(content) {
  const lines = content.split(/\r?\n/)
  const parts = []
  for (const raw of lines) {
    const line = raw.trim()
    // ASS 对白行：Dialogue: Layer,Start,End,Style,Name,ML,MR,MV,Effect,Text
    if (!/^Dialogue:/i.test(line)) continue
    // 去掉前导 "Dialogue:"
    const body = line.replace(/^Dialogue:/i, '')
    // 文本是第 10 个字段（前 9 个逗号后），用 limit 拆分保留剩余
    const fields = body.split(',')
    if (fields.length < 10) continue
    // 前面 9 个字段可能含逗号（少见），安全取前 9 个后合并剩余
    const text = fields.slice(9).join(',').trim()
    // 去掉 ASS 覆盖标签 {\...}
    const clean = text.replace(/\{[^}]*\}/g, '').replace(/\\[Nn]/g, '\n').trim()
    if (clean) parts.push(clean)
  }
  if (!parts.length) return null
  return { type: 'ass', text: parts.join('\n') }
}

function parseSrt(content) {
  const blocks = content.split(/\r?\n\r?\n|\r?\n\n/)
  const parts = []
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (!lines.length) continue
    // 首行是序号（数字），次行是时间轴 -->，其后为字幕文本
    let start = 0
    if (/^\d+$/.test(lines[0])) start = 1
    if (start < lines.length && lines[start].includes('-->')) start += 1
    const text = lines.slice(start).join(' ').trim()
    if (text) parts.push(text)
  }
  if (!parts.length) return null
  return { type: 'srt', text: parts.join('\n') }
}

/** 内容特征识别：优先扩展名，其次按内容特征 */
function detectTypeByContent(content, ext) {
  if (ext === 'lrc') return 'lrc'
  if (ext === 'ass' || ext === 'ssa') return 'ass'
  if (ext === 'srt') return 'srt'
  if (ext === 'txt' || ext === '') {
    if (/Dialogue:/i.test(content)) return 'ass'
    if (/^\s*\d+\s*$[\s\S]*-->/.test(content)) return 'srt'
    if (/^\s*[\[<]\d{1,2}:\d{1,2}(?:[.:]\d+)?[\]>]/.test(content)) return 'lrc'
    return 'txt'
  }
  // 未知扩展名 → 按内容
  if (/Dialogue:/i.test(content)) return 'ass'
  if (/-->/.test(content)) return 'srt'
  if (/^\s*[\[<]\d{1,2}:\d{1,2}(?:[.:]\d+)?[\]>]/.test(content)) return 'lrc'
  return 'txt'
}

/**
 * 解析歌词/字幕文件
 * @param {string} fileName 文件名（用于取扩展名）
 * @param {string} content 文件内容
 * @returns {{type:string,text:string}|null}
 */
export function parseLyricFile(fileName, content) {
  const base = fileName || ''
  const ext = (base.split('.').pop() || '').toLowerCase()
  const type = detectTypeByContent(content, ext)

  if (type === 'ass') {
    const r = parseAss(content)
    if (r) return r
  }
  if (type === 'srt') {
    const r = parseSrt(content)
    if (r) return r
  }
  if (type === 'lrc') {
    const r = parseLrc(content)
    return r
  }
  // txt 或解析失败：去掉可能的时间轴标签后作为纯文本
  return { type: 'txt', text: stripTimestampsAny(content).trim() }
}

/** 通用去除时间轴标签（全文，用于 txt/混合内容或分析前预处理） */
export function stripTimestampsAny(content) {
  return content
    .split(/\r?\n/)
    .map((line) => {
      const { text } = stripLrcTimestamps(line)
      return text
    })
    .join('\n')
}
