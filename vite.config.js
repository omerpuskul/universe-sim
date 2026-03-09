import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Capacitor dosyaları file:// protokolü ile yüklüyor.
  // Bu yüzden base'i relative yapıyoruz — mutlak path'ler çalışmaz.
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Tek chunk — mobil WebView için daha hızlı yükleme
        manualChunks: undefined
      }
    }
  }
})
