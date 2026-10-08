// counter.test.js — 计数引擎单元测试（node 运行）
import {
  countJa,
  countEn,
  countZh,
  countKo,
  countLatin,
  countRu,
  countVi,
  countTh,
  segmentRomaji,
  detectLanguage,
  analyzeText,
  countKanaMora,
  countJaFromTokens,
  mapTokensToLines
} from '../src/counter.js'

let pass = 0
let fail = 0
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    pass++
    console.log(`  ✔ ${name} -> ${JSON.stringify(actual)}`)
  } else {
    fail++
    console.log(`  ✘ ${name}\n    期望 ${JSON.stringify(expected)}\n    实际 ${JSON.stringify(actual)}`)
  }
}

console.log('== 日语拍数 countJa ==')
check('あいうえお', countJa('あいうえお').total, 5)
check('きゃ', countJa('きゃ').total, 1) // 小假名合并
check('ぎゅう', countJa('ぎゅう').total, 2)
check('しゃしん', countJa('しゃしん').total, 3)
check('がっこう', countJa('がっこう').total, 4) // 促音
check('コーヒー', countJa('コーヒー').total, 4) // 长音
check('えきまえ', countJa('えきまえ').total, 4)
check('こんにちは', countJa('こんにちは').total, 5)
check('ありがとう', countJa('ありがとう').total, 5)
check('今日は。', countJa('今日は。').total, 3) // 今1 日1 は1
check('konnichiwa', countJa('konnichiwa').total, 5)
check('nihon', countJa('nihon').total, 3)

console.log('== 逐字明细 chars ==')
const ch = countJa('こんにちは')
check('こんにちは chars count', ch.chars.length, 5)
check('こんにちは 逐拍', ch.chars.map((c) => c.mora).join(''), '11111')
const ch2 = countJa('きゃ')
check('きゃ 合并逐拍', ch2.chars.map((c) => c.mora).join(''), '10') // き1 ゃ0
const ch3 = countJa('今日は')
check('今日は 逐拍(汉字1拍估算)', ch3.chars.map((c) => c.mora).join(''), '111')
check('今日は kanji=2', ch3.kanji, 2)

console.log('== 罗马字 segmentRomaji ==')
check('arigatou', segmentRomaji('arigatou').join('|'), 'a|ri|ga|tou')
check('sensei', segmentRomaji('sensei').join('|'), 'se|n|sei')
check('sakura', segmentRomaji('sakura').join('|'), 'sa|ku|ra')
check('konnichiwa', segmentRomaji('konnichiwa').join('|'), 'ko|n|ni|chi|wa')
check('nihon', segmentRomaji('nihon').join('|'), 'ni|ho|n')
check('onna', segmentRomaji('onna').join('|'), 'o|n|na')

console.log('== 英语 countEn ==')
check('hello', countEn('hello').total, 2)
check('apple', countEn('apple').total, 2)
check('table', countEn('table').total, 2)
check('the quick brown fox', countEn('the quick brown fox').total, 4)

console.log('== 中文 countZh ==')
check('床前明月光', countZh('床前明月光').total, 5)

console.log('== 韩语 countKo ==')
check('안녕하세요', countKo('안녕하세요').total, 5)
check('한국어', countKo('한국어').total, 3)

console.log('== 更多语言 ==')
check('西 hola mundo', countLatin('hola mundo').total, 4)
check('西 gracias', countLatin('gracias').total, 2)
check('法 bonjour', countLatin('bonjour').total, 2)
check('法 merci', countLatin('merci').total, 2)
check('德 hallo welt', countLatin('hallo welt').total, 3)
check('意 ciao mondo', countLatin('ciao mondo').total, 3)
check('俄 привет мир', countRu('привет мир').total, 3)
check('俄 спасибо', countRu('спасибо').total, 3)
check('越 xin chào', countVi('xin chào').total, 2)
check('泰 สวัสดี', countTh('สวัสดี').total, 3)
check('波 dziękuję', analyzeText('dziękuję', 'pl').total, 4)
check('匈 köszönöm', analyzeText('köszönöm', 'hu').total, 3)
check('希 Ελλάδα', analyzeText('Ελλάδα', 'el').total, 3)
check('乌 Україна', analyzeText('Україна', 'uk').total, 4)
check('塞 здраво', analyzeText('здраво', 'sr').total, 2)
check('芬 hei maailma', analyzeText('hei maailma', 'fi').total, 3)
check('粤 食咗飯未呀', analyzeText('食咗飯未呀', 'yue').total, 5)
check('闽(汉字) 我愛你', analyzeText('我愛你', 'nan').total, 3)
check('闽(罗马字) lí hó', analyzeText('lí hó', 'nan').total, 2)
check('客家 你好', analyzeText('你好', 'hak').total, 2)
check('吴语 謝謝儂', analyzeText('謝謝儂', 'wuu').total, 3)
check('闽东 福州話', analyzeText('福州話', 'cdo').total, 3)
check('斯洛伐克 ďakujem', analyzeText('ďakujem', 'sk').total, 3)
check('斯洛文尼亚 hvala', analyzeText('hvala', 'sl').total, 2)
check('克罗地亚 hvala', analyzeText('hvala', 'hr').total, 2)
check('波斯尼亚 zdravo', analyzeText('zdravo', 'bs').total, 2)
check('拉脱维亚 labi', analyzeText('labi', 'lv').total, 2)
check('立陶宛 labas', analyzeText('labas', 'lt').total, 2)
check('格鲁吉亚 გამარჯობა', analyzeText('გამარჯობა', 'ka').total, 4)
check('亚美尼亚 բարև', analyzeText('բարև', 'hy').total, 2)
check('阿塞拜疆 salam', analyzeText('salam', 'az').total, 2)
check('哈萨克 сәлем', analyzeText('сәлем', 'kk').total, 2)
check('蒙古 сайн', analyzeText('сайн', 'mn').total, 1)
check('乌兹别克 salom', analyzeText('salom', 'uz').total, 2)
check('斯瓦希里 habari', analyzeText('habari', 'sw').total, 3)
check('爱沙尼亚 tere', analyzeText('tere', 'et').total, 2)
check('冰岛 halló', analyzeText('halló', 'is').total, 2)
check('加泰罗尼亚 bon dia', analyzeText('bon dia', 'ca').total, 2)
check('阿尔巴尼亚 përshëndetje', analyzeText('përshëndetje', 'sq').total, 4)
check('威尔士 helo', analyzeText('helo', 'cy').total, 2)
check('爱尔兰 dia dhuit', analyzeText('dia dhuit', 'ga').total, 2)
check('南非荷兰 dankie', analyzeText('dankie', 'af').total, 2)
// 方言/变体
check('英式 colour', analyzeText('colour', 'en-GB').total, 2)
check('美式 color', analyzeText('color', 'en-US').total, 2)
check('巴西葡 obrigado', analyzeText('obrigado', 'pt-BR').total, 4)
check('欧洲葡 obrigado', analyzeText('obrigado', 'pt-PT').total, 4)
check('卡斯蒂利亚 gracias', analyzeText('gracias', 'es-ES').total, 2)
check('拉美西语 gracias', analyzeText('gracias', 'es-419').total, 2)
check('博克马尔 hei verden', analyzeText('hei verden', 'nb').total, 3)
check('新挪威 hei verden', analyzeText('hei verden', 'nn').total, 3)

console.log('== 规则化精确（西/意/德/英） ==')
check('西 gracias', analyzeText('gracias', 'es').total, 2)
check('西 crear(间隔音)', analyzeText('crear', 'es').total, 2)
check('西 murciélago', analyzeText('murciélago', 'es').total, 4)
check('西 buenos(二重元音)', analyzeText('buenos', 'es').total, 2)
check('西 adiós', analyzeText('adiós', 'es').total, 2)
check('西 hola', analyzeText('hola', 'es').total, 2)
check('意 buongiorno', analyzeText('buongiorno', 'it').total, 3)
check('意 grazie', analyzeText('grazie', 'it').total, 2)
check('意 pizza(辅音隔开)', analyzeText('pizza', 'it').total, 2)
check('意 amore', analyzeText('amore', 'it').total, 3)
check('意 mela', analyzeText('mela', 'it').total, 2)
check('德 Haus(au)', analyzeText('Haus', 'de').total, 1)
check('德 liebe(ie)', analyzeText('liebe', 'de').total, 2)
check('德 guten', analyzeText('guten', 'de').total, 2)
check('德 deutsch(eu)', analyzeText('deutsch', 'de').total, 1)
check('德 Danke', analyzeText('Danke', 'de').total, 2)
check('德 Häuser(äu)', analyzeText('Häuser', 'de').total, 2)
check('英 hello', analyzeText('hello', 'en').total, 2)
check('英 apple(-le)', analyzeText('apple', 'en').total, 2)
check('英 table(-le)', analyzeText('table', 'en').total, 2)
check('英 computer', analyzeText('computer', 'en').total, 3)
check('英 beautiful', analyzeText('beautiful', 'en').total, 3)
check('英 nation(-tion)', analyzeText('nation', 'en').total, 2)
check('英 walked(-ed)', analyzeText('walked', 'en').total, 1)
check('英 needed(-ed)', analyzeText('needed', 'en').total, 2)
check('英 cake(静音e)', analyzeText('cake', 'en').total, 1)
check('英 happy(尾y)', analyzeText('happy', 'en').total, 2)
console.log('== 英语 CMU 词典精确 + 唱歌惯例 ==')
check('英 fire(唱歌单音节)', analyzeText('fire', 'en').total, 1)
check('英 hour(唱歌单音节)', analyzeText('hour', 'en').total, 1)
check('英 our(唱歌单音节)', analyzeText('our', 'en').total, 1)
check('英 vocabulary(CMU)', analyzeText('vocabulary', 'en').total, 5)
check('英 temperature(CMU)', analyzeText('temperature', 'en').total, 3)
check('英 chocolate(CMU)', analyzeText('chocolate', 'en').total, 2)
check('英 comfortable(CMU)', analyzeText('comfortable', 'en').total, 4)
check('英 interesting(CMU)', analyzeText('interesting', 'en').total, 3)
check('英 world(CMU)', analyzeText('world', 'en').total, 1)
check('英 forever(CMU)', analyzeText('forever', 'en').total, 3)
check('英 remember(CMU)', analyzeText('remember', 'en').total, 3)

console.log('== 六语言规则化（二重元音/长元音合并） ==')
check('希 και(αι)', analyzeText('και', 'el').total, 1)
check('希 γυναίκα', analyzeText('γυναίκα', 'el').total, 3)
check('希 αγάπη', analyzeText('αγάπη', 'el').total, 3)
check('希 ναυτης(αυ)', analyzeText('ναυτης', 'el').total, 2)
check('拉 saule(au)', analyzeText('saule', 'lv').total, 2)
check('拉 dziesma(ie)', analyzeText('dziesma', 'lv').total, 2)
check('立 tai(ai)', analyzeText('tai', 'lt').total, 1)
check('立 šviesa(ie)', analyzeText('šviesa', 'lt').total, 2)
check('蒙 сайн(ай)', analyzeText('сайн', 'mn').total, 1)
check('蒙 цаас(长元音)', analyzeText('цаас', 'mn').total, 1)
check('蒙 байна', analyzeText('байна', 'mn').total, 2)
check('亚 սուրճ(ու)', analyzeText('սուրճ', 'hy').total, 1)
check('亚 բարև', analyzeText('բարև', 'hy').total, 2)
check('威 cymru', analyzeText('cymru', 'cy').total, 2)
check('威 cwm(w元音)', analyzeText('cwm', 'cy').total, 1)
check('威 hiraeth(ae)', analyzeText('hiraeth', 'cy').total, 2)

console.log('== 法语/葡语规则化 ==')
check('法 bonjour(鼻元音)', analyzeText('bonjour', 'fr').total, 2)
check('法 pain(ai鼻)', analyzeText('pain', 'fr').total, 1)
check('法 table(静音e)', analyzeText('table', 'fr').total, 1)
check('法 chambre(静音e)', analyzeText('chambre', 'fr').total, 1)
check('法 eau', analyzeText('eau', 'fr').total, 1)
check('法 fleur(eu)', analyzeText('fleur', 'fr').total, 1)
check('法 oui', analyzeText('oui', 'fr').total, 1)
check('法 nuit(ui)', analyzeText('nuit', 'fr').total, 1)
check('法 bien(ie)', analyzeText('bien', 'fr').total, 1)
check('法 personne', analyzeText('personne', 'fr').total, 2)
check('法 chanson', analyzeText('chanson', 'fr').total, 2)
check('法 beaucoup(eau)', analyzeText('beaucoup', 'fr').total, 2)
check('葡 mão(ão)', analyzeText('mão', 'pt').total, 1)
check('葡 saudade(au)', analyzeText('saudade', 'pt').total, 3)
check('葡 país(重读í打断)', analyzeText('país', 'pt').total, 2)
check('葡 saúde(重读ú打断)', analyzeText('saúde', 'pt').total, 3)
check('葡 português(uê)', analyzeText('português', 'pt').total, 3)
check('葡 obrigado', analyzeText('obrigado', 'pt').total, 4)
check('葡 viu(iu)', analyzeText('viu', 'pt').total, 1)
check('葡 graúdo', analyzeText('graúdo', 'pt').total, 3)

console.log('== 爱尔兰语/泰语规则化 ==')
check('爱 sláinte(元音段)', analyzeText('sláinte', 'ga').total, 2)
check('爱 Gaeilge(aei一段)', analyzeText('Gaeilge', 'ga').total, 2)
check('爱 dubh(静音bh)', analyzeText('dubh', 'ga').total, 1)
check('爱 amháin', analyzeText('amháin', 'ga').total, 2)
check('爱 bóithre(ói一段)', analyzeText('bóithre', 'ga').total, 2)
check('爱 uisce', analyzeText('uisce', 'ga').total, 2)
check('爱 teach(ea一段)', analyzeText('teach', 'ga').total, 1)
check('泰 ครับ(ร辅音簇)', analyzeText('ครับ', 'th').total, 1)
check('泰 คน(隐含元音)', analyzeText('คน', 'th').total, 1)
check('泰 ไทย(前置元音)', analyzeText('ไทย', 'th').total, 1)
check('泰 น้ำ(ำ)', analyzeText('น้ำ', 'th').total, 1)
check('泰 รัก(ั)', analyzeText('รัก', 'th').total, 1)
check('泰 ภาษาไทย', analyzeText('ภาษาไทย', 'th').total, 3)
check('泰 เมือง(เือ)', analyzeText('เมือง', 'th').total, 1)
check('泰 เพื่อน(声调)', analyzeText('เพื่อน', 'th').total, 1)
check('泰 กรุงเทพ', analyzeText('กรุงเทพ', 'th').total, 2)
check('泰 ขอบคุณ(中位อ)', analyzeText('ขอบคุณ', 'th').total, 2)
check('泰 สวัสดี(填词惯例)', analyzeText('สวัสดี', 'th').total, 3)
check('泰 อร่อย(词首อ承载)', analyzeText('อร่อย', 'th').total, 2)
check('泰 รอบ(中位อ)', analyzeText('รอบ', 'th').total, 1)
check('泰 สบายดี', analyzeText('สบายดี', 'th').total, 3)

console.log('== 语言自动识别 detectLanguage ==')
check('日本語のテキスト', detectLanguage('日本語のテキスト'), 'ja')
check('안녕하세요 세계', detectLanguage('안녕하세요 세계'), 'ko')
check('中文测试', detectLanguage('中文测试'), 'zh')
check('hello world', detectLanguage('hello world'), 'en')
check('привет мир', detectLanguage('привет мир'), 'ru')
check('สวัสดี', detectLanguage('สวัสดี'), 'th')
check('xin chào', detectLanguage('xin chào'), 'vi')

console.log('== 按行分析 analyzeText ==')
const ml = analyzeText('こんにちは世界\n今日はいい天気\nありがとう', 'ja')
check('三行 total', ml.total, 19) // 7 + 7 + 5
check('行数', ml.lines.length, 3)
check('第一行 text', ml.lines[0].text, 'こんにちは世界')
check('第一行 total', ml.lines[0].total, 7) // こんにちは(5) 世(1) 界(1)
check('第二行 total', ml.lines[1].total, 7) // 今日(2) は(1) いい(2) 天気(2)
check('第三行 total', ml.lines[2].total, 5) // ありがとう

console.log('== 按读音数拍 countJaFromTokens（模拟在线注音结果） ==')
const tokens = [
  { surface: 'こんにちは', reading: 'こんにちは' },
  { surface: '世界', reading: 'せかい' },
  { surface: '今日', reading: 'きょう' },
  { surface: 'は', reading: 'は' },
  { surface: 'いい', reading: 'いい' },
  { surface: '天気', reading: 'てんき' }
]
const perLine = mapTokensToLines('こんにちは世界\n今日はいい天気', tokens)
check('映射第一行 tokens', perLine[0].map((x) => x.surface).join(','), 'こんにちは,世界')
check('映射第二行 tokens', perLine[1].map((x) => x.surface).join(','), '今日,は,いい,天気')

const r1 = countJaFromTokens('こんにちは世界', perLine[0])
check('世界 读音 3 拍', r1.total, 8) // こんにちは(5) + せかい(3)
check('世界 kanji=2', r1.kanji, 2)
check('世界 汉字块读取', r1.chars.find((c) => c.type === 'kanji').reading, 'せかい')

const r2 = countJaFromTokens('今日はいい天気', perLine[1])
check('今日きょう+は+いい+てんき', r2.total, 8) // きょう(2) は(1) いい(2) てんき(3)

console.log('== countKanaMora ==')
check('せかい', countKanaMora('せかい'), 3)
check('きょう', countKanaMora('きょう'), 2) // きょ+う
check('てんき', countKanaMora('てんき'), 3)

console.log('== 歌词含空格的行映射 ==')
const lyric = '今日の 花婚\nこれからの 生涯の 友'
const tok2 = [
  { surface: '今日', reading: 'きょう' },
  { surface: 'の', reading: 'の' },
  { surface: '花婚', reading: 'かこん' },
  { surface: 'これから', reading: 'これから' },
  { surface: 'の', reading: 'の' },
  { surface: '生涯', reading: 'しょうがい' },
  { surface: 'の', reading: 'の' },
  { surface: '友', reading: 'とも' }
]
const pl2 = mapTokensToLines(lyric, tok2)
check('行1 tokens', pl2[0].map((x) => x.surface).join(','), '今日,の,花婚')
check('行2 tokens', pl2[1].map((x) => x.surface).join(','), 'これから,の,生涯,の,友')
const rl1 = countJaFromTokens('今日の 花婚', pl2[0])
check('今日の 花婚 拍数', rl1.total, 6) // きょう(2)+の(1)+かこん(3)

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
process.exit(fail ? 1 : 0)
