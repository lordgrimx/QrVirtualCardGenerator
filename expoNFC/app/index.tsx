/**
 * Ana giriş sayfası - Otomatik olarak tabs'a yönlendirir
 */
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)/nfc" />;
}

