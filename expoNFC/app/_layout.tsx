import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { qrVerificationService } from '../src/services/QrVerificationService';

export default function RootLayout() {
  useEffect(() => {
    // Uygulama başlangıcında public key'i önbelleğe al
    preloadPublicKey();
  }, []);

  const preloadPublicKey = async () => {
    try {
      await qrVerificationService.preloadPublicKey();
      console.log('✅ Public key preload tamamlandı');
    } catch (error) {
      console.warn('⚠️ Public key preload başarısız:', error);
    }
  };

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

