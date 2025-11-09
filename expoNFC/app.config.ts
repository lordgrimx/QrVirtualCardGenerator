import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'NFC Okuyucu',
  slug: 'exponfc',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'exponfc',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.anefuye.exponfc',
    infoPlist: {
      NFCReaderUsageDescription: 'Bu uygulama NFC etiketlerini okumak için NFC kullanır.',
      NSCameraUsageDescription: 'QR kod taramak için kamera erişimi gereklidir.'
    },
    entitlements: {
      'com.apple.developer.nfc.readersession.formats': ['NDEF']
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.anefuye.exponfc',
    permissions: [
      'android.permission.NFC',
      'android.permission.CAMERA'
    ]
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro'
  },
  plugins: [
    'expo-router',
    [
      'expo-camera',
      {
        cameraPermission: 'QR kod taramak için kamera erişimi gereklidir.'
      }
    ],
    [
      'react-native-nfc-manager',
      {
        nfcPermission: 'Bu uygulama NFC etiketlerini okumak için NFC kullanır.',
        selectIdentifiers: ['D2760000850101'],
        systemCodes: ['8008', '0003']
      }
    ]
  ],
  extra: {
    backendBaseUrls: [
      process.env.BACKEND_BASE_URL,
      'https://backend.anefuye.com.tr',
      'http://192.168.1.105:8000',  // Bilgisayarınızın IP'si
      'http://10.0.2.2:8000',
      'http://localhost:8000',
      'http://192.168.1.100:8000'
    ].filter(Boolean),
    eas: {
      projectId: 'your-project-id-here'
    }
  }
});

