// Electron 主进程
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { registerIpc } = require('./ipc.cjs')

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 720,
    minHeight: 560,
    backgroundColor: '#0f1115',
    autoHideMenuBar: true,
    title: '音节计数器',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

// 在线注音代理：主进程发起请求，规避渲染进程 CORS
registerIpc(ipcMain)

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
