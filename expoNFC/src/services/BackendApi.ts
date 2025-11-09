/**
 * Backend API servisi
 * Çoklu baseURL fallback desteği ile MAUI BackendApiService eşdeğeri
 */
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NfcDecryptResult,
  QrVerificationResult,
  MemberInfo,
  MemberDetails,
} from './types';

const STORAGE_KEY_BACKEND_URL = 'BackendBaseUrl';

class BackendApiService {
  private backendUrls: string[];
  private activeBaseUrl: string;
  private timeout = 10000; // 10 saniye

  constructor() {
    // Backend URL'lerini extra config'den al
    const extraUrls = Constants.expoConfig?.extra?.backendBaseUrls || [];
    
    this.backendUrls = extraUrls.filter(
      (url: string | undefined) => url && url.trim()
    );

    // Fallback: Hiç URL yoksa varsayılanları ekle
    if (this.backendUrls.length === 0) {
      this.backendUrls = [
        'https://backend.anefuye.com.tr',
        'http://10.0.2.2:8000',
        'http://localhost:8000',
      ];
    }

    this.activeBaseUrl = this.backendUrls[0];
    console.log('Backend URL\'leri:', this.backendUrls);
    console.log('Aktif başlangıç URL:', this.activeBaseUrl);

    // Önceki başarılı URL'i yükle
    this.loadLastSuccessfulUrl();
  }

  private async loadLastSuccessfulUrl() {
    try {
      const lastUrl = await AsyncStorage.getItem(STORAGE_KEY_BACKEND_URL);
      if (lastUrl && this.backendUrls.includes(lastUrl)) {
        this.activeBaseUrl = lastUrl;
        console.log('Önceki başarılı URL yüklendi:', lastUrl);
      }
    } catch (error) {
      console.warn('Last successful URL yüklenemedi:', error);
    }
  }

  private async saveSuccessfulUrl(url: string) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_BACKEND_URL, url);
      this.activeBaseUrl = url;
    } catch (error) {
      console.warn('Successful URL kaydedilemedi:', error);
    }
  }

  /**
   * Birden fazla backend URL'ini sırayla deneyen yardımcı metod
   */
  private async tryMultipleBackends<T>(
    requestFunc: (baseUrl: string) => Promise<{ success: boolean; result?: T; error?: string }>
  ): Promise<{ ok: boolean; result?: T; error?: string }> {
    const errors: string[] = [];

    // Önce aktif URL'i dene (daha önce başarılı olmuşsa)
    if (this.activeBaseUrl) {
      try {
        console.log(`🔄 Öncelikli backend: ${this.activeBaseUrl}`);
        const { success, result, error } = await requestFunc(this.activeBaseUrl);

        if (success && result !== undefined) {
          console.log(`✅ Backend başarılı: ${this.activeBaseUrl}`);
          return { ok: true, result };
        }
        
        console.warn(`❌ Öncelikli backend başarısız: ${error}`);
        errors.push(`${this.activeBaseUrl}: ${error}`);
      } catch (ex: any) {
        console.warn(`❌ Öncelikli backend hatası: ${ex.message}`);
        errors.push(`${this.activeBaseUrl}: ${ex.message}`);
      }
    }

    // Aktif URL başarısızsa, diğerlerini dene
    for (const baseUrl of this.backendUrls) {
      if (baseUrl === this.activeBaseUrl) continue; // Zaten denedik

      try {
        console.log(`🔄 Alternatif backend deneniyor: ${baseUrl}`);
        const { success, result, error } = await requestFunc(baseUrl);

        if (success && result !== undefined) {
          console.log(`✅ Backend başarılı: ${baseUrl}`);
          await this.saveSuccessfulUrl(baseUrl);
          return { ok: true, result };
        }

        console.warn(`❌ Backend başarısız (${baseUrl}): ${error}`);
        errors.push(`${baseUrl}: ${error}`);
      } catch (ex: any) {
        console.warn(`❌ Backend bağlantı hatası (${baseUrl}): ${ex.message}`);
        errors.push(`${baseUrl}: ${ex.message}`);
      }
    }

    const combinedError = `Tüm backend URL'leri başarısız:\n${errors.join('\n')}`;
    console.error(combinedError);
    return { ok: false, error: combinedError };
  }

  /**
   * Fetch helper with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ExpoNfcReader/1.0',
          Accept: 'application/json',
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Public key al
   */
  async getPublicKey(): Promise<{ ok: boolean; publicKeyPem?: string; error?: string }> {
    return this.tryMultipleBackends<string>(async (baseUrl) => {
      const url = `${baseUrl}/api/qr/public-key`;
      console.log('Backend URL:', url);

      const resp = await this.fetchWithTimeout(url);
      console.log('HTTP Status:', resp.status);

      if (!resp.ok) {
        const errorContent = await resp.text();
        console.error(`HTTP Error ${resp.status}: ${errorContent}`);
        return { success: false, error: `HTTP ${resp.status}: ${errorContent}` };
      }

      const json = await resp.json();
      console.log('Public key response:', json);

      if (json?.success && json?.public_key) {
        return { success: true, result: json.public_key };
      }

      return {
        success: false,
        error: `Geçersiz yanıt - Success: ${json?.success}, PublicKey: ${!!json?.public_key}`,
      };
    });
  }

  /**
   * QR doğrulama
   */
  async verifyQr(
    qrData: string
  ): Promise<{ ok: boolean; result?: QrVerificationResult; error?: string }> {
    return this.tryMultipleBackends<QrVerificationResult>(async (baseUrl) => {
      const url = `${baseUrl}/api/qr/verify`;
      const payload = { qr_code: qrData };

      const resp = await this.fetchWithTimeout(url, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        return { success: false, error: `HTTP ${resp.status}` };
      }

      const json = await resp.json();

      if (json?.success) {
        return {
          success: true,
          result: {
            valid: json.valid,
            error: json.error,
            memberId: json.member?.memberId || json.member_data?.member_id,
            membershipId: json.member?.membershipId || json.member_data?.membership_id,
            name: json.member?.name || json.member_data?.name,
            status: json.member?.status || json.member_data?.status,
            member: json.member ? {
              membershipId: json.member.membershipId,
              name: json.member.name,
              fullName: json.member.fullName,
              email: json.member.email,
              phoneNumber: json.member.phoneNumber,
              role: json.member.role,
              status: json.member.status,
              membershipType: json.member.membershipType,
              expirationDate: json.member.expiresAt,
              joinDate: json.member.joinDate,
              fromDatabase: json.member.fromDatabase,
              profilePhoto: json.member.profilePhoto,
              associationName: json.member.associationName,
            } : undefined,
          },
        };
      }

      // USER_NOT_FOUND özel durumu: Backend'e ulaştı ama kullanıcı DB'de yok
      if (json?.error === 'USER_NOT_FOUND') {
        return {
          success: true,
          result: {
            valid: false,
            error: json.message || 'Kullanıcı bulunamadı',
            membershipId: json.membershipId,
          },
        };
      }

      return { success: false, error: json?.error || json?.message || 'Doğrulama başarısız' };
    });
  }

  /**
   * NFC şifre çözme ve doğrulama
   */
  async decryptNfc(
    encryptedData: string,
    deviceInfo?: string
  ): Promise<{ ok: boolean; result?: NfcDecryptResult; error?: string }> {
    return this.tryMultipleBackends<NfcDecryptResult>(async (baseUrl) => {
      const url = `${baseUrl}/api/nfc/decrypt`;
      const payload = { encryptedData, deviceInfo };

      const resp = await this.fetchWithTimeout(url, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        return { success: false, error: `HTTP ${resp.status}` };
      }

      const json = await resp.json();

      if (json?.success) {
              const result: NfcDecryptResult = {
          valid: json.valid,
          error: json.error,
          member: json.member
            ? {
                membershipId: json.member.membershipId,
                name: json.member.name,
                fullName: json.member.fullName,
                email: json.member.email,
                phoneNumber: json.member.phoneNumber,
                role: json.member.role,
                status: json.member.status,
                membershipType: json.member.membershipType,
                expirationDate: json.member.expirationDate,
                joinDate: json.member.joinDate,
                fromDatabase: json.member.fromDatabase,
                profilePhoto: json.member.profilePhoto,
                associationName: json.member.associationName,
                associationId: json.member.associationId,
              }
            : undefined,
          verificationTime: json.verificationTime,
        };
        return { success: true, result };
      }

      // USER_NOT_FOUND özel durumu: Backend'e ulaştı ama kullanıcı DB'de yok
      // Bu durumda diğer backend'leri denememeli, direkt başarısız sonuç döndürmeli
      if (json?.error === 'USER_NOT_FOUND') {
        const result: NfcDecryptResult = {
          valid: false,
          error: json.message || 'Kullanıcı bulunamadı',
        };
        return { success: true, result }; // success: true çünkü backend'e ulaştık
      }

      return {
        success: false,
        error: json?.error || json?.message || 'NFC şifre çözme başarısız',
      };
    });
  }

  /**
   * Üye arama
   */
  async searchMembers(
    query: string
  ): Promise<{ ok: boolean; members?: MemberInfo[]; error?: string }> {
    return this.tryMultipleBackends<MemberInfo[]>(async (baseUrl) => {
      const url = query
        ? `${baseUrl}/api/members/search?q=${encodeURIComponent(query)}&limit=20`
        : `${baseUrl}/api/members?limit=20`;

      const resp = await this.fetchWithTimeout(url);

      if (!resp.ok) {
        return { success: false, error: `HTTP ${resp.status}` };
      }

      const json = await resp.json();

      if (json?.success && json.members) {
        const members = json.members.map((m: any) => ({
          memberId: m.member_id,
          membershipId: m.membership_id,
          name: m.name,
          status: m.status,
        }));
        return { success: true, result: members };
      }

      return { success: false, error: json?.error || 'Üye aranamadı' };
    });
  }
}

// Singleton instance
export const backendApi = new BackendApiService();

