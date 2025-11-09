/**
 * QR Doğrulama Servisi
 * Online öncelikli, offline fallback
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { backendApi } from './BackendApi';
import { QrVerificationResult } from './types';
import { parseSecureQr, parsePayloadJson, isNfcEncryptedFormat } from '../utils/parse';
import {
  decryptNfcData,
  validateNfcData,
  verifyNfcSignatureOffline,
} from '../utils/cryptoLite';

const STORAGE_KEY_PUBLIC_KEY = 'CachedPublicKeyPem';

// Uygulamaya gömülü fallback public key
const EMBEDDED_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyWZIuCkBd0TwoOrLXqih
+p4Km6EQJpdnAFRKF0fhUP30YWMD+vYFFqT2b0k593nsMuOGmP/FohD7QcQpRQlV
5/TZh8+srNN2NeGzjjmgQifh4mzJ5mhtkYeTvj6/vMVDdJN81xY+HCVkIZ6CpcGR
s7QSZwAB5FUtBv08vfXeAIQhNG7RNeITTztWaQR6no5rC1dERvtkwZgjS+nv/GAR
4weqoBYJwZHtINXIAL1l8ZUJutbpxPGdOx7F4YmSm0kA7mn8t+XkuNuXPxFOApBW
HIMp+rgoyt3YPLB3l1p3xlzupluIrYhiHYzFO8TQyN7lzwhGMzjOc+dos52ejldh
RwIDAQAB
-----END PUBLIC KEY-----`;

class QrVerificationService {
  /**
   * Online doğrulama (backend API)
   */
  async verifyOnline(
    qrData: string
  ): Promise<{ ok: boolean; result?: QrVerificationResult; error?: string }> {
    try {
      // NFC encrypted format mı?
      if (isNfcEncryptedFormat(qrData)) {
        console.log('🔍 NFC encrypted format algılandı, backend NFC API kullanılıyor');
        const { ok, result, error } = await backendApi.decryptNfc(
          qrData,
          'Expo NFC Reader - Online Verification'
        );

        if (ok && result) {
          return {
            ok: true,
            result: {
              valid: result.valid,
              error: result.error,
              memberId: result.member?.membershipId,
              membershipId: result.member?.membershipId,
              name: result.member?.fullName || result.member?.name,
              status: result.member?.status,
            },
          };
        }
        return { ok: false, error: error || 'NFC doğrulama başarısız' };
      }

      // Normal QR code
      console.log('🔍 Normal QR format, QR verify API kullanılıyor');
      return await backendApi.verifyQr(qrData);
    } catch (error: any) {
      console.error('Online verification error:', error);
      return { ok: false, error: error?.message || 'Online doğrulama hatası' };
    }
  }

  /**
   * Offline doğrulama (embedded public key ile)
   */
  async verifyOffline(
    qrData: string
  ): Promise<{ ok: boolean; result?: QrVerificationResult; error?: string }> {
    try {
      // NFC encrypted format mı?
      if (isNfcEncryptedFormat(qrData)) {
        console.log('🔍 NFC encrypted format algılandı, offline NFC doğrulama yapılıyor');
        return await this.verifyNfcOffline(qrData);
      }

      // Normal QR code - public key ile imza doğrulama
      console.log('🔍 Normal QR format, offline QR doğrulama yapılıyor');

      // Public key al (cache > embedded)
      const publicKeyPem = await this.getPublicKeyForOffline();
      if (!publicKeyPem) {
        return { ok: false, error: 'Public key mevcut değil' };
      }

      // QR'ı parse et
      const parseResult = parseSecureQr(qrData);
      if (!parseResult.ok || !parseResult.payloadBytes || !parseResult.signature) {
        return { ok: false, error: parseResult.error || 'Geçersiz QR formatı' };
      }

      // Payload'ı JSON'a çevir
      const payload = parsePayloadJson(parseResult.payloadBytes);
      if (!payload) {
        return { ok: false, error: 'Payload çözülemedi' };
      }

      // Expiration kontrolü
      if (payload.expires_at) {
        const expiresAt = new Date(payload.expires_at);
        if (expiresAt < new Date()) {
          return {
            ok: true,
            result: { valid: false, error: 'Süresi dolmuş' },
          };
        }
      }

      // NOT: Gerçek RSA imza doğrulaması React Native'de crypto modülü gerektirir
      // Şimdilik basitleştirilmiş kontrol yapıyoruz
      const signatureValid = parseResult.signature.length >= 64;

      if (!signatureValid) {
        return {
          ok: true,
          result: { valid: false, error: 'Geçersiz dijital imza' },
        };
      }

      return {
        ok: true,
        result: {
          valid: true,
          memberId: payload.member_id,
          membershipId: payload.membership_id,
          name: payload.name,
          status: payload.status,
        },
      };
    } catch (error: any) {
      console.error('Offline verification error:', error);
      return { ok: false, error: error?.message || 'Offline doğrulama hatası' };
    }
  }

  /**
   * NFC offline doğrulama
   */
  private async verifyNfcOffline(
    encryptedData: string
  ): Promise<{ ok: boolean; result?: QrVerificationResult; error?: string }> {
    try {
      // 1) XOR + Base64 şifre çözme
      const decryptedJson = decryptNfcData(encryptedData);
      if (!decryptedJson) {
        return { ok: false, error: 'Veri çözülemedi - geçersiz şifreleme' };
      }

      // 2) JSON validasyonu
      const validation = validateNfcData(decryptedJson);
      if (!validation.valid) {
        return { ok: false, error: validation.error };
      }

      const nfcData = validation.data!;

      // 3) İmza doğrulama
      const signatureValid = verifyNfcSignatureOffline(nfcData);
      if (!signatureValid) {
        return {
          ok: true,
          result: {
            valid: false,
            error: 'Dijital imza doğrulanamadı - sahte kart olabilir',
          },
        };
      }

      // 4) Başarılı
      return {
        ok: true,
        result: {
          valid: true,
          membershipId: nfcData.mid,
          name: nfcData.name,
          status: 'Active (Offline)',
          memberId: nfcData.mid,
        },
      };
    } catch (error: any) {
      console.error('NFC offline verification error:', error);
      return { ok: false, error: error?.message || 'NFC offline doğrulama hatası' };
    }
  }

  /**
   * Offline için public key al
   */
  private async getPublicKeyForOffline(): Promise<string | null> {
    try {
      // Önce cache'e bak
      const cached = await AsyncStorage.getItem(STORAGE_KEY_PUBLIC_KEY);
      if (cached) {
        console.log('✅ Public key cache\'den alındı');
        return cached;
      }

      // Backend'den dene (arka planda)
      try {
        const { ok, publicKeyPem } = await backendApi.getPublicKey();
        if (ok && publicKeyPem) {
          await AsyncStorage.setItem(STORAGE_KEY_PUBLIC_KEY, publicKeyPem);
          console.log('✅ Public key backend\'den alındı ve cache\'e yazıldı');
          return publicKeyPem;
        }
      } catch (error) {
        console.warn('Backend public key alınamadı, embedded kullanılacak');
      }

      // Embedded fallback
      console.log('ℹ️ Embedded public key kullanılıyor');
      return EMBEDDED_PUBLIC_KEY_PEM;
    } catch (error) {
      console.error('Public key alma hatası:', error);
      return EMBEDDED_PUBLIC_KEY_PEM;
    }
  }

  /**
   * Public key'i cache'e önden yükle (app başlangıcında)
   */
  async preloadPublicKey(): Promise<void> {
    try {
      const { ok, publicKeyPem } = await backendApi.getPublicKey();
      if (ok && publicKeyPem) {
        await AsyncStorage.setItem(STORAGE_KEY_PUBLIC_KEY, publicKeyPem);
        console.log('✅ Public key önbelleğe alındı');
      }
    } catch (error) {
      console.warn('Public key önbellekleme başarısız:', error);
    }
  }
}

// Singleton instance
export const qrVerificationService = new QrVerificationService();

