import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.omerpuskul.universesim',
  appName: 'Evren Simülasyonu',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
  server: {
    // Production'da local dosyaları https scheme ile yükle
    androidScheme: 'https'
  }
};

export default config;
