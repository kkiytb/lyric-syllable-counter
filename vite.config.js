import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Vite 构建时使用相对路径，保证 Electron 通过 file:// 加载时资源可用
export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  server: {
    port: 5173,
    strictPort: true
  }
})
