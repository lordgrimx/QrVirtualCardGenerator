/**
 * QR Doğrulama Ekranı
 * Kamera ile QR kod tarama ve online/offline doğrulama
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { qrVerificationService } from '../../src/services/QrVerificationService';
import * as Network from 'expo-network';

interface QrScanHistory {
  qrCode: string;
  result?: any;
  timestamp: Date;
  isSuccess: boolean;
  mode: string; // 'Online' or 'Offline'
}

export default function QrScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [scanHistory, setScanHistory] = useState<QrScanHistory[]>([]);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    
    if (status !== 'granted') {
      Alert.alert(
        'Kamera İzni Gerekli',
        'QR kod taramak için kamera erişimi gereklidir.'
      );
    }
  };

  const startScanning = () => {
    setIsScanning(true);
    setStatusMessage('QR kodu kameraya gösterin');
    setLastScannedCode('');
  };

  const stopScanning = () => {
    setIsScanning(false);
    setStatusMessage('');
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (isVerifying || !data || data === lastScannedCode) {
      return;
    }

    setLastScannedCode(data);
    setIsVerifying(true);
    stopScanning();

    console.log('📷 QR kod tarandı:', data.substring(0, 100));
    setStatusMessage('QR kod okundu, doğrulanıyor...');

    await verifyQrCode(data);
    setIsVerifying(false);
  };

  const verifyQrCode = async (qrData: string) => {
    try {
      // İnternet bağlantısını kontrol et
      const networkState = await Network.getNetworkStateAsync();
      const hasInternet = networkState.isConnected && networkState.isInternetReachable;

      if (hasInternet) {
        // Online doğrulama
        setStatusMessage('Sunucuda doğrulanıyor...');
        const { ok, result, error } = await qrVerificationService.verifyOnline(qrData);

        if (ok && result) {
          // Geçmişe ekle
          addToHistory(qrData, result, result.valid, 'Online');
          
          if (result.valid) {
            setStatusMessage(`✅ Doğrulama başarılı: ${result.name || 'Bilinmeyen'}`);
            showVerificationModal(result, 'Online');
          } else {
            setStatusMessage(`❌ Geçersiz: ${result.error}`);
            Alert.alert('Doğrulama Başarısız', result.error || 'Geçersiz QR kod');
          }
        } else {
          // Başarısız denemeyi de geçmişe ekle
          addToHistory(qrData, null, false, 'Online');
          setStatusMessage(`❌ Hata: ${error}`);
          Alert.alert('Doğrulama Hatası', error || 'Bilinmeyen hata');
        }
      } else {
        // Offline doğrulama
        Alert.alert(
          'İnternet Bağlantısı Yok',
          'Cihazınızda offline doğrulama yapılacak.',
          [{ text: 'Tamam' }]
        );

        setStatusMessage('Cihazda doğrulanıyor (offline)...');
        const { ok, result, error } = await qrVerificationService.verifyOffline(qrData);

        if (ok && result) {
          // Geçmişe ekle
          addToHistory(qrData, result, result.valid, 'Offline');
          
          if (result.valid) {
            setStatusMessage(`✅ Offline doğrulama başarılı: ${result.name || 'Bilinmeyen'}`);
            showVerificationModal(result, 'Offline');
          } else {
            setStatusMessage(`❌ Geçersiz: ${result.error}`);
            Alert.alert('Doğrulama Başarısız', result.error || 'Geçersiz QR kod');
          }
        } else {
          // Başarısız denemeyi de geçmişe ekle
          addToHistory(qrData, null, false, 'Offline');
          setStatusMessage(`❌ Offline hata: ${error}`);
          Alert.alert('Offline Doğrulama Hatası', error || 'Bilinmeyen hata');
        }
      }
    } catch (err: any) {
      console.error('QR doğrulama hatası:', err);
      addToHistory(qrData, null, false, 'Error');
      setStatusMessage('Hata: ' + err.message);
      Alert.alert('Hata', err.message);
    }
  };

  const addToHistory = (qrCode: string, result: any, isSuccess: boolean, mode: string) => {
    const historyItem: QrScanHistory = {
      qrCode: qrCode.substring(0, 50), // İlk 50 karakter
      result,
      timestamp: new Date(),
      isSuccess,
      mode,
    };
    setScanHistory((prev) => [historyItem, ...prev.slice(0, 9)]); // Son 10 kayıt
  };

  const clearHistory = () => {
    setScanHistory([]);
    setStatusMessage('Geçmiş temizlendi');
  };

  const showVerificationModal = (result: any, mode: string) => {
    const params: any = {
      valid: result.valid ? 'true' : 'false',
      mode,
      name: result.name,
      membershipId: result.membershipId,
      memberId: result.memberId,
      status: result.status,
    };

    if (result.member) {
      params.profilePhoto = result.member.profilePhoto;
      params.associationName = result.member.associationName;
    }

    if (!result.valid) {
      params.error = result.error;
    }

    router.push({ pathname: '/modals/MemberInfoDialog', params });
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.messageText}>Kamera izni bekleniyor...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <MaterialCommunityIcons name="camera-off" size={64} color="#9CA3AF" />
        <Text style={styles.messageText}>Kamera erişimi reddedildi</Text>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={requestCameraPermission}
        >
          <Text style={styles.buttonText}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isScanning ? (
        <>
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              onBarcodeScanned={handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
            <View style={styles.cameraOverlay}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanHint}>QR kodu çerçeveye hizalayın</Text>
            </View>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.button, styles.buttonDanger]}
              onPress={stopScanning}
              disabled={isVerifying}
            >
              <MaterialCommunityIcons name="stop" size={24} color="#fff" />
              <Text style={styles.buttonText}>Taramayı Durdur</Text>
            </TouchableOpacity>

            {statusMessage && (
              <View style={styles.statusBox}>
                <Text style={styles.statusText}>{statusMessage}</Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <ScrollView 
          style={styles.scrollContainer} 
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <Image 
              source={require('../../assets/anef-logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>QR Kod Doğrulama</Text>
          </View>

          <Text style={styles.description}>
            Üye QR kodunu taramak için kamerayı açın ve kodu çerçeveye hizalayın.
          </Text>

          {statusMessage && (
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>{statusMessage}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={startScanning}
          >
            <MaterialCommunityIcons name="camera" size={24} color="#fff" />
            <Text style={styles.buttonText}>Kamerayı Aç</Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information" size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              İnternet varsa online, yoksa offline doğrulama yapılır.
            </Text>
          </View>

          {/* Okuma Geçmişi */}
          {scanHistory.length > 0 && (
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Okuma Geçmişi</Text>
                <TouchableOpacity onPress={clearHistory}>
                  <Text style={styles.clearText}>Temizle</Text>
                </TouchableOpacity>
              </View>
              
              {scanHistory.map((item, index) => (
                <View key={`${item.timestamp.getTime()}-${index}`} style={styles.historyItem}>
                  <MaterialCommunityIcons
                    name={item.isSuccess ? 'check-circle' : 'close-circle'}
                    size={24}
                    color={item.isSuccess ? '#10B981' : '#EF4444'}
                  />
                  <View style={styles.historyItemContent}>
                    <Text style={styles.historyItemTitle} numberOfLines={1}>
                      {item.result?.name || item.qrCode}
                    </Text>
                    <Text style={styles.historyItemSubtitle}>
                      {item.mode} • {item.timestamp.toLocaleTimeString('tr-TR')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logo: {
    width: 120,
    height: 120,
  },
  subtitle: {
    fontSize: 16,
    color: '#7C2D12',
    marginTop: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 24,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 32,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#7C2D12',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanHint: {
    fontSize: 16,
    color: '#fff',
    marginTop: 24,
    textAlign: 'center',
  },
  controls: {
    padding: 16,
    backgroundColor: '#fff',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  buttonPrimary: {
    backgroundColor: '#7C2D12',
  },
  buttonDanger: {
    backgroundColor: '#991B1B',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  statusBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  statusText: {
    fontSize: 14,
    color: '#92400E',
  },
  resultBox: {
    backgroundColor: '#E0E7FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  resultText: {
    fontSize: 14,
    color: '#312E81',
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginTop: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  historySection: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  clearText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  historyItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  historyItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  historyItemSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
