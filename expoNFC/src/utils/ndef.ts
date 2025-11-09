/**
 * NDEF yardımcı fonksiyonları
 * NDEF Text payload çözümleme
 */

/**
 * NDEF Text Record payload'ını decode eder
 * Format: [status][lang...][text...]
 * @param payload - Byte array
 */
export function decodeNdefText(payload: number[]): string | null {
  try {
    if (!payload || payload.length === 0) return null;

    const status = payload[0];
    const langLength = status & 0x3f; // Lower 6 bits
    const textStart = 1 + langLength;

    if (textStart > payload.length) return null;

    const textBytes = payload.slice(textStart);
    
    // Uint8Array'e çevir ve decode et
    const uint8Array = new Uint8Array(textBytes);
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(uint8Array);
  } catch (error) {
    console.error('NDEF text decode error:', error);
    return null;
  }
}

/**
 * Ham veriyi hex string olarak kontrol et ve text'e çevir
 */
export function tryDecodeHexString(rawData: number[]): string | null {
  try {
    if (!rawData || rawData.length === 0) return null;

    // Uint8Array'e çevir
    const uint8Array = new Uint8Array(rawData);
    const decoder = new TextDecoder('utf-8');
    const rawString = decoder.decode(uint8Array).trim();

    // Hex string formatında mı kontrol et
    const isHexString = (str: string) =>
      str.length > 10 &&
      str.length % 2 === 0 &&
      /^[0-9A-Fa-f]+$/.test(str);

    if (isHexString(rawString)) {
      // Hex string'i byte'lara çevir
      const hexBytes: number[] = [];
      for (let i = 0; i < rawString.length; i += 2) {
        hexBytes.push(parseInt(rawString.substr(i, 2), 16));
      }

      // Byte'ları string'e çevir
      const decodedUint8 = new Uint8Array(hexBytes);
      const decodedText = decoder.decode(decodedUint8);

      // Çıktı mantıklı mı kontrol et
      if (
        decodedText.includes('NFC_ENC_V1') ||
        decodedText.includes('{"v":') ||
        decodedText.includes('"mid"')
      ) {
        return decodedText;
      }
    }

    return null;
  } catch (error) {
    console.error('Hex string decode error:', error);
    return null;
  }
}

/**
 * Ham byte array'i UTF-8 string'e çevirir
 */
export function bytesToString(bytes: number[]): string {
  try {
    const uint8Array = new Uint8Array(bytes);
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(uint8Array);
  } catch (error) {
    console.error('Bytes to string conversion error:', error);
    return '';
  }
}

/**
 * NDEF mesajından tüm text payloadları çıkarır
 */
export function extractAllTexts(ndefMessage: any[]): string[] {
  const texts: string[] = [];
  
  try {
    for (const record of ndefMessage) {
      if (record.payload) {
        const text = decodeNdefText(record.payload);
        if (text) {
          texts.push(text);
        }
      }
    }
  } catch (error) {
    console.error('Extract all texts error:', error);
  }

  return texts;
}

