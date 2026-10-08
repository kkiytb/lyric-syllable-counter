// scripts/capture.cjs — 离屏渲染截图，用于验证界面（不依赖可见桌面）
// 用法：npx electron scripts/capture.cjs [输出png路径]
const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')
const { registerIpc } = require('../electron/ipc.cjs')

registerIpc(ipcMain)

const outPath =
  process.argv[2] || path.join(__dirname, '..', 'capture.png')
// 在线注音接口正常时等待其完成（首次字典加载较慢）
const settleMs = Number(process.env.SC_SETTLE || 2000)

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 980,
    height: 760,
    show: false,
    webPreferences: {
      offscreen: true,
      preload: path.join(__dirname, '..', 'electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  if (process.env.SC_MODE === 'compare') {
    await win.webContents.executeJavaScript(
      `document.querySelector('.seg.mode button:nth-child(2)').click()`
    )
  }
  if (process.env.SC_THEME) {
    await win.webContents.executeJavaScript(
      `document.documentElement.setAttribute('data-theme','${process.env.SC_THEME}')`
    )
  }
  if (process.env.SC_TEXT) {
    const text = process.env.SC_TEXT
    await win.webContents.executeJavaScript(
      `(()=>{ const ta=document.querySelectorAll('textarea')[0]; if(ta){ const s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set; s.call(ta, ${JSON.stringify(text)}); ta.dispatchEvent(new Event('input',{bubbles:true})); } })()`
    )
  }
  if (process.env.SC_TEXT2) {
    const text = process.env.SC_TEXT2
    await win.webContents.executeJavaScript(
      `(()=>{ const ta=document.querySelectorAll('textarea')[1]; if(ta){ const s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set; s.call(ta, ${JSON.stringify(text)}); ta.dispatchEvent(new Event('input',{bubbles:true})); } })()`
    )
  }
  if (process.env.SC_OPENLANG) {
    await win.webContents.executeJavaScript(
      `document.querySelector('.lang-trigger').click()`
    )
  }
  if (process.env.SC_LANGSEARCH) {
    const q = process.env.SC_LANGSEARCH
    await win.webContents.executeJavaScript(
      `(()=>{ const i=document.querySelector('.lang-search'); if(i){ const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i, ${JSON.stringify(q)}); i.dispatchEvent(new Event('input',{bubbles:true})); } })()`
    )
  }
  if (process.env.SC_SELECTLANG) {
    const code = process.env.SC_SELECTLANG.toUpperCase()
    await win.webContents.executeJavaScript(
      `(()=>{ const els=[...document.querySelectorAll('.lang-opt')]; const el=els.find(b=>b.querySelector('.lang-code')&&b.querySelector('.lang-code').textContent.trim()===${JSON.stringify(code)}); if(el){el.click();} })()`
    )
  }
  if (process.env.SC_DICT) {
    // 开启「词典联网兜底」复选框
    await win.webContents.executeJavaScript(
      `(()=>{ const lab=[...document.querySelectorAll('.toggle-row')].find(l=>{ const s=l.querySelector('input'); return s && l.textContent.includes('词典') && !l.textContent.includes('汉字'); }); if(lab){ const cb=lab.querySelector('input'); if(cb && !cb.checked){ cb.click(); } } })()`
    )
    await new Promise((r) => setTimeout(r, 2000))
  }
  await new Promise((r) => setTimeout(r, settleMs))
  const image = await win.webContents.capturePage()
  fs.writeFileSync(outPath, image.toPNG())
  console.log('captured ->', outPath)
  app.quit()
})
