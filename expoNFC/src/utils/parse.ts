/**
 * Güvenli QR format ayrıştırıcı
 * Format: payload|signature|meta
 */
import { decode as atob } from 'base-64';

export interface ParseResult {
  ok: boolean;
  payloadBytes?: Uint8Array;
  signature?: Uint8Array;
  meta?: string;
  error?: string;
}

export interface SecurePayload {
  member_id?: string;
  membership_id?: string;
  name?: string;
  status?: string;
  expires_at?: string;
}

/**
 * Güvenli QR string'ini parse eder
 * @param qrData - QR code string
 */
export function parseSecureQr(qrData: string): ParseResult {
  try {
    if (!qrData) {
      return { ok: false, error: 'Boş veri' };
    }

    let s = qrData.trim();

    // Normalize: Hex formatından ASCII'ye çevir
    const looksHex = (t: string) =>
      t.length % 2 === 0 && /^[0-9A-Fa-f]+$/.test(t);

    const tryHexToAscii = (t: string): string => {
      try {
        const bytes: number[] = [];
        for (let i = 0; i < t.length; i += 2) {
          bytes.push(parseInt(t.substr(i, 2), 16));
        }
        const uint8 = new Uint8Array(bytes);
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(uint8);
      } catch {
        return t;
      }
    };

    if (!s.includes('|') && looksHex(s)) {
      s = tryHexToAscii(s).trim();
    }

    // Tırnak işaretlerini kaldır
    if (
      (s.startsWith('"') && s.endsWith('"')) ||
      (s.startsWith("'") && s.endsWith("'"))
    ) {
      s = s.substring(1, s.length - 1);
    }

    // Exotic separator'ları normalize et
    s = s.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/‖/g, '|').replace(/｜/g, '|').trim();

    // URL parametresinden extract et
    const parts = s.split('|');
    if (parts.length !== 3) {
      // URL içinde olabilir mi?
      try {
        const url = new URL(s);
        const params = new URLSearchParams(url.search);
        const data = params.get('qr') || params.get('data') || params.get('code');
        if (data) {
          s = data;
        }
      } catch {
        // URL değil, devam et
      }
    }

    const finalParts = s.split('|');
    if (finalParts.length !== 3) {
      return { ok: false, error: 'Parça sayısı geçersiz (3 bekleniyor)' };
    }

    // Base64 decode
    const payloadBytes = base64ToUint8Array(finalParts[0]);
    const signature = base64ToUint8Array(finalParts[1]);
    const meta = finalParts[2];

    return {
      ok: true,
      payloadBytes,
      signature,
      meta,
    };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Parse hatası' };
  }
}

/**
 * Base64 string'i Uint8Array'e çevirir
 */
function base64ToUint8Array(b64: string): Uint8Array {
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Payload bytes'ı JSON objesine parse eder
 */
export function parsePayloadJson(payloadBytes: Uint8Array): SecurePayload | null {
  try {
    const decoder = new TextDecoder('utf-8');
    const jsonString = decoder.decode(payloadBytes);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Payload JSON parse error:', error);
    return null;
  }
}

/**
 * NFC şifreli formatı kontrol eder
 */
export function isNfcEncryptedFormat(data: string): boolean {
  return (
    !!data &&
    (data.includes('NFC_ENC_V1:') ||
      data.includes('{"v":') ||
      data.includes('"mid"'))
  );
}

