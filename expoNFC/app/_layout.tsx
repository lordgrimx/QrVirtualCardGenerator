import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { qrVerificationService } from '../src/services/QrVerificationService';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const prepare = async () => {
      try {
        // Native splash'ı hazır olana kadar açık tut
        await SplashScreen.preventAutoHideAsync();
        // Uygulama başlangıcında public key'i önbelleğe al
        await preloadPublicKey();
      } catch (e) {
        console.warn('Splash hazırlık hatası:', e);
      } finally {
        if (mounted) {
          setIsReady(true);
        }
        // Splash'ı kapat
        await SplashScreen.hideAsync();
      }
    };
    prepare();
    return () => {
      mounted = false;
    };
  }, []);

  const preloadPublicKey = async () => {
    try {
      await qrVerificationService.preloadPublicKey();
      console.log('✅ Public key preload tamamlandı');
    } catch (error) {
      console.warn('⚠️ Public key preload başarısız:', error);
    }
  };

  if (!isReady) {
    // Temaya uygun geçiş yükleme ekranı (native splash'tan sonra kısa süre görünür)
    return (
      <View style={styles.loaderContainer}>
        <Image source={require('../assets/anef-logo.png')} style={styles.loaderLogo} />
        <Text style={styles.loaderTitle}>ANEF</Text>
        <Text style={styles.loaderSubtitle}>Uygulama hazırlanıyor...</Text>
        <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="modals/MemberInfoDialog" 
        options={{ 
          presentation: 'modal',
          headerTitle: 'Üye Bilgileri'
        }} 
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    backgroundColor: '#7C2D12',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loaderLogo: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
  },
  loaderTitle: {
    marginTop: 12,
    fontSize: 22,
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: 2,
  },
  loaderSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#FDE68A',
  },
});

