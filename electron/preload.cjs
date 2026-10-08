// preload：暴露只读应用信息 + 在线注音代理
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('appInfo', {
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome
  }
})

contextBridge.exposeInMainWorld('appAPI', {
  convertFurigana: (text) => ipcRenderer.invoke('furigana', text),
  dictLookup: (lang, words) => ipcRenderer.invoke('dictLookup', { lang, words })
})
