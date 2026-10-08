/**
 * counter.js — 多语言音节计数引擎（纯前端，无后端依赖）
 *
 * 设计目标：
 *  - 每种语言一个 count(text) 函数，返回逐字明细（chars）+ 拍数（total）+ 分组（groups）
 *  - analyzeText() 按行拆分，返回每行统计（每个字、每句的音节数）
 *  - 支持按内容自动识别语言
 */

/* ------------------------------------------------------------------ *
 * 字符工具
 * ------------------------------------------------------------------ */

const SMALL_KANA = new Set(
  'ゃゅょぁぃぅぇぉャュョァィゥェォヵヶ'.split('')
)
const SOKUON = new Set('っッ'.split(''))
const CHOONPU = 'ー'
const VOWELS = new Set('aeiouAEIOU')

function isHiragana(c) {
  return c >= '\u3040' && c <= '\u309F'
}
function isKatakana(c) {
  return c >= '\u30A0' && c <= '\u30FF'
}
function isKana(c) {
  return isHiragana(c) || isKatakana(c)
}
function isKanji(c) {
  // CJK 统一表意文字（含扩展A）
  return (
    (c >= '\u4E00' && c <= '\u9FFF') ||
    (c >= '\u3400' && c <= '\u4DBF')
  )
}
function isHanziExt(c) {
  // 汉字 + 扩展B区（方言口语字，如「𠮶」）+ 兼容表意文字
  return (
    isKanji(c) ||
    (c >= '\u20000' && c <= '\u2A6DF') ||
    (c >= '\uF900' && c <= '\uFAFF')
  )
}
function isHangul(c) {
  // 韩文音节块 + 谚文兼容字母 + 谚文扩展A/B（Jamo）
  return (
    (c >= '\uAC00' && c <= '\uD7A3') ||
    (c >= '\u1100' && c <= '\u11FF') ||
    (c >= '\u3130' && c <= '\u318F') ||
    (c >= '\uA960' && c <= '\uA97F') ||
    (c >= '\uD7B0' && c <= '\uD7FF')
  )
}
function isLatin(c) {
  return /[A-Za-z]/.test(c)
}
function isCyrillic(c) {
  return (c >= '\u0400' && c <= '\u04FF') || (c >= '\u0500' && c <= '\u052F')
}
function isThaiChar(c) {
  return c >= '\u0E00' && c <= '\u0E7F'
}
function isVietnamese(c) {
  return /[aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđĐ]/.test(
    c
  )
}
function isPunct(c) {
  return /[\s0-9,.;:!?、。，．・「」『』（）()""''《》—…~〜\n\r\t]/.test(c)
}

/* ------------------------------------------------------------------ *
 * 日语罗马字（Hepburn 式）：返回拍数组，长度即拍数
 * 约定：连续元音视为长音 1 拍（tou / oo / ei）；词尾或辅音前的 n 计 1 拍（ん）。
 * ------------------------------------------------------------------ */

function segmentRomaji(s) {
  const groups = []
  let cur = ''
  let i = 0
  const n = s.length
  while (i < n) {
    const ch = s[i]
    if (VOWELS.has(ch)) {
      let run = cur + ch
      cur = ''
      i++
      while (i < n && VOWELS.has(s[i])) {
        run += s[i]
        i++
      }
      groups.push(run)
    } else if (ch.toLowerCase() === 'n') {
      const next = i < n - 1 ? s[i + 1] : ''
      if (VOWELS.has(next)) {
        cur += ch
        i++
      } else {
        groups.push(ch)
        cur = ''
        i++
      }
    } else {
      cur += ch
      i++
    }
  }
  if (cur) groups.push(cur)
  return groups
}

/* ------------------------------------------------------------------ *
 * 日语（ja）：逐字 + 逐行拍数
 * 约定：小假名与前一假名合并为一拍；促音っ/长音符ー各一拍；罗马字按元音串与ん估算；
 *       汉字按每字 kanjiMora（默认1）拍估算。
 * ------------------------------------------------------------------ */

function countJa(text, opts = {}) {
  const kanjiMora = opts.kanjiMora ?? 1 // 汉字估算：每字几拍
  let mora = 0
  let kanaCount = 0
  let romajiChars = 0
  let kanji = 0
  const groups = [] // 一拍一组
  const chars = [] // 逐字明细 {ch, mora, type}
  let romajiBuf = ''
  let prevWasKana = false

  const flushRomaji = () => {
    if (romajiBuf) {
      const segs = segmentRomaji(romajiBuf)
      romajiChars += romajiBuf.length
      mora += segs.length
      groups.push(...segs)
      chars.push({ ch: romajiBuf, mora: segs.length, type: 'romaji' })
      romajiBuf = ''
    }
  }

  for (const ch of text) {
    if (isLatin(ch)) {
      romajiBuf += ch
      continue
    }
    flushRomaji()

    if (isKanji(ch)) {
      kanji++
      mora += kanjiMora
      groups.push(ch)
      chars.push({ ch, mora: kanjiMora, type: 'kanji' })
      prevWasKana = false
      continue
    }
    if (isPunct(ch)) {
      chars.push({ ch, mora: 0, type: 'punct' })
      prevWasKana = false
      continue
    }
    if (SMALL_KANA.has(ch)) {
      if (prevWasKana && groups.length) {
        groups[groups.length - 1] += ch
        chars.push({ ch, mora: 0, type: 'small' })
      } else {
        mora += 1
        groups.push(ch)
        chars.push({ ch, mora: 1, type: 'small' })
      }
      kanaCount++
      prevWasKana = true
      continue
    }
    if (SOKUON.has(ch)) {
      mora += 1
      groups.push(ch)
      chars.push({ ch, mora: 1, type: 'sokuon' })
      kanaCount++
      prevWasKana = true
      continue
    }
    if (ch === CHOONPU) {
      mora += 1
      groups.push(ch)
      chars.push({ ch, mora: 1, type: 'choopu' })
      kanaCount++
      prevWasKana = true
      continue
    }
    if (isKana(ch)) {
      mora += 1
      groups.push(ch)
      chars.push({ ch, mora: 1, type: 'kana' })
      kanaCount++
      prevWasKana = true
      continue
    }
    prevWasKana = false
  }
  flushRomaji()

  return {
    lang: 'ja',
    total: mora,
    kana: kanaCount,
    romajiChars,
    kanji,
    groups,
    chars
  }
}

/* ------------------------------------------------------------------ *
 * 英语（en）：逐词音节（启发式）
 * ------------------------------------------------------------------ */

import { EN_DICT } from './patterns/en_dict.js'

function countEn(text) {
  const words = text.toLowerCase().match(/[a-z']+/g) || []
  const chars = []
  const groups = []
  let total = 0
  for (const w of words) {
    const n = syllablesOfWordEn(w)
    total += n
    chars.push({ ch: w, mora: n, type: 'word' })
    groups.push(w)
  }
  return { lang: 'en', total, words: words.length, chars, groups }
}

/* 英语音节：CMU 发音词典精确查表，未收录词用启发式兜底。 */
/* 唱歌惯例覆盖：双元音+r 类词在唱歌/音系上为单音节（CMU 常记为 2）。 */
const EN_OVERRIDE = {
  fire: 1, hire: 1, tire: 1, wire: 1, mire: 1, entire: 2,
  hour: 1, our: 1, sour: 1, choir: 1
}
/* 泰语常用词填词惯例（簇歧义/韵尾需词典，先锁定高频词精确值） */
const TH_OVERRIDE = {
  'สวัสดี': 3, 'สวัสดีครับ': 4, 'สวัสดีค่ะ': 4
}
function syllablesOfWordEn(w) {
  const clean = w.toLowerCase().replace(/[^a-z]/g, '')
  if (!clean) return 1
  if (Object.prototype.hasOwnProperty.call(EN_OVERRIDE, clean)) {
    return EN_OVERRIDE[clean]
  }
  if (Object.prototype.hasOwnProperty.call(EN_DICT, clean)) {
    return EN_DICT[clean]
  }
  // 兜底启发式：元音组为基底，处理词尾不发音 e、-ed、词尾 y 等
  const vowelSet = 'aeiouy'
  let groups = 0
  let prev = false
  for (const ch of clean) {
    if (vowelSet.includes(ch)) {
      if (!prev) groups++
      prev = true
    } else {
      prev = false
    }
  }
  let n = groups
  const l = clean.length
  if (l > 1 && clean.endsWith('e') && !clean.endsWith('le') && !clean.endsWith('ee') && !vowelSet.includes(clean[l - 2])) {
    n--
  }
  if (l > 3 && clean.endsWith('ed') && !'td'.includes(clean[l - 3])) {
    n--
  }
  if (l > 1 && clean.endsWith('y') && vowelSet.includes(clean[l - 2])) {
    n--
  }
  return Math.max(n, 1)
}

/* ------------------------------------------------------------------ *
 * 中文（zh）：逐字（每个汉字一拍）
 * ------------------------------------------------------------------ */

function countZh(text) {
  const chars = []
  let total = 0
  for (const ch of text) {
    if (isKanji(ch)) {
      total++
      chars.push({ ch, mora: 1, type: 'hanzi' })
    } else {
      chars.push({ ch, mora: 0, type: 'other' })
    }
  }
  return { lang: 'zh', total, hanzi: total, chars }
}

/* ------------------------------------------------------------------ *
 * 中文方言（粤语/客家/吴语/闽东 等）：汉字一字一音节（含扩展区口语字）
 * ------------------------------------------------------------------ */

function countHanziExt(text) {
  const chars = []
  let total = 0
  for (const ch of text) {
    if (isHanziExt(ch)) {
      total++
      chars.push({ ch, mora: 1, type: 'hanzi' })
    } else {
      chars.push({ ch, mora: 0, type: 'other' })
    }
  }
  return { total, hanzi: total, chars }
}

/* ------------------------------------------------------------------ *
 * 闽南语（nan）：有汉字按字计；纯罗马字（白话字 POJ）按空格分词，每词一音节
 * ------------------------------------------------------------------ */

function countNan(text) {
  let hasHanzi = false
  let hasLatin = false
  for (const ch of text) {
    if (isHanziExt(ch)) hasHanzi = true
    else if (isLatin(ch)) hasLatin = true
  }
  if (hasHanzi || !hasLatin) return countHanziExt(text)
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  const chars = tokens.map((w) => ({ ch: w, mora: 1, type: 'word' }))
  return { total: tokens.length, words: tokens.length, chars }
}

/* ------------------------------------------------------------------ *
 * 韩语（ko）：逐字（每个谚文音节块一拍）
 * ------------------------------------------------------------------ */

function countKo(text) {
  const chars = []
  let total = 0
  for (const ch of text) {
    if (isHangul(ch)) {
      total++
      chars.push({ ch, mora: 1, type: 'hangul' })
    } else {
      chars.push({ ch, mora: 0, type: 'other' })
    }
  }
  return { lang: 'ko', total, hangul: total, chars }
}

/* ------------------------------------------------------------------ *
 * 拉丁系语言（es/fr/de/it/pt/id/tr 等）：按元音组估算音节
 * ------------------------------------------------------------------ */

const LATIN_VOWELS =
  'aeiouyàáâãäåèéêëìíîïòóôõöùúûüýÿ'

function latinSyllables(word, silentE) {
  let n = 0
  let prev = ''
  for (const ch of word) {
    if (LATIN_VOWELS.includes(ch)) {
      if (prev !== 'v') n++
      prev = 'v'
    } else {
      prev = 'c'
    }
  }
  if (
    silentE &&
    word.length > 1 &&
    word.endsWith('e') &&
    !word.endsWith('le')
  ) {
    n--
  }
  return Math.max(n, 1)
}

function countLatin(text, opts = {}) {
  const silentE = !!opts.silentE
  const words = text.toLowerCase().match(/[a-zà-ÿ]+/g) || []
  const chars = []
  const groups = []
  let total = 0
  for (const w of words) {
    const n = latinSyllables(w, silentE)
    total += n
    chars.push({ ch: w, mora: n, type: 'word' })
    groups.push(w)
  }
  return { total, words: words.length, chars, groups }
}

/* ------------------------------------------------------------------ *
 * 西班牙语/意大利语：规则化音节划分
 * 依据强元音(a,e,o)/弱元音(i,u)，相邻元音构成二重元音或间隔音。
 * ------------------------------------------------------------------ */

function spanSyllCount(vowels, STRONG, WEAK) {
  let syllables = 0
  let cur = ''
  for (const v of vowels) {
    if (!cur) {
      cur = v
      syllables++
      continue
    }
    // 重读弱元音（í/ú/ü/ì/ù）强制成新音节（打破二重元音）
    if (v === 'í' || v === 'ú' || v === 'ü' || v === 'ì' || v === 'ù') {
      syllables++
      cur = v
      continue
    }
    const isS = STRONG.includes(v)
    const len = cur.length
    if (len === 1) {
      const only = cur
      if (isS && STRONG.includes(only)) {
        // 强+强 = 间隔音，分属两音节
        syllables++
        cur = v
      } else {
        cur += v // 二重元音
      }
    } else if (len === 2) {
      // 三重元音仅 弱+强+弱
      const ws = WEAK.includes(cur[0]) && STRONG.includes(cur[1])
      if (ws && WEAK.includes(v)) {
        cur += v
      } else {
        syllables++
        cur = v
      }
    } else {
      syllables++
      cur = v
    }
  }
  return Math.max(syllables, 1)
}

const ES_STRONG = 'aeoáéó'
const ES_WEAK = 'iuüíú'
const IT_STRONG = 'aeoáéó'
const IT_WEAK = 'iuìíùú'

function countEs(text) {
  const words = text.toLowerCase().match(/[a-zà-ÿ]+/g) || []
  const chars = []
  const groups = []
  let total = 0
  for (const w of words) {
    const n = countSpanWord(w, ES_STRONG, ES_WEAK)
    total += n
    chars.push({ ch: w, mora: n, type: 'word' })
    groups.push(w)
  }
  return { total, words: words.length, chars, groups }
}

function countIt(text) {
  const words = text.toLowerCase().match(/[a-zà-ÿ]+/g) || []
  const chars = []
  const groups = []
  let total = 0
  for (const w of words) {
    const n = countSpanWord(w, IT_STRONG, IT_WEAK)
    total += n
    chars.push({ ch: w, mora: n, type: 'word' })
    groups.push(w)
  }
  return { total, words: words.length, chars, groups }
}

/* 把单词切成「连续元音段」，每段按强/弱元音规则计数，段间为音节边界。 */
function countSpanWord(word, STRONG, WEAK) {
  let syllables = 0
  let run = ''
  for (const c of word) {
    if ((STRONG + WEAK).includes(c)) {
      run += c
    } else if (run) {
      syllables += spanSyllCount(run, STRONG, WEAK)
      run = ''
    }
  }
  if (run) syllables += spanSyllCount(run, STRONG, WEAK)
  return Math.max(syllables, 1)
}

/* ------------------------------------------------------------------ *
 * 德语：元音/二重元音（ei ai eu äu au ie）各算一个音节核
 * ------------------------------------------------------------------ */

const DE_VOW = 'aeiouyäöü'
const DE_DIPH = ['ei', 'ai', 'eu', 'äu', 'au', 'ie']

function countDe(text) {
  const words = text.toLowerCase().match(/[a-zà-ÿ]+/g) || []
  const chars = []
  const groups = []
  let total = 0
  for (const w of words) {
    let nuclei = 0
    let i = 0
    while (i < w.length) {
      const c = w[i]
      if (DE_VOW.includes(c)) {
        const two = c + (w[i + 1] || '')
        if (DE_DIPH.includes(two)) {
          nuclei++
          i += 2
        } else {
          nuclei++
          i++
        }
      } else {
        i++
      }
    }
    const n = Math.max(nuclei, 1)
    total += n
    chars.push({ ch: w, mora: n, type: 'word' })
    groups.push(w)
  }
  return { total, words: words.length, chars, groups }
}

/* ------------------------------------------------------------------ *
 * 俄语（ru）：每个元音字母 ≈ 一个音节
 * ------------------------------------------------------------------ */

const RU_VOWELS = new Set('аеёиоуыэюяАЕЁИОУЫЭЮЯ'.split(''))

function countRu(text) {
  const words = text.match(/[а-яёА-ЯЁ']+/g) || []
  const chars = []
  const groups = []
  let total = 0
  for (const w of words) {
    let n = 0
    for (const ch of w) if (RU_VOWELS.has(ch)) n++
    n = Math.max(n, 1)
    total += n
    chars.push({ ch: w, mora: n, type: 'word' })
    groups.push(w)
  }
  return { total, words: words.length, chars, groups }
}

/* ------------------------------------------------------------------ *
 * 越南语（vi）：空格分词，每词一音节
 * ------------------------------------------------------------------ */

function countVi(text) {
  const tokens = text.trim().split(/\s+/) || []
  const chars = []
  const groups = []
  let total = 0
  for (const w of tokens) {
    if (!w) continue
    total += 1
    chars.push({ ch: w, mora: 1, type: 'word' })
    groups.push(w)
  }
  return { total, words: tokens.length, chars, groups }
}

/* ------------------------------------------------------------------ *
 * 泰语（th）：按泰语元音字符估算音节
 * ------------------------------------------------------------------ */

const THAI_VOWELS = new Set(
  'ะ า ำ เ แ โ ใ ไ ฤ ฦ'.split(' ')
)

/* ------------------------------------------------------------------ *
 * 元音字母计数（pl/hu/cs/el/uk/bg/sr 等）：每个元音字母 ≈ 一个音节
 * ------------------------------------------------------------------ */

function countVowelLetters(text, vowels) {
  const words = text.match(/[\p{L}\p{M}']+/gu) || []
  const chars = []
  const groups = []
  let total = 0
  for (const w of words) {
    let n = 0
    for (const ch of w) if (vowels.has(ch)) n++
    n = Math.max(n, 1)
    total += n
    chars.push({ ch: w, mora: n, type: 'word' })
    groups.push(w)
  }
  return { total, words: words.length, chars, groups }
}

function mkVowelSet(str) {
  return new Set((str + str.toUpperCase()).split(''))
}
const V_PL = mkVowelSet('aąeęioóuy')
const V_HU = mkVowelSet('aáeéiíoóöőuúüű')
const V_CS = mkVowelSet('aáeéěiíoóuúůyý')
const V_EL = mkVowelSet('αεηιουωάέήίόύώϊϋΐΰ')
const V_UK = mkVowelSet('аеєиіїоуяю')
const V_BG = mkVowelSet('аъоуеиюя')
const V_SR = mkVowelSet('аеиоуaеиоу')
const V_SK = mkVowelSet('aáäeéiíoóôuúyý')
const V_SL = mkVowelSet('aeiou')
const V_HR = mkVowelSet('aeiou')
const V_BS = mkVowelSet('aeiou')
const V_LV = mkVowelSet('aāeēiīoōuū')
const V_LT = mkVowelSet('aąeęėiįyouųū')
const V_KA = mkVowelSet('აეიოუ')
const V_HY = mkVowelSet('աիըէօուեև')
const V_AZ = mkVowelSet('aəeiıioöuü')
const V_KK = mkVowelSet('аәеёиоөұуыіэюя')
const V_MN = mkVowelSet('аэеиоөуүы')
const V_UZ = mkVowelSet('aeiouoʻ')
const V_SW = mkVowelSet('aeiou')

/* ------------------------------------------------------------------ *
 * 元音核计数（带二重元音/长元音合并）
 * 适用于：希腊语（αι ει οι υι ου αυ ευ）、拉脱维亚/立陶宛语（ai ei ie au uo…）、
 *          蒙古语（аа 长元音、ай 二重元音）、亚美尼亚语（ու）、威尔士语（w/y + 二重元音）。
 * ------------------------------------------------------------------ */

const ACCENT_BASE = {
  ά: 'α', έ: 'ε', ή: 'η', ί: 'ι', ό: 'ο', ύ: 'υ', ώ: 'ω', ϊ: 'ι', ϋ: 'υ', ΐ: 'ι', ΰ: 'υ',
  á: 'a', à: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a', ā: 'a', ą: 'a', ǎ: 'a',
  é: 'e', è: 'e', ê: 'e', ë: 'e', ē: 'e', ė: 'e', ę: 'e', ě: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i', ī: 'i', į: 'i', ǐ: 'i', ĩ: 'i',
  ó: 'o', ò: 'o', ô: 'o', õ: 'o', ö: 'o', ō: 'o', ő: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u', ū: 'u', ů: 'u', ű: 'u', ų: 'u', ũ: 'u',
  ý: 'y', ÿ: 'y', ŷ: 'y'
}
function normChar(c) {
  return ACCENT_BASE[c] || c
}

function countVowelNuclei(text, vowels, { digraphs = [], longPair = false, normalize = true } = {}) {
  const dset = new Set(digraphs.map((d) => d.toLowerCase()))
  const words = text.match(/[\p{L}\p{M}']+/gu) || []
  const chars = []
  const groups = []
  let total = 0
  for (const w of words) {
    let nuc = 0
    let i = 0
    const L = w.length
    while (i < L) {
      const c = w[i]
      if (vowels.has(c)) {
        nuc++
        const next = w[i + 1] || ''
        const two = (normalize ? normChar(c) + normChar(next) : c + next).toLowerCase()
        if (dset.has(two)) {
          i += 2
          continue
        }
        if (longPair && vowels.has(next) && normChar(c) === normChar(next)) {
          i += 2
          continue
        }
      }
      i++
    }
    nuc = Math.max(nuc, 1)
    total += nuc
    chars.push({ ch: w, mora: nuc, type: 'word' })
    groups.push(w)
  }
  return { total, words: words.length, chars, groups }
}

const EL_DI = ['αι', 'ει', 'οι', 'υι', 'ου', 'αυ', 'ευ']
const LV_DI = ['ai', 'ei', 'ie', 'au', 'eu', 'ou', 'oi', 'ui', 'uo']
const LT_DI = ['ai', 'au', 'ei', 'eu', 'oi', 'ou', 'ui', 'ie', 'uo']
const MN_DI = ['ай', 'ой', 'уй', 'эй', 'үй', 'ий']
const HY_DI = ['ու']
const V_CY = mkVowelSet('aâeêiîoôuûwŵyŷ')
const CY_DI = ['ae', 'ai', 'au', 'aw', 'ei', 'eu', 'ew', 'ey', 'iw', 'oi', 'ou', 'ow', 'uw', 'wy', 'yw']

/* ------------------------------------------------------------------ *
 * 葡萄牙语：二重元音/三重元音合并（半元音 i/u 不另计音节）
 * 带重音的 í/ú 会打断二重元音（saí=2、graúdo=3），故不归一化重音。
 * ------------------------------------------------------------------ */
const V_PT = mkVowelSet('aeiouáéíóúâêôàãõüy')
const PT_DI = [
  'ai', 'ei', 'oi', 'ui', 'au', 'eu', 'iu', 'ou',
  'ãe', 'ão', 'õe',
  'ia', 'ie', 'io', 'ua', 'ue', 'uo',
  'ái', 'éi', 'ói', 'áu', 'éu', 'óu',
  'iá', 'ié', 'iê', 'iã', 'iõ', 'uá', 'ué', 'uê', 'uã', 'uõ'
]
function countPt(text) {
  return countVowelNuclei(text, V_PT, { digraphs: PT_DI, normalize: false })
}

/* ------------------------------------------------------------------ *
 * 爱尔兰语：音节数 = 连续元音字母段的个数
 * （相邻元音多表宽/窄辅音标记而非独立发音，如 Gaeilge 的 aei 是一个音）
 * ------------------------------------------------------------------ */
const V_GA = mkVowelSet('aeiouáéíóú')
function countGa(text) {
  const words = text.match(/[\p{L}\p{M}']+/gu) || []
  const chars = []
  const groups = []
  let total = 0
  for (const w of words) {
    let n = 0
    let inRun = false
    for (const c of w) {
      if (V_GA.has(c)) {
        if (!inRun) { n++; inRun = true }
      } else {
        inRun = false
      }
    }
    n = Math.max(n, 1)
    total += n
    chars.push({ ch: w, mora: n, type: 'word' })
    groups.push(w)
  }
  return { total, words: words.length, chars, groups }
}

/* ------------------------------------------------------------------ *
 * 泰语：音节 = 声母 + 元音核（显式/隐含）+ 韵尾。
 * 泰文无空格分词、隐含元音、前置元音组合、辅音簇均需特殊处理，
 * 此实现为规则化近似（显式元音 + 基本隐含元音/簇），深层次需分词器。
 * ------------------------------------------------------------------ */
const TH_LEAD = new Set(['เ', 'แ', 'โ', 'ใ', 'ไ'])
const TH_POST = new Set(['ะ', 'ั', 'า', 'ำ', 'ิ', 'ี', 'ึ', 'ื', 'ุ', 'ู', '็'])
const TH_TONE = new Set(['่', '้', '๊', '๋', '์'])
const TH_CONS = new Set(
  'กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรฤลฦวศษสหฬอฮ'.split('')
)
const TH_CL2 = new Set(['ร', 'ล', 'ว'])

function isThaiVowel(c) {
  return TH_LEAD.has(c) || TH_POST.has(c)
}

function countThWord(w) {
  const chars = Array.from(w)
  const L = chars.length
  // 元音位置表：前置元音、后置元音、中位/词尾 อ（词首 อ 是声母承载）
  const vp = new Array(L).fill(false)
  for (let k = 0; k < L; k++) {
    const c = chars[k]
    if (TH_LEAD.has(c) || TH_POST.has(c)) vp[k] = true
    else if (c === 'อ' && k > 0) vp[k] = true
  }
  const nxtIdx = (x) => {
    let j = x + 1
    while (j < L && TH_TONE.has(chars[j])) j++
    return j
  }
  const prvIdx = (x) => {
    let p = x - 1
    while (p >= 0 && TH_TONE.has(chars[p])) p--
    return p
  }
  let n = 0
  let i = 0
  while (i < L) {
    const c = chars[i]
    if (TH_TONE.has(c)) { i++; continue }
    if (TH_LEAD.has(c)) {
      // 前置元音：音节核在此，后接声母（含簇）+后置符+词尾韵尾属同音节
      n++
      let j = i + 1
      if (j < L && TH_CONS.has(chars[j])) {
        j++
        if (j < L && TH_CONS.has(chars[j]) && TH_CL2.has(chars[j])) j++
      }
      // 组合符/声调符同属此核
      while (j < L && (TH_TONE.has(chars[j]) || TH_POST.has(chars[j]) || chars[j] === 'อ')) j++
      // 词尾韵尾（跳过声调）
      if (j < L) {
        let k = j
        while (k < L && TH_TONE.has(chars[k])) k++
        if (k < L && TH_CONS.has(chars[k])) {
          let m = k + 1
          while (m < L && TH_TONE.has(chars[m])) m++
          if (m >= L) j = k + 1
        }
      }
      i = j
      continue
    }
    if (vp[i]) { n++; i++; continue } // 后置元音 / 中位·词尾 อ
    if (TH_CONS.has(c)) {
      const p = prvIdx(i)
      const prev = p >= 0 ? chars[p] : null
      const j = nxtIdx(i)
      const next = j < L ? chars[j] : null
      if (next !== null && vp[j]) { i++; continue } // 显式元音音节声母
      if (next !== null && c !== 'อ' && TH_CONS.has(next) && TH_CL2.has(next)) { i++; continue } // 真辅音簇
      if (next !== null && TH_CONS.has(next)) {
        if (prev !== null && vp[p]) i++ // 前一音节韵尾
        else { n++; i += 2 } // 隐含元音 + 韵尾
        continue
      }
      if (prev !== null && vp[p]) i++ // 韵尾
      else { n++; i++ } // 孤立辅音隐含元音
      continue
    }
    i++
  }
  return Math.max(n, 1)
}

function countTh(text) {
  const tokens = text.split(/\s+/).filter(Boolean)
  const chars = []
  const groups = []
  let total = 0
  for (const tok of tokens) {
    const n = Object.prototype.hasOwnProperty.call(TH_OVERRIDE, tok)
      ? TH_OVERRIDE[tok]
      : countThWord(tok)
    total += n
    chars.push({ ch: tok, mora: n, type: 'word' })
    groups.push(tok)
  }
  if (tokens.length === 0) return { total: 0, words: 0, chars, groups }
  return { total, words: tokens.length, chars, groups }
}
const V_FR = mkVowelSet('aeiouyàâéèêëîïôûùüœæ')
/* ------------------------------------------------------------------ *
 * 法语：一个发音元音 = 一个音节（静音 e 不计、鼻元音/二重元音合并）
 * ------------------------------------------------------------------ */
/* 二重元音/组合读作一个元音 */
const FR_DI = new Set([
  'ai', 'ei', 'oi', 'ou', 'au', 'eu', 'œu', 'ay', 'ey', 'oy',
  'ie', 'ui', 'èi', 'éi', 'aî', 'oû', 'eû', 'ao', 'ae'
])
/* 鼻元音：元音 + n/m（后不接元音/另一鼻音时） */
const FR_NASAL = new Set([
  'an', 'am', 'en', 'em', 'in', 'im', 'yn', 'ym', 'on', 'om', 'un', 'um',
  'ain', 'aim', 'ein', 'eun', 'oin', 'oen'
])

function isFrVowel(c) {
  return V_FR.has(c)
}

function countFr(text) {
  const words = text.match(/[\p{L}\p{M}']+/gu) || []
  const chars = []
  const groups = []
  let total = 0
  for (const w of words) {
    const n = countFrWord(w.toLowerCase())
    total += n
    chars.push({ ch: w, mora: n, type: 'word' })
    groups.push(w)
  }
  return { total, words: words.length, chars, groups }
}

function countFrWord(w) {
  let n = 0
  let i = 0
  const L = w.length
  while (i < L) {
    const c = w[i]
    if (isFrVowel(c)) {
      n++
      const nxt = w[i + 1] || ''
      const nxt2 = w[i + 2] || ''
      // 三元 eau / oui → 一个元音
      if (c === 'e' && nxt === 'a' && nxt2 === 'u') {
        i += 3
        continue
      }
      if (c === 'o' && nxt === 'u' && nxt2 === 'i') {
        i += 3
        continue
      }
      // 鼻元音：元音 + n/m，且 n/m 后不接元音、不接另一鼻音 → n/m 是鼻化标记
      if (
        (nxt === 'n' || nxt === 'm') &&
        (i + 2 >= L || (!isFrVowel(nxt2) && nxt2 !== 'n' && nxt2 !== 'm'))
      ) {
        i += 2
        continue
      }
      // 二重元音（ai/oi/ou/eu 等）→ 一个元音
      if (FR_DI.has(c + nxt)) {
        i += 2
        continue
      }
      i++
    } else {
      i++
    }
  }
  // 词尾静音 e（及 -es/-ent）：一律不计数（法语 e muet）
  const lower = w
  if (L > 1 && n > 1) {
    if (lower.endsWith('ent') || lower.endsWith('es') || lower.endsWith('e')) {
      n--
    }
  }
  return Math.max(n, 1)
}

/* ------------------------------------------------------------------ *
 * 语言自动识别（按脚本分布）
 * ------------------------------------------------------------------ */

export function detectLanguage(text) {
  let hasKana = false
  let hasHangul = false
  let hasHanzi = false
  let hasLatin = false
  let hasCyrillic = false
  let hasThai = false
  let hasVi = false
  for (const ch of text) {
    if (isKana(ch)) hasKana = true
    else if (isHangul(ch)) hasHangul = true
    else if (isKanji(ch)) hasHanzi = true
    else if (isLatin(ch)) hasLatin = true
    else if (isCyrillic(ch)) hasCyrillic = true
    else if (isThaiChar(ch)) hasThai = true
    else if (isVietnamese(ch)) hasVi = true
  }
  if (hasKana) return 'ja'
  if (hasHangul) return 'ko'
  if (hasHanzi) return 'zh'
  if (hasThai) return 'th'
  if (hasCyrillic) return 'ru'
  if (hasVi) return 'vi'
  if (hasLatin) return 'en'
  return 'ja'
}

/* ------------------------------------------------------------------ *
 * 语言注册表
 * ------------------------------------------------------------------ */

export const LANGUAGES = {
  ja: {
    code: 'ja',
    name: '日本語',
    nameZh: '日语',
    flag: '🇯🇵',
    description:
      '按拍数（モーラ）计数：小假名与前一假名合并为一拍，促音「っ」与长音符「ー」各计一拍；汉字按每字1拍估算。',
    count: countJa,
    unit: '拍'
  },
  en: {
    code: 'en',
    name: 'English',
    nameZh: '英语',
    flag: '🇬🇧',
    description: 'CMU 发音词典精确音节数，未收录词用启发式兜底。',
    count: countEn,
    unit: '音节'
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nameZh: '普通话',
    flag: '🇨🇳',
    description: '按汉字字符数近似，一字一音节。',
    count: countZh,
    unit: '音节'
  },
  ko: {
    code: 'ko',
    name: '한국어',
    nameZh: '韩语',
    flag: '🇰🇷',
    description: '按谚文音节块计数，一个字块一拍。',
    count: countKo,
    unit: '拍'
  },
  es: {
    code: 'es',
    name: 'Español',
    nameZh: '西班牙语',
    flag: '🇪🇸',
    description: '规则化划分：按强/弱元音处理二重元音与间隔音。',
    count: countEs,
    unit: '音节'
  },
  fr: {
    code: 'fr',
    name: 'Français',
    nameZh: '法语',
    flag: '🇫🇷',
    description: '规则化：一个发音元音=一音节（静音 e 不计、鼻元音/二重元音合并）。',
    count: countFr,
    unit: '音节'
  },
  de: {
    code: 'de',
    name: 'Deutsch',
    nameZh: '德语',
    flag: '🇩🇪',
    description: '规则化：二重元音（ei/au/eu/ie 等）合并为一个音节核。',
    count: countDe,
    unit: '音节'
  },
  it: {
    code: 'it',
    name: 'Italiano',
    nameZh: '意大利语',
    flag: '🇮🇹',
    description: '规则化划分：按强/弱元音处理二重元音与间隔音。',
    count: countIt,
    unit: '音节'
  },
  pt: {
    code: 'pt',
    name: 'Português',
    nameZh: '葡萄牙语',
    flag: '🇵🇹',
    description: '规则化：二重元音/三重元音合并，重音 í/ú 打断。',
    count: countPt,
    unit: '音节'
  },
  id: {
    code: 'id',
    name: 'Bahasa Indonesia',
    nameZh: '印尼语',
    flag: '🇮🇩',
    description: '按元音组估算音节数。',
    count: (t) => countLatin(t),
    unit: '音节'
  },
  tr: {
    code: 'tr',
    name: 'Türkçe',
    nameZh: '土耳其语',
    flag: '🇹🇷',
    description: '按元音组估算音节数。',
    count: (t) => countLatin(t),
    unit: '音节'
  },
  ru: {
    code: 'ru',
    name: 'Русский',
    nameZh: '俄语',
    flag: '🇷🇺',
    description: '按元音字母数计音节（一字一音节核）。',
    count: countRu,
    unit: '音节'
  },
  vi: {
    code: 'vi',
    name: 'Tiếng Việt',
    nameZh: '越南语',
    flag: '🇻🇳',
    description: '按空格分词，每词一音节（越南语一词即一音节）。',
    count: countVi,
    unit: '音节'
  },
  th: {
    code: 'th',
    name: 'ไทย',
    nameZh: '泰语',
    flag: '🇹🇭',
    description: '规则化近似：显式元音+隐含元音+辅音簇（泰文分词需分词器）。',
    count: countTh,
    unit: '音节'
  },
  sv: {
    code: 'sv',
    name: 'Svenska',
    nameZh: '瑞典语',
    flag: '🇸🇪',
    description: '按元音组估算音节数。',
    count: (t) => countLatin(t),
    unit: '音节'
  },
  no: {
    code: 'no',
    name: 'Norsk',
    nameZh: '挪威语',
    flag: '🇳🇴',
    description: '按元音组估算音节数。',
    count: (t) => countLatin(t),
    unit: '音节'
  },
  da: {
    code: 'da',
    name: 'Dansk',
    nameZh: '丹麦语',
    flag: '🇩🇰',
    description: '按元音组估算音节数。',
    count: (t) => countLatin(t),
    unit: '音节'
  },
  nl: {
    code: 'nl',
    name: 'Nederlands',
    nameZh: '荷兰语',
    flag: '🇳🇱',
    description: '按元音组估算音节数。',
    count: (t) => countLatin(t),
    unit: '音节'
  },
  fi: {
    code: 'fi',
    name: 'Suomi',
    nameZh: '芬兰语',
    flag: '🇫🇮',
    description: '按元音组估算音节数（含复合元音）。',
    count: (t) => countLatin(t),
    unit: '音节'
  },
  ro: {
    code: 'ro',
    name: 'Română',
    nameZh: '罗马尼亚语',
    flag: '🇷🇴',
    description: '按元音组估算音节数。',
    count: (t) => countLatin(t),
    unit: '音节'
  },
  ms: {
    code: 'ms',
    name: 'Bahasa Melayu',
    nameZh: '马来语',
    flag: '🇲🇾',
    description: '按元音组估算音节数。',
    count: (t) => countLatin(t),
    unit: '音节'
  },
  tl: {
    code: 'tl',
    name: 'Tagalog',
    nameZh: '他加禄语',
    flag: '🇵🇭',
    description: '按元音组估算音节数。',
    count: (t) => countLatin(t),
    unit: '音节'
  },
  pl: {
    code: 'pl',
    name: 'Polski',
    nameZh: '波兰语',
    flag: '🇵🇱',
    description: '按元音字母数计音节。',
    count: (t) => countVowelLetters(t, V_PL),
    unit: '音节'
  },
  hu: {
    code: 'hu',
    name: 'Magyar',
    nameZh: '匈牙利语',
    flag: '🇭🇺',
    description: '按元音字母数计音节。',
    count: (t) => countVowelLetters(t, V_HU),
    unit: '音节'
  },
  cs: {
    code: 'cs',
    name: 'Čeština',
    nameZh: '捷克语',
    flag: '🇨🇿',
    description: '按元音字母数计音节（含成音节 r/l 近似）。',
    count: (t) => countVowelLetters(t, V_CS),
    unit: '音节'
  },
  el: {
    code: 'el',
    name: 'Ελληνικά',
    nameZh: '希腊语',
    flag: '🇬🇷',
    description: '规则化：现代希腊语二重元音（αι ει οι υι ου αυ ευ）合并为一个音节核。',
    count: (t) => countVowelNuclei(t, V_EL, { digraphs: EL_DI }),
    unit: '音节'
  },
  uk: {
    code: 'uk',
    name: 'Українська',
    nameZh: '乌克兰语',
    flag: '🇺🇦',
    description: '按元音字母数计音节。',
    count: (t) => countVowelLetters(t, V_UK),
    unit: '音节'
  },
  bg: {
    code: 'bg',
    name: 'Български',
    nameZh: '保加利亚语',
    flag: '🇧🇬',
    description: '按元音字母数计音节。',
    count: (t) => countVowelLetters(t, V_BG),
    unit: '音节'
  },
  sr: {
    code: 'sr',
    name: 'Srpski',
    nameZh: '塞尔维亚语',
    flag: '🇷🇸',
    description: '按元音字母数计音节（拉丁/西里尔）。',
    count: (t) => countVowelLetters(t, V_SR),
    unit: '音节'
  },
  sk: {
    code: 'sk',
    name: 'Slovenčina',
    nameZh: '斯洛伐克语',
    flag: '🇸🇰',
    description: '按元音字母数计音节。',
    count: (t) => countVowelLetters(t, V_SK),
    unit: '音节'
  },
  sl: {
    code: 'sl',
    name: 'Slovenščina',
    nameZh: '斯洛文尼亚语',
    flag: '🇸🇮',
    description: '按元音字母数计音节。',
    count: (t) => countVowelLetters(t, V_SL),
    unit: '音节'
  },
  hr: {
    code: 'hr',
    name: 'Hrvatski',
    nameZh: '克罗地亚语',
    flag: '🇭🇷',
    description: '按元音字母数计音节。',
    count: (t) => countVowelLetters(t, V_HR),
    unit: '音节'
  },
  bs: {
    code: 'bs',
    name: 'Bosanski',
    nameZh: '波斯尼亚语',
    flag: '🇧🇦',
    description: '按元音字母数计音节。',
    count: (t) => countVowelLetters(t, V_BS),
    unit: '音节'
  },
  lv: {
    code: 'lv',
    name: 'Latviešu',
    nameZh: '拉脱维亚语',
    flag: '🇱🇻',
    description: '规则化：二重元音（ai ei ie au eu ou oi ui uo）合并为一个音节核。',
    count: (t) => countVowelNuclei(t, V_LV, { digraphs: LV_DI }),
    unit: '音节'
  },
  lt: {
    code: 'lt',
    name: 'Lietuvių',
    nameZh: '立陶宛语',
    flag: '🇱🇹',
    description: '规则化：二重元音（ai au ei eu oi ou ui ie uo）合并为一个音节核。',
    count: (t) => countVowelNuclei(t, V_LT, { digraphs: LT_DI }),
    unit: '音节'
  },
  ka: {
    code: 'ka',
    name: 'ქართული',
    nameZh: '格鲁吉亚语',
    flag: '🇬🇪',
    description: '按格鲁吉亚元音字母数计音节。',
    count: (t) => countVowelLetters(t, V_KA),
    unit: '音节'
  },
  hy: {
    code: 'hy',
    name: 'Հայերեն',
    nameZh: '亚美尼亚语',
    flag: '🇦🇲',
    description: '规则化：ու 合并为一个元音核。',
    count: (t) => countVowelNuclei(t, V_HY, { digraphs: HY_DI }),
    unit: '音节'
  },
  az: {
    code: 'az',
    name: 'Azərbaycanca',
    nameZh: '阿塞拜疆语',
    flag: '🇦🇿',
    description: '按元音字母数计音节。',
    count: (t) => countVowelLetters(t, V_AZ),
    unit: '音节'
  },
  kk: {
    code: 'kk',
    name: 'Қазақша',
    nameZh: '哈萨克语',
    flag: '🇰🇿',
    description: '按元音字母数计音节。',
    count: (t) => countVowelLetters(t, V_KK),
    unit: '音节'
  },
  mn: {
    code: 'mn',
    name: 'Монгол',
    nameZh: '蒙古语',
    flag: '🇲🇳',
    description: '规则化：长元音（аа 等）与二重元音（ай 等）合并为一个音节核。',
    count: (t) => countVowelNuclei(t, V_MN, { digraphs: MN_DI, longPair: true }),
    unit: '音节'
  },
  uz: {
    code: 'uz',
    name: "O'zbekcha",
    nameZh: '乌兹别克语',
    flag: '🇺🇿',
    description: '按元音字母数计音节。',
    count: (t) => countVowelLetters(t, V_UZ),
    unit: '音节'
  },
  sw: {
    code: 'sw',
    name: 'Kiswahili',
    nameZh: '斯瓦希里语',
    flag: '🇰🇪',
    description: '每个元音字母一个音节。',
    count: (t) => countVowelLetters(t, V_SW),
    unit: '音节'
  },
  et: {
    code: 'et',
    name: 'Eesti',
    nameZh: '爱沙尼亚语',
    flag: '🇪🇪',
    description: '按元音组估算音节数。',
    count: (t) => countLatin(t),
    unit: '音节'
  },
  is: {
    code: 'is',
    name: 'Íslenska',
    nameZh: '冰岛语',
    flag: '🇮🇸',
    description: '按元音组估算音节数。',
    count: (t) => countLatin(t),
    unit: '音节'
  },
  ca: {
    code: 'ca',
    name: 'Català',
    nameZh: '加泰罗尼亚语',
    flag: '🇪🇸',
    description: '按元音组估算音节数。',
    count: (t) => countLatin(t),
    unit: '音节'
  },
  sq: {
    code: 'sq',
    name: 'Shqip',
    nameZh: '阿尔巴尼亚语',
    flag: '🇦🇱',
    description: '按元音组估算音节数。',
    count: (t) => countLatin(t),
    unit: '音节'
  },
  cy: {
    code: 'cy',
    name: 'Cymraeg',
    nameZh: '威尔士语',
    flag: '🇬🇧',
    description: '规则化：w/y 作元音，二重元音合并为一个音节核。',
    count: (t) => countVowelNuclei(t, V_CY, { digraphs: CY_DI }),
    unit: '音节'
  },
  ga: {
    code: 'ga',
    name: 'Gaeilge',
    nameZh: '爱尔兰语',
    flag: '🇮🇪',
    description: '规则化：音节数=连续元音字母段的个数（宽/窄辅音标记不另计）。',
    count: countGa,
    unit: '音节'
  },
  af: {
    code: 'af',
    name: 'Afrikaans',
    nameZh: '南非荷兰语',
    flag: '🇿🇦',
    description: '按元音组估算音节数。',
    count: (t) => countLatin(t),
    unit: '音节'
  },
  // ---- 方言/变体（分组子项，不单独显示国旗）----
  'en-GB': {
    code: 'en-GB',
    name: 'English (UK)',
    nameZh: '英式英语',
    group: 'en',
    flag: '🇬🇧',
    description: '英语变体，CMU 发音词典精确。',
    count: countEn,
    unit: '音节'
  },
  'en-US': {
    code: 'en-US',
    name: 'English (US)',
    nameZh: '美式英语',
    group: 'en',
    flag: '🇺🇸',
    description: '英语变体，CMU 发音词典精确。',
    count: countEn,
    unit: '音节'
  },
  'pt-BR': {
    code: 'pt-BR',
    name: 'Português (BR)',
    nameZh: '巴西葡语',
    group: 'pt',
    flag: '🇧🇷',
    description: '葡萄牙语变体，规则化划分。',
    count: countPt,
    unit: '音节'
  },
  'pt-PT': {
    code: 'pt-PT',
    name: 'Português (PT)',
    nameZh: '欧洲葡语',
    group: 'pt',
    flag: '🇵🇹',
    description: '葡萄牙语变体，规则化划分。',
    count: countPt,
    unit: '音节'
  },
  'es-ES': {
    code: 'es-ES',
    name: 'Español (ES)',
    nameZh: '卡斯蒂利亚语',
    group: 'es',
    flag: '🇪🇸',
    description: '西班牙语变体，规则化划分。',
    count: countEs,
    unit: '音节'
  },
  'es-419': {
    code: 'es-419',
    name: 'Español (LA)',
    nameZh: '拉丁美洲西语',
    group: 'es',
    flag: '🇲🇽',
    description: '西班牙语变体，规则化划分。',
    count: countEs,
    unit: '音节'
  },
  nb: {
    code: 'nb',
    name: 'Bokmål',
    nameZh: '挪威博克马尔语',
    group: 'no',
    flag: '🇳🇴',
    description: '挪威语书面语变体，按元音组估算。',
    count: (t) => countLatin(t),
    unit: '音节'
  },
  nn: {
    code: 'nn',
    name: 'Nynorsk',
    nameZh: '新挪威语',
    group: 'no',
    flag: '🇳🇴',
    description: '挪威语书面语变体，按元音组估算。',
    count: (t) => countLatin(t),
    unit: '音节'
  },
  yue: {
    code: 'yue',
    name: '粵語',
    nameZh: '粤语',
    group: 'zh',
    flag: '🇭🇰',
    description: '中文方言，按汉字一字一音节（含粤语口语字）。',
    count: countHanziExt,
    unit: '音节'
  },
  nan: {
    code: 'nan',
    name: '閩南語',
    nameZh: '闽南语',
    group: 'zh',
    flag: '🇨🇳',
    description: '中文方言：汉字按字计，纯罗马字（白话字）按分词计，每词一音节。',
    count: countNan,
    unit: '音节'
  },
  hak: {
    code: 'hak',
    name: '客家话',
    nameZh: '客家话',
    group: 'zh',
    flag: '🇨🇳',
    description: '中文方言，按汉字一字一音节。',
    count: countHanziExt,
    unit: '音节'
  },
  wuu: {
    code: 'wuu',
    name: '吴语',
    nameZh: '吴语',
    group: 'zh',
    flag: '🇨🇳',
    description: '中文方言（上海话等），按汉字一字一音节。',
    count: countHanziExt,
    unit: '音节'
  },
  cdo: {
    code: 'cdo',
    name: '閩東語',
    nameZh: '闽东语',
    group: 'zh',
    flag: '🇨🇳',
    description: '中文方言（福州话），按汉字一字一音节。',
    count: countHanziExt,
    unit: '音节'
  }
}

export {
  countJa,
  countEn,
  countZh,
  countKo,
  countLatin,
  countEs,
  countPt,
  countFr,
  countGa,
  countIt,
  countDe,
  countRu,
  countVi,
  countTh,
  countVowelLetters,
  countHanziExt,
  countNan,
  segmentRomaji
}

/* ------------------------------------------------------------------ *
 * 按读音数拍：在线注音得到的读音 → 拍数
 * ------------------------------------------------------------------ */

/**
 * 数一个纯假名读音串的拍数（复用 countJa：小假名合并、促音/长音各一拍）。
 */
export function countKanaMora(reading) {
  if (!reading) return 0
  return countJa(reading).total
}

/**
 * 把某行文本 + 该行的注音 token（surface/reading）还原为逐字+拍数。
 * 汉字 token 整块展示（surface + reading + 拍数）；纯假名/罗马字 token 逐字展开。
 */
export function countJaFromTokens(lineText, tokens) {
  let mora = 0
  let kanji = 0
  const chars = []
  const groups = []
  for (const tok of tokens) {
    const surface = tok.surface
    const reading = tok.reading || surface
    const hasKanji = [...surface].some(isKanji)
    if (hasKanji) {
      const m = countKanaMora(reading)
      mora += m
      kanji += [...surface].filter(isKanji).length
      groups.push(reading)
      chars.push({ ch: surface, mora: m, type: 'kanji', reading })
    } else {
      const sub = countJa(surface)
      mora += sub.total
      chars.push(...sub.chars)
      groups.push(...sub.groups)
    }
  }
  const kana = chars.filter((c) =>
    ['kana', 'small', 'sokuon', 'choopu'].includes(c.type)
  ).length
  return { lang: 'ja', total: mora, kanji, kana, chars, groups }
}

/**
 * 把整段原文的注音 token 映射回各自所属的行。
 * token 按出现顺序覆盖原文（不含换行、不含词间空格）。
 * 用 indexOf 跳过行内空格/标点定位，兼容 \r\n。
 */
export function mapTokensToLines(originalText, tokens) {
  const lines = originalText.replace(/\r/g, '').split('\n')
  const result = lines.map(() => [])
  let li = 0
  let ci = 0 // 当前行内已消费到的字符位置
  for (const tok of tokens) {
    let placed = false
    while (li < lines.length) {
      const idx = lines[li].indexOf(tok.surface, ci)
      if (idx >= 0) {
        result[li].push(tok)
        ci = idx + tok.surface.length
        placed = true
        break
      }
      li++
      ci = 0
    }
    if (!placed) {
      // 兜底：放到当前行末尾，避免整段丢弃
      const target = Math.min(li, result.length - 1)
      if (target >= 0) result[target].push(tok)
    }
  }
  return result
}

/**
 * 按行分析：把文本按行拆分，返回每行的逐字明细与拍数。
 * 返回 { lines: [{ idx, text, total, chars, groups?, kanji? }], total, lineCount }
 */
export function analyzeText(text, langCode, options = {}) {
  const lang = LANGUAGES[langCode]
  if (!lang) throw new Error('未知语言: ' + langCode)
  const rawLines = text.replace(/\r/g, '').split('\n')
  const lines = []
  let grandTotal = 0
  rawLines.forEach((raw, idx) => {
    const lineText = raw
    const r = lang.count(lineText, options)
    grandTotal += r.total
    lines.push({
      idx,
      text: lineText,
      total: r.total,
      chars: r.chars || [],
      groups: r.groups || [],
      kanji: r.kanji || 0,
      empty: r.total === 0 && !lineText.trim()
    })
  })
  return {
    lang: langCode,
    unit: lang.unit,
    lines,
    total: grandTotal,
    lineCount: lines.length
  }
}
