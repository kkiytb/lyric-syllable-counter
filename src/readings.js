/**
 * readings.js — 在线日语读音（汉字→假名）获取
 * 优先走 Electron 主进程代理（避免 CORS）；浏览器/开发环境回退为直接 fetch。
 * 数据源：shirabe.dev 免 key API（IPAdic 形态素解析，匿名免费 1 万次/月）。
 */

const ENDPOINT = 'https://shirabe.dev/api/v1/text/furigana'

/**
 * @param {string} text 需要注音的整段文本
 * @returns {Promise<{text:string, tokens:Array<{surface:string,reading:string}>}>}
 * @throws 网络错误 / 接口不可用
 */
export async function fetchFurigana(text) {
  if (!text || !text.trim()) {
    return { text, tokens: [] }
  }
  // Electron 主进程代理
  if (typeof window !== 'undefined' && window.appAPI && window.appAPI.convertFurigana) {
    return await window.appAPI.convertFurigana(text)
  }
  // 浏览器/开发环境直接调用
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ text })
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`furigana ${res.status} ${detail}`)
  }
  return await res.json()
}
