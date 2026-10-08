/**
 * analyzeService.js — 日语在线读音分析（单行视图与对比视图共用）
 * 含汉字 → 在线注音精确数拍；离线/失败 → 估算兜底。
 */
import {
  analyzeText,
  countJaFromTokens,
  mapTokensToLines
} from './counter.js'
import { fetchFurigana } from './readings.js'

function hasKanji(str) {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(str)
}

function empty(lang) {
  return { lines: [], total: 0, lineCount: 0, unit: '拍' }
}

/**
 * 分析日文文本，返回 { mode: 'online'|'estimate', result }
 */
export async function analyzeJa(text, kanjiMora = 1) {
  const textNow = text || ''
  if (!textNow.trim()) {
    return { mode: 'online', result: empty('ja') }
  }

  if (hasKanji(textNow)) {
    try {
      const res = await fetchFurigana(textNow)
      const tokens = (res && res.tokens) || []
      if (tokens.length) {
        const perLine = mapTokensToLines(textNow, tokens)
        const rawLines = textNow.replace(/\r/g, '').split('\n')
        const lines = []
        let total = 0
        rawLines.forEach((lineText, idx) => {
          const r = countJaFromTokens(lineText, perLine[idx] || [])
          total += r.total
          lines.push({
            idx,
            text: lineText,
            total: r.total,
            chars: r.chars,
            groups: r.groups,
            kanji: r.kanji,
            empty: !lineText.trim()
          })
        })
        return { mode: 'online', result: { lang: 'ja', unit: '拍', lines, total, lineCount: lines.length } }
      }
    } catch (e) {
      // 离线/接口失败 → 估算兜底
    }
    return {
      mode: 'estimate',
      result: analyzeText(textNow, 'ja', { kanjiMora })
    }
  }

  // 无汉字 → 本地精确
  return { mode: 'online', result: analyzeText(textNow, 'ja', { kanjiMora }) }
}
