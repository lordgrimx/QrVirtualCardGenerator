/**
 * NFC Okuyucu Ekranı
 * Otomatik ve manuel NFC okuma, backend/offline doğrulama
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  FlatList,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { nfcService, NfcCardData } from '../../src/services/NfcService';
import { backendApi } from '../../src/services/BackendApi';
import { qrVerificationService } from '../../src/services/QrVerificationService';
import { decryptNfcData, validateNfcData, verifyNfcSignatureOffline } from '../../src/utils/cryptoLite';

export default function NfcScreen() {
  const router = useRouter();
  const [isNfcStarted, setIsNfcStarted] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Hazır');
  const [lastCard, setLastCard] = useState<NfcCardData | null>(null);
  const [readHistory, setReadHistory] = useState<NfcCardData[]>([]);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  useEffect(() => {
    // NFC desteğini kontrol et
    checkNfcSupport();
    
    // Backend bağlantısını kontrol et
    checkBackendConnection();

    return () => {
      // Cleanup
      stopNfc();
    };
  }, []);

  const checkBackendConnection = async () => {
    try {
      const { ok } = await backendApi.getPublicKey();
      setIsBackendConnected(ok);
    } catch {
      setIsBackendConnected(false);
    }
  };

  const checkNfcSupport = async () => {
    const supported = await nfcService.isSupported();
    if (!supported) {
      Alert.alert('NFC Desteklenmiyor', 'Bu cihazda NFC özelliği bulunmamaktadır.');
      setStatusMessage('NFC desteklenmiyor');
      return;
    }

    const enabled = await nfcService.isEnabled();
    if (!enabled) {
      Alert.alert(
        'NFC Kapalı',
        'NFC özelliği kapalı. Lütfen cihaz ayarlarından NFC\'yi açın.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Ayarları Aç', onPress: () => nfcService.openSettings() },
        ]
      );
      setStatusMessage('NFC kapalı - Ayarlardan açın');
    }
  };

  const startNfc = async () => {
    try {
      setStatusMessage('NFC başlatılıyor...');
      const started = await nfcService.start();
      if (!started) {
        setStatusMessage('NFC başlatılamadı');
        Alert.alert('Hata', 'NFC başlatılamadı. Lütfen tekrar deneyin.');
        return;
      }

      // Otomatik okuma için tag event kaydı
      await nfcService.registerTagEvent(handleCardDetected, 'Kartı yaklaştırın');

      setIsNfcStarted(true);
      setStatusMessage('NFC aktif - Kart yerleştirin');
    } catch (error: any) {
      console.error('NFC başlatma hatası:', error);
      setStatusMessage('Hata: ' + error.message);
      Alert.alert('Hata', 'NFC başlatılamadı: ' + error.message);
    }
  };

  const stopNfc = async () => {
    try {
      await nfcService.stop();
      setIsNfcStarted(false);
      setStatusMessage('NFC durduruldu');
    } catch (error: any) {
      console.error('NFC durdurma hatası:', error);
    }
  };

  const handleCardDetected = async (cardData: NfcCardData) => {
    console.log('📇 Kart algılandı:', cardData);

    if (!cardData.isSuccess) {
      // Okuma başarısız - hemen geçmişe ekle
      setLastCard(cardData);
      setReadHistory((prev) => [cardData, ...prev.slice(0, 9)]);
      setStatusMessage('Okuma hatası: ' + cardData.errorMessage);
      return;
    }

    setStatusMessage(`Kart okundu: ${cardData.uidHex || 'UID yok'}`);

    // Otomatik doğrulama akışı - sonuca göre geçmişe ekle
    if (cardData.rawText) {
      await verifyCardData(cardData.rawText, cardData);
    }
  };

  const readCardManually = async () => {
    try {
      setIsReading(true);
      setStatusMessage('Kartı yaklaştırın...');

      const cardData = await nfcService.readCardOnce('Kartı yaklaştırın');
      
      setIsReading(false);
      handleCardDetected(cardData);
    } catch (error: any) {
      setIsReading(false);
      console.error('Manuel okuma hatası:', error);
      setStatusMessage('Okuma hatası: ' + error.message);
      Alert.alert('Okuma Hatası', error.message);
    }
  };

  const verifyCardData = async (rawText: string, cardData: NfcCardData) => {
    try {
      setStatusMessage('Sunucuda doğrulanıyor...');

      // Önce backend'i dene
      const { ok, result, error } = await backendApi.decryptNfc(
        rawText,
        `${Platform.OS} ${Platform.Version}`
      );

      if (ok && result) {
        // Backend başarılı
        setIsBackendConnected(true);
        
        // Doğrulama sonucuna göre kart verilerini güncelle
        const updatedCardData = {
          ...cardData,
          isSuccess: result.valid, // Kullanıcı bulunamadıysa false olacak
          errorMessage: result.valid ? undefined : result.error,
        };
        
        setLastCard(updatedCardData);
        setReadHistory((prev) => [updatedCardData, ...prev.slice(0, 9)]);
        
        setStatusMessage(
          result.valid
            ? `✅ Doğrulama başarılı: ${result.member?.name || 'Bilinmeyen'}`
            : `❌ Geçersiz: ${result.error}`
        );

        // Modal göster (başarılı veya başarısız)
        showMemberInfoModal(result, 'Online Backend');
        return;
      }

      // Backend başarısız - hata olarak kaydet
      const failedCardData = {
        ...cardData,
        isSuccess: false,
        errorMessage: error || 'Backend bağlantı hatası',
      };
      setLastCard(failedCardData);
      setReadHistory((prev) => [failedCardData, ...prev.slice(0, 9)]);
      setIsBackendConnected(false);

      // Backend başarısız, offline dene
      console.warn('Backend başarısız, offline doğrulama yapılıyor:', error);
      setStatusMessage('Cihazda doğrulanıyor (offline)...');

      const offlineResult = await verifyOffline(rawText);
      
      // Offline sonucuna göre güncelle
      const offlineCardData = {
        ...cardData,
        isSuccess: offlineResult.valid,
        errorMessage: offlineResult.valid ? undefined : offlineResult.error,
      };
      setLastCard(offlineCardData);
      setReadHistory((prev) => {
        // Önceki başarısız kaydı kaldır, güncel sonucu ekle
        const filtered = prev.filter(c => c.timestamp !== cardData.timestamp);
        return [offlineCardData, ...filtered.slice(0, 9)];
      });
      
      if (offlineResult.valid) {
        setStatusMessage(`✅ Offline doğrulama başarılı: ${offlineResult.name}`);
        showMemberInfoModal(offlineResult, 'Offline');
      } else {
        setStatusMessage(`❌ Offline doğrulama başarısız: ${offlineResult.error}`);
        Alert.alert('Doğrulama Başarısız', offlineResult.error || 'Bilinmeyen hata');
      }
    } catch (err: any) {
      console.error('Doğrulama hatası:', err);
      const errorCardData = {
        ...cardData,
        isSuccess: false,
        errorMessage: err.message,
      };
      setLastCard(errorCardData);
      setReadHistory((prev) => [errorCardData, ...prev.slice(0, 9)]);
      setStatusMessage('Doğrulama hatası: ' + err.message);
    }
  };

  const verifyOffline = async (encryptedData: string) => {
    try {
      // XOR + Base64 çöz
      const decryptedJson = decryptNfcData(encryptedData);
      if (!decryptedJson) {
        return { valid: false, error: 'Veri çözülemedi' };
      }

      // Validasyon
      const validation = validateNfcData(decryptedJson);
      if (!validation.valid) {
        return { valid: false, error: validation.error };
      }

      const nfcData = validation.data!;

      // İmza kontrolü
      const signatureValid = verifyNfcSignatureOffline(nfcData);
      if (!signatureValid) {
        return { valid: false, error: 'Dijital imza doğrulanamadı' };
      }

      return {
        valid: true,
        name: nfcData.name,
        membershipId: nfcData.mid,
        status: 'Active (Offline)',
      };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  };

  const showMemberInfoModal = (result: any, mode: string) => {
    const params: any = {
      valid: result.valid ? 'true' : 'false',
      mode,
    };

    if (result.member) {
      params.name = result.member.fullName || result.member.name;
      params.membershipId = result.member.membershipId;
      params.status = result.member.status;
      params.email = result.member.email;
      params.phoneNumber = result.member.phoneNumber;
      params.role = result.member.role;
      params.membershipType = result.member.membershipType;
      params.expirationDate = result.member.expirationDate;
      params.joinDate = result.member.joinDate;
      params.fromDatabase = result.member.fromDatabase ? 'true' : 'false';
      params.verificationTime = result.verificationTime;
      params.profilePhoto = result.member.profilePhoto;
      params.associationName = result.member.associationName;
    } else {
      params.name = result.name;
      params.membershipId = result.membershipId;
      params.status = result.status;
    }

    if (!result.valid) {
      params.error = result.error;
    }

    router.push({ pathname: '/modals/MemberInfoDialog', params });
  };

  const clearHistory = () => {
    setReadHistory([]);
    setLastCard(null);
    setStatusMessage('Geçmiş temizlendi');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* ANEF Header */}
      <View style={styles.header}>
        <Image 
          source={require('../../assets/anef-logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerSubtitle}>NFC Okuyucu</Text>
      </View>

      {/* Durum Göstergeleri */}
      <View style={styles.statusRow}>
        {/* Backend Durumu */}
        <View style={styles.statusItem}>
          <View style={styles.statusIconContainer}>
            <MaterialCommunityIcons name="server" size={32} color="#6B7280" />
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isBackendConnected ? '#10B981' : '#EF4444' },
              ]}
            />
          </View>
          <Text style={styles.statusLabel}>Sunucu</Text>
          <Text style={styles.statusValue}>
            {isBackendConnected ? 'Bağlı' : 'Çevrimdışı'}
          </Text>
        </View>

        {/* NFC Durumu */}
        <View style={styles.statusItem}>
          <View style={styles.statusIconContainer}>
            <MaterialCommunityIcons name="card-bulleted" size={32} color="#6B7280" />
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isNfcStarted ? '#10B981' : '#EF4444' },
              ]}
            />
          </View>
          <Text style={styles.statusLabel}>NFC</Text>
          <Text style={styles.statusValue}>
            {isNfcStarted ? 'Aktif' : 'Kapalı'}
          </Text>
        </View>
      </View>

      {/* Durum Mesajı */}
      <View style={styles.messageCard}>
        <Text style={styles.messageText}>{statusMessage}</Text>
      </View>

      {/* Kontrol Butonu */}
      <TouchableOpacity
        style={[
          styles.mainButton,
          isNfcStarted && styles.mainButtonActive,
        ]}
        onPress={isNfcStarted ? stopNfc : startNfc}
      >
        <MaterialCommunityIcons
          name={isNfcStarted ? 'stop-circle' : 'play-circle'}
          size={28}
          color="#fff"
        />
        <Text style={styles.mainButtonText}>
          {isNfcStarted ? 'NFC\'yi Durdur' : 'NFC\'yi Başlat'}
        </Text>
      </TouchableOpacity>

      {/* Son Okuma */}
      {lastCard && (
        <View style={styles.lastReadCard}>
          <Text style={styles.sectionTitle}>Son Okuma</Text>
          <View style={styles.cardInfo}>
            <InfoItem label="UID" value={lastCard.uidHex || 'N/A'} />
            <InfoItem label="Kart Türü" value={lastCard.cardType || 'Bilinmeyen'} />
            <InfoItem
              label="Durum"
              value={lastCard.isSuccess ? 'Başarılı' : 'Hata'}
              valueColor={lastCard.isSuccess ? '#10B981' : '#EF4444'}
            />
            <InfoItem
              label="Zaman"
              value={lastCard.timestamp.toLocaleTimeString('tr-TR')}
            />
          </View>
        </View>
      )}

      {/* Okuma Geçmişi */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Okuma Geçmişi</Text>
          {readHistory.length > 0 && (
            <TouchableOpacity onPress={clearHistory}>
              <Text style={styles.clearText}>Temizle</Text>
            </TouchableOpacity>
          )}
        </View>

        {readHistory.length === 0 ? (
          <Text style={styles.emptyText}>Henüz okuma yapılmadı</Text>
        ) : (
          readHistory.slice(0, 5).map((item, index) => (
            <View key={`${item.timestamp.getTime()}-${index}`} style={styles.historyItem}>
              <MaterialCommunityIcons
                name={item.isSuccess ? 'check-circle' : 'close-circle'}
                size={24}
                color={item.isSuccess ? '#10B981' : '#EF4444'}
              />
              <View style={styles.historyItemText}>
                <Text style={styles.historyItemTitle}>
                  {item.uidHex || 'UID yok'}
                </Text>
                <Text style={styles.historyItemSubtitle}>
                  {item.timestamp.toLocaleString('tr-TR')}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

interface InfoItemProps {
  label: string;
  value: string;
  valueColor?: string;
}

function InfoItem({ label, value, valueColor }: InfoItemProps) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
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
  headerSubtitle: {
    fontSize: 16,
    color: '#7C2D12',
    marginTop: 8,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statusItem: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusIconContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  statusDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  messageCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  messageText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C2D12',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  mainButtonActive: {
    backgroundColor: '#991B1B',
  },
  mainButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  lastReadCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  cardInfo: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  historySection: {
    flex: 1,
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
  clearText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 24,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  historyItemText: {
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
