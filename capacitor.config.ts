import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.braintrain.app',
  appName: 'BrainTrain',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
