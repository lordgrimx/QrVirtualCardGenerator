import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'NFC Okuyucu',
  slug: 'exponfc',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/anef-logo.png',
  userInterfaceStyle: 'light',
  scheme: 'exponfc',
  splash: {
    image: './assets/anef-logo.png',
    resizeMode: 'contain',
    backgroundColor: '#7C2D12'
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
      foregroundImage: './assets/anef-logo.png',
      backgroundColor: '#7C2D12'
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

