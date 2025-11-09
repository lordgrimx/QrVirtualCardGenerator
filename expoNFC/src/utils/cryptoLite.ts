/**
 * NFC_ENC_V1 formatındaki şifreli veriyi çözer
 * XOR + Base64 tabanlı hafif şifreleme
 */
import { decode as atob } from 'base-64';

export function decryptNfcData(encryptedData: string): string | null {
  try {
    if (!encryptedData?.startsWith('NFC_ENC_V1:')) {
      // Şifrelenmiş değil, olduğu gibi döndür
      return encryptedData;
    }

    // Prefix'i kaldır
    const encryptedB64 = encryptedData.slice(11);

    // Base64 decode
    const binaryString = atob(encryptedB64);

    // XOR anahtarı (MAUI ile aynı)
    const key = 'NFC_SECURE_2024_CRYPTO_KEY_ADVANCED';
    let decryptedString = '';

    // XOR ile çöz
    for (let i = 0; i < binaryString.length; i++) {
      const encryptedByte = binaryString.charCodeAt(i);
      const keyByte = key.charCodeAt(i % key.length);
      const decryptedByte = encryptedByte ^ keyByte;
      decryptedString += String.fromCharCode(decryptedByte);
    }

    return decryptedString;
  } catch (error) {
    console.error('NFC data decryption error:', error);
    return null;
  }
}

/**
 * NFC imza format kontrolü (basitleştirilmiş offline doğrulama)
 */
export function verifyNfcSignatureOffline(nfcData: Record<string, any>): boolean {
  try {
    const signature = nfcData.sig;
    if (!signature || typeof signature !== 'string') {
      console.warn('❌ Signature field bulunamadı');
      return false;
    }

    console.log('🔍 Offline signature check:', signature);

    if (signature.length < 10) {
      console.warn(`❌ Signature çok kısa: ${signature.length}`);
      return false;
    }

    // Base64 formatı kontrolü
    try {
      // URL-safe base64 karakterlerini düzelt
      let cleanSignature = signature.replace(/-/g, '+').replace(/_/g, '/');
      
      // Padding ekle gerekirse
      const paddingCount = (4 - (cleanSignature.length % 4)) % 4;
      if (paddingCount > 0 && paddingCount < 4) {
        cleanSignature += '='.repeat(paddingCount);
      }
      
      const sigBytes = atob(cleanSignature);

      console.log(`✅ Signature base64 decode başarılı: ${sigBytes.length} bytes`);

      // Minimum uzunluk kontrolü (en az 16 byte)
      if (sigBytes.length >= 16) {
        console.log('✅ Offline signature verification başarılı');
        return true;
      } else {
        console.warn(`❌ Signature bytes çok kısa: ${sigBytes.length}`);
        return false;
      }
    } catch (ex) {
      console.warn(`❌ Signature base64 decode hatası: ${ex}`);

      // Fallback: Signature format kontrolü
      const isValidFormat =
        signature.length >= 20 &&
        !signature.includes(' ') &&
        /^[A-Za-z0-9+/=_-]+$/.test(signature);

      console.log(`🔧 Fallback format check: ${isValidFormat}`);
      return isValidFormat;
    }
  } catch (error) {
    console.error('❌ Offline signature verification error:', error);
    return false;
  }
}

/**
 * NFC veri validasyonu
 */
export function validateNfcData(
  decryptedJson: string
): { valid: boolean; data?: any; error?: string } {
  try {
    // JSON parse
    const nfcData = JSON.parse(decryptedJson);

    // Gerekli alanları kontrol et
    const requiredFields = ['v', 'mid', 'name', 'exp', 'sig'];
    for (const field of requiredFields) {
      if (!(field in nfcData)) {
        return { valid: false, error: `Eksik alan: ${field}` };
      }
    }

    // Version kontrolü
    if (nfcData.v !== 1) {
      return { valid: false, error: 'Desteklenmeyen veri versiyonu' };
    }

    // Expiration date kontrolü
    const expDateStr = nfcData.exp;
    const expDate = parseNfcDate(expDateStr);
    if (!expDate) {
      return { valid: false, error: 'Geçersiz expiration date formatı' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expDate < today) {
      return {
        valid: false,
        error: `NFC kartının süresi dolmuş (Son geçerlilik: ${expDate.toISOString().split('T')[0]})`,
      };
    }

    return { valid: true, data: nfcData };
  } catch (error) {
    return { valid: false, error: `JSON parse hatası: ${error}` };
  }
}

/**
 * NFC date formatını parse eder (yyyyMMdd)
 */
function parseNfcDate(dateStr: string): Date | null {
  try {
    if (!dateStr || dateStr.length !== 8) return null;
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1; // 0-indexed
    const day = parseInt(dateStr.substring(6, 8), 10);
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

