import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#7C2D12',
        tabBarInactiveTintColor: '#6B7280',
        headerStyle: {
          backgroundColor: '#7C2D12',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="nfc"
        options={{
          title: 'NFC Okuyucu',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="nfc" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="qr"
        options={{
          title: 'QR Doğrulama',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="qrcode-scan" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

