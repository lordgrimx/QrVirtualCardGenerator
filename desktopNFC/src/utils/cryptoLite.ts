import { decode as atob } from 'base-64';

export function decryptNfcData(encryptedData: string): string | null {
  try {
    if (!encryptedData?.startsWith('NFC_ENC_V1:')) {
      return encryptedData;
    }
    const encryptedB64 = encryptedData.slice(11);
    const binaryString = atob(encryptedB64);
    const encryptedBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      encryptedBytes[i] = binaryString.charCodeAt(i);
    }
    const key = new TextEncoder().encode('NFC_SECURE_2024_CRYPTO_KEY_ADVANCED');
    const decrypted = new Uint8Array(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
      decrypted[i] = encryptedBytes[i] ^ key[i % key.length];
    }
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.warn('decryptNfcData error:', e);
    return null;
  }
}

export function verifyNfcSignatureOffline(signature: string): boolean {
  try {
    if (signature.length < 10) return false;
    let clean = signature.replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (clean.length % 4)) % 4;
    if (pad > 0) clean += '='.repeat(pad);
    const bytes = atob(clean);
    return bytes.length >= 16;
  } catch {
    return false;
  }
}


