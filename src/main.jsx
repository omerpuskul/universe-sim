import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Capacitor native platform kontrolü
// Eğer uygulama Android'de çalışıyorsa status bar'ı koyu temaya ayarla
import { Capacitor } from '@capacitor/core'

if (Capacitor.isNativePlatform()) {
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: Style.Dark })
    StatusBar.setBackgroundColor({ color: '#0a0a14' })
  }).catch(() => {
    // Status bar plugin yoksa sessizce devam et
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
