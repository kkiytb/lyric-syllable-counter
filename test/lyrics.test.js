// lyrics.test.js — 歌词/字幕解析单元测试
import { parseLyricFile, stripTimestampsAny } from '../src/lyrics.js'

let pass = 0
let fail = 0
function check(name, actual, expected) {
  const ok = actual === expected
  if (ok) {
    pass++
    console.log(`  ✔ ${name} -> ${JSON.stringify(actual)}`)
  } else {
    fail++
    console.log(`  ✘ ${name}\n    期望 ${JSON.stringify(expected)}\n    实际 ${JSON.stringify(actual)}`)
  }
}

console.log('== LRC ==')
const lrc = `[ti:test]
[00:01.50]こんにちは世界
[00:04.20]今日はいい天気
[00:07.80]また会おう`
const l = parseLyricFile('song.lrc', lrc)
check('lrc type', l.type, 'lrc')
check('lrc text', l.text, 'こんにちは世界\n今日はいい天気\nまた会おう')

console.log('== LRC 行内交错多时间戳 ==')
const lrc2 = `[00:03.60]아~ [00:04.18]아~, [00:04.46]아~
[00:05.02]아아아아아아~
[00:07.32]아~ [00:07.68]아~`
const l2 = parseLyricFile('inline.lrc', lrc2)
check('lrc2 type', l2.type, 'lrc')
check('lrc2 text 剥掉全部时间戳', l2.text, '아~ 아~, 아~\n아아아아아아~\n아~ 아~')

console.log('== LRC 多时间戳标记同一句 ==')
const lrc3 = `[00:01.00][00:05.00][00:09.00]こんにちは`
const l3 = parseLyricFile('multi.lrc', lrc3)
check('lrc3 text', l3.text, 'こんにちは')

console.log('== LRC 尖括号时间戳 <mm:ss.xx> ==')
const lrc4 = `<00:03.60>아~ <00:04.18>아~, <00:04.46>아~
<00:05.02>아아아아아아~`
const l4 = parseLyricFile('angle.lrc', lrc4)
check('lrc4 类型识别', l4.type, 'lrc')
check('lrc4 剥掉尖括号时间戳', l4.text, '아~ 아~, 아~\n아아아아아아~')

console.log('== 分析前预处理 stripTimestampsAny 混合括号 ==')
const mixed = `<00:01.00>こんにちは [00:02.00]世界`
check('stripTimestampsAny 混合', stripTimestampsAny(mixed).trim(), 'こんにちは 世界')

console.log('== ASS ==')
const ass = `[Script Info]
Title: test

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,こんにちは{\\i1}世界{\\i0}
Dialogue: 0,0:00:05.00,0:00:08.00,Default,,0,0,0,,さようなら\\Nまたね`
const a = parseLyricFile('song.ass', ass)
check('ass type', a.type, 'ass')
check('ass text', a.text, 'こんにちは世界\nさようなら\nまたね')

console.log('== SRT ==')
const srt = `1
00:00:01,000 --> 00:00:04,000
こんにちは世界

2
00:00:05,000 --> 00:00:08,000
さようなら`
const s = parseLyricFile('song.srt', srt)
check('srt type', s.type, 'srt')
check('srt text', s.text, 'こんにちは世界\nさようなら')

console.log('== 内容自动识别（无扩展名/未知扩展名） ==')
const byLrc = parseLyricFile('unknown', '[00:01.00]こんにちは')
check('内容识别 lrc', byLrc.type, 'lrc')
const byAss = parseLyricFile('unknown.xyz', 'Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,テスト')
check('内容识别 ass', byAss.type, 'ass')

console.log('== 纯文本 ==')
const txt = parseLyricFile('song.txt', 'こんにちは\n世界')
check('txt type', txt.type, 'txt')
check('txt text', txt.text, 'こんにちは\n世界')

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
process.exit(fail ? 1 : 0)
