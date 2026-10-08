// electron/ipc.cjs — 注音 + 词典兜底代理（供主进程与截图/测试脚本复用）
const ENDPOINT = 'https://shirabe.dev/api/v1/text/furigana'

const IPA_VOWELS = new Set('aeiouyæɑɒɐɔɜɝəɘɛɚɞɤɨɪɵɶɷøœɯʉɧɥ'.split(''))
function countIpa(ipa) {
  let n = 0
  let inRun = false
  for (const ch of ipa) {
    if (IPA_VOWELS.has(ch)) { if (!inRun) { n++; inRun = true } } else inRun = false
  }
  return n
}
function parseIpaFromWikitext(wt) {
  if (!wt) return null
  const m1 = wt.match(/\{\{IPA\|[^|\n]*\|\s*\/([^/\n]+)\//)
  if (m1) return m1[1]
  const m2 = wt.match(/\{\{IPA\|[^\n]*?\/([^/\n]+)\//)
  if (m2) return m2[1]
  const m3 = wt.match(/\/([^/\n]{1,40})\//)
  if (m3) return m3[1]
  return null
}
function wikiLang(code) {
  const base = String(code || '').split('-')[0].toLowerCase()
  if (['zh', 'yue', 'nan', 'hak', 'wuu', 'cdo', 'gan', 'hsn'].includes(base)) return 'zh'
  return base
}
async function fetchDatamuse(word) {
  const url = `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=s&max=1`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const arr = await res.json()
    if (Array.isArray(arr) && arr[0] && arr[0].numSyllables > 0) return arr[0].numSyllables
    return null
  } catch { return null } finally { clearTimeout(timer) }
}
async function fetchWiktionary(lang, word) {
  const host = wikiLang(lang) + '.wiktionary.org'
  const url = `https://${host}/w/api.php?action=parse&page=${encodeURIComponent(word)}&prop=wikitext&format=json&formatversion=2`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'DoubaoSyllableTool/1.0 (syllable counter)' }, signal: controller.signal })
    if (!res.ok) return null
    const j = await res.json()
    const wt = j && j.parse && j.parse.wikitext
    if (!wt) return null
    const ipa = parseIpaFromWikitext(wt)
    if (!ipa) return null
    const c = countIpa(ipa)
    return c > 0 ? c : null
  } catch { return null } finally { clearTimeout(timer) }
}

function registerIpc(ipc) {
  ipc.handle('furigana', async (_event, text) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ text }),
        signal: controller.signal
      })
      if (!res.ok) {
        throw new Error('furigana ' + res.status)
      }
      return await res.json()
    } finally {
      clearTimeout(timer)
    }
  })

  // 词典联网兜底：返回 { word: syllableCount }
  ipc.handle('dictLookup', async (_event, { lang, words }) => {
    const out = {}
    const useWiki = !(lang === 'en' || lang === 'es' || lang === 'es-ES' || lang === 'es-MX')
    const list = [...new Set((words || []).filter((w) => w && w.length > 0 && w.length < 40))]
    if (!useWiki) {
      const results = await Promise.all(list.map(async (w) => [w, await fetchDatamuse(w)]))
      for (const [w, c] of results) if (c) out[w] = c
    } else {
      const concurrency = 3
      for (let i = 0; i < list.length; i += concurrency) {
        const batch = list.slice(i, i + concurrency)
        const results = await Promise.all(batch.map(async (w) => [w, await fetchWiktionary(lang, w)]))
        for (const [w, c] of results) if (c) out[w] = c
      }
    }
    return out
  })
}

module.exports = { registerIpc }
