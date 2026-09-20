import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saaschurchmanagementapp',
  appName: 'Church Management App',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
