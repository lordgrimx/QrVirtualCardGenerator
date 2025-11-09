/**
 * NFC Servisi
 * react-native-nfc-manager wrapper
 */
import NfcManager, { NfcTech, Ndef, NfcEvents } from 'react-native-nfc-manager';
import { Platform } from 'react-native';
import { decodeNdefText, tryDecodeHexString, bytesToString } from '../utils/ndef';

export interface NfcCardData {
  uid?: string;
  uidHex?: string;
  cardType?: string;
  rawData?: number[];
  rawText?: string;
  isSuccess: boolean;
  errorMessage?: string;
  timestamp: Date;
}

class NfcService {
  private isInitialized = false;
  private isListening = false;

  /**
   * NFC'yi başlat
   */
  async start(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        console.log('NFC zaten başlatılmış');
        return true;
      }

      await NfcManager.start();
      this.isInitialized = true;
      console.log('✅ NFC başlatıldı');
      return true;
    } catch (error) {
      console.error('❌ NFC başlatma hatası:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * NFC'yi durdur
   */
  async stop(): Promise<void> {
    try {
      await this.unregisterTagEvent();
      if (this.isInitialized) {
        await NfcManager.cancelTechnologyRequest();
        this.isInitialized = false;
        console.log('✅ NFC durduruldu');
      }
    } catch (error) {
      console.warn('NFC durdurma hatası:', error);
    }
  }

  /**
   * NFC desteğini kontrol et
   */
  async isSupported(): Promise<boolean> {
    try {
      const supported = await NfcManager.isSupported();
      console.log(`NFC destegi: ${supported ? 'Evet' : 'Hayır'}`);
      return supported;
    } catch (error) {
      console.error('NFC destek kontrolü hatası:', error);
      return false;
    }
  }

  /**
   * NFC etkin mi kontrol et
   */
  async isEnabled(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const enabled = await NfcManager.isEnabled();
        console.log(`NFC etkin: ${enabled ? 'Evet' : 'Hayır'}`);
        return enabled;
      }
      // iOS'ta her zaman true döner
      return true;
    } catch (error) {
      console.error('NFC etkinlik kontrolü hatası:', error);
      return false;
    }
  }

  /**
   * Android ayarlarını aç
   */
  async openSettings(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await NfcManager.goToNfcSetting();
      }
    } catch (error) {
      console.error('NFC ayarları açma hatası:', error);
    }
  }

  /**
   * Tag event listener kaydet (otomatik okuma)
   */
  async registerTagEvent(
    onTagDetected: (cardData: NfcCardData) => void,
    alertMessage: string = 'Kartı yaklaştırın'
  ): Promise<void> {
    try {
      if (this.isListening) {
        console.log('Tag event zaten dinleniyor');
        return;
      }

      if (!this.isInitialized) {
        await this.start();
      }

      if (Platform.OS === 'ios') {
        // iOS: session bazlı, her okuma için yeniden başlatılır
        NfcManager.setEventListener(NfcEvents.DiscoverTag, async (tag) => {
          console.log('📱 iOS - Tag algılandı:', tag);
          const cardData = await this.processTag(tag);
          onTagDetected(cardData);
          
          // iOS'ta session'ı kapat
          try {
            await NfcManager.setAlertMessageIOS('Okuma tamamlandı');
            await NfcManager.invalidateSessionWithErrorIOS('Okuma tamamlandı');
          } catch (e) {
            console.warn('iOS session kapatma hatası:', e);
          }
        });

        // iOS session başlat
        await NfcManager.registerTagEvent({
          alertMessage,
          invalidateAfterFirstRead: true,
        });
      } else {
        // Android: sürekli dinleme
        NfcManager.setEventListener(NfcEvents.DiscoverTag, async (tag) => {
          console.log('🤖 Android - Tag algılandı:', tag);
          const cardData = await this.processTag(tag);
          onTagDetected(cardData);
        });

        await NfcManager.registerTagEvent();
      }

      this.isListening = true;
      console.log('✅ Tag event listener kaydedildi');
    } catch (error) {
      console.error('❌ Tag event kaydetme hatası:', error);
      this.isListening = false;
      throw error;
    }
  }

  /**
   * Tag event listener'ı kaldır
   */
  async unregisterTagEvent(): Promise<void> {
    try {
      if (!this.isListening) {
        return;
      }

      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      await NfcManager.unregisterTagEvent();
      this.isListening = false;
      console.log('✅ Tag event listener kaldırıldı');
    } catch (error) {
      console.warn('Tag event kaldırma hatası:', error);
    }
  }

  /**
   * Manuel kart okuma (tek seferlik)
   */
  async readCardOnce(alertMessage: string = 'Kartı yaklaştırın'): Promise<NfcCardData> {
    try {
      if (!this.isInitialized) {
        await this.start();
      }

      console.log('🔍 Manuel kart okuma başlatıldı...');

      if (Platform.OS === 'ios') {
        // iOS: session başlat ve bekle
        const tag = await NfcManager.requestTechnology(NfcTech.Ndef, {
          alertMessage,
        });
        console.log('📱 iOS - Tag okundu:', tag);
        const cardData = await this.processTag(tag);
        
        // Session'ı kapat
        try {
          await NfcManager.setAlertMessageIOS('Okuma tamamlandı');
          await NfcManager.cancelTechnologyRequest();
        } catch (e) {
          console.warn('iOS session kapatma hatası:', e);
        }
        
        return cardData;
      } else {
        // Android: technology request
        await NfcManager.requestTechnology(NfcTech.Ndef);
        const tag = await NfcManager.getTag();
        console.log('🤖 Android - Tag okundu:', tag);
        const cardData = await this.processTag(tag);
        
        await NfcManager.cancelTechnologyRequest();
        return cardData;
      }
    } catch (error: any) {
      console.error('❌ Manuel kart okuma hatası:', error);
      
      // Cleanup
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (e) {
        // Ignore
      }

      return {
        isSuccess: false,
        errorMessage: error?.message || 'Kart okunamadı',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Tag verilerini işle ve NfcCardData'ya çevir
   */
  private async processTag(tag: any): Promise<NfcCardData> {
    try {
      // UID'yi platform bağımsız ve güvenilir şekilde üret
      const tagId: any = tag?.id;
      let uidString: string | undefined;
      let uidHex: string | undefined;

      if (typeof tagId === 'string') {
        // Android çoğunlukla düz HEX string döndürür (örn: "0418D3A1672681")
        const cleaned = tagId.replace(/[^0-9a-fA-F]/g, '');
        uidString = cleaned.toUpperCase();
        const pairs = cleaned.match(/.{1,2}/g) || [];
        uidHex = pairs.map(p => p.toUpperCase()).join(':');
      } else if (Array.isArray(tagId)) {
        // Bazı cihazlar byte array döndürebilir
        const bytes: number[] = tagId as number[];
        uidHex = bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
        uidString = bytes.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      } else {
        uidString = undefined;
        uidHex = undefined;
      }

      let rawData: number[] = [];
      let rawText: string | undefined;

      // NDEF mesajını çözümle
      if (tag.ndefMessage && tag.ndefMessage.length > 0) {
        const record = tag.ndefMessage[0];
        
        if (record.payload) {
          rawData = record.payload;
          
          // Önce NDEF Text decode dene
          const ndefText = decodeNdefText(rawData);
          if (ndefText) {
            rawText = ndefText;
            console.log('✅ NDEF Text decoded:', rawText.substring(0, 100));
          } else {
            // Hex string dene
            const hexText = tryDecodeHexString(rawData);
            if (hexText) {
              rawText = hexText;
              console.log('✅ Hex string decoded:', rawText.substring(0, 100));
            } else {
              // Son çare: UTF-8
              rawText = bytesToString(rawData);
              console.log('✅ Raw UTF-8:', rawText.substring(0, 100));
            }
          }
        }
      }

      const cardType = tag.techTypes ? tag.techTypes[0] : 'Unknown';

      return {
        uid: uidString,
        uidHex,
        cardType,
        rawData,
        rawText,
        isSuccess: true,
        timestamp: new Date(),
      };
    } catch (error: any) {
      console.error('❌ Tag işleme hatası:', error);
      return {
        isSuccess: false,
        errorMessage: error?.message || 'Tag işlenemedi',
        timestamp: new Date(),
      };
    }
  }
}

// Singleton instance
export const nfcService = new NfcService();

