import { backendBaseUrls } from '../config';

export interface MemberDetails {
  membershipId?: string;
  name?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  status?: string;
  membershipType?: string;
  expirationDate?: string;
  joinDate?: string;
  fromDatabase?: boolean;
  profilePhoto?: string;
  associationName?: string;
  associationId?: string;
}

export interface NfcDecryptResult {
  valid: boolean;
  error?: string;
  member?: MemberDetails;
  verificationTime?: string;
}

export interface QrVerificationResult {
  valid: boolean;
  error?: string;
  member?: MemberDetails;
  memberId?: string;
  membershipId?: string;
  name?: string;
  status?: string;
}

class BackendApiService {
  private lastSuccessfulKey = 'anef:lastBackendUrl';

  private getLastUrl(): string | null {
    try {
      return localStorage.getItem(this.lastSuccessfulKey);
    } catch {
      return null;
    }
  }
  private setLastUrl(url: string) {
    try {
      localStorage.setItem(this.lastSuccessfulKey, url);
    } catch {}
  }

  private async fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const method = (init.method || 'GET').toUpperCase();
      const baseHeaders: Record<string, string> = { accept: 'application/json' };
      // Sadece GET dışındaki isteklerde content-type koy
      if (method !== 'GET' && method !== 'HEAD') {
        baseHeaders['content-type'] = 'application/json';
      }
      const resp = await fetch(url, {
        headers: { ...baseHeaders, ...(init.headers || {}) },
        ...init,
        signal: controller.signal,
      } as RequestInit);
      return resp;
    } finally {
      clearTimeout(id);
    }
  }

  private async tryMultiple<T>(fn: (base: string) => Promise<{ success: boolean; result?: T; error?: string }>) {
    const tried: string[] = [];
    const last = this.getLastUrl();
    const candidates = last ? [last, ...backendBaseUrls.filter(b => b !== last)] : backendBaseUrls;

    for (const base of candidates) {
      tried.push(base);
      try {
        const res = await fn(base);
        if (res.success && res.result) {
          this.setLastUrl(base);
          return { ok: true, result: res.result };
        }
        if (res.success && !res.result) {
          // success but logical failure
          return { ok: false, error: res.error || 'İşlem başarısız' };
        }
      } catch (e: any) {
        // continue
      }
    }
    return { ok: false, error: `Tüm backend URL'leri başarısız: ${tried.join(', ')}` };
  }

  async getPublicKey() {
    return this.tryMultiple<string>(async (base) => {
      const url = `${base}/api/qr/public-key`;
      const r = await this.fetchWithTimeout(url);
      if (!r.ok) return { success: false, error: `HTTP ${r.status}` };
      const j = await r.json();
      if (j?.public_key) return { success: true, result: j.public_key };
      return { success: false, error: j?.error || 'Public key yok' };
    });
  }

  async decryptNfc(encryptedData: string, deviceInfo?: string) {
    return this.tryMultiple<NfcDecryptResult>(async (base) => {
      const url = `${base}/api/nfc/decrypt`;
      const r = await this.fetchWithTimeout(url, { method: 'POST', body: JSON.stringify({ encryptedData, deviceInfo }) });
      if (!r.ok) return { success: false, error: `HTTP ${r.status}` };
      const j = await r.json();

      if (j?.success) {
        const result: NfcDecryptResult = {
          valid: j.valid,
          error: j.error,
          verificationTime: j.verificationTime,
          member: j.member ? {
            membershipId: j.member.membershipId,
            name: j.member.name,
            fullName: j.member.fullName,
            email: j.member.email,
            phoneNumber: j.member.phoneNumber,
            role: j.member.role,
            status: j.member.status,
            membershipType: j.member.membershipType,
            expirationDate: j.member.expirationDate,
            joinDate: j.member.joinDate,
            fromDatabase: j.member.fromDatabase,
            profilePhoto: j.member.profilePhoto,
            associationName: j.member.associationName,
            associationId: j.member.associationId,
          } : undefined,
        };
        return { success: true, result };
      }

      if (j?.error === 'USER_NOT_FOUND') {
        const result: NfcDecryptResult = { valid: false, error: j.message || 'Kullanıcı bulunamadı' };
        return { success: true, result };
      }

      return { success: false, error: j?.error || j?.message || 'Decrypt başarısız' };
    });
  }

  async verifyQr(qrData: string) {
    return this.tryMultiple<QrVerificationResult>(async (base) => {
      const url = `${base}/api/qr/verify`;
      const r = await this.fetchWithTimeout(url, { method: 'POST', body: JSON.stringify({ qr_code: qrData }) });
      if (!r.ok) return { success: false, error: `HTTP ${r.status}` };
      const j = await r.json();

      if (j?.success) {
        const res: QrVerificationResult = {
          valid: j.valid,
          error: j.error,
          memberId: j.member?.memberId || j.member_data?.member_id,
          membershipId: j.member?.membershipId || j.member_data?.membership_id,
          name: j.member?.name || j.member_data?.name,
          status: j.member?.status || j.member_data?.status,
          member: j.member ? {
            membershipId: j.member.membershipId,
            name: j.member.name,
            fullName: j.member.fullName,
            email: j.member.email,
            phoneNumber: j.member.phoneNumber,
            role: j.member.role,
            status: j.member.status,
            membershipType: j.member.membershipType,
            expirationDate: j.member.expiresAt,
            joinDate: j.member.joinDate,
            fromDatabase: j.member.fromDatabase,
            profilePhoto: j.member.profilePhoto,
            associationName: j.member.associationName,
          } : undefined,
        };
        return { success: true, result: res };
      }

      if (j?.error === 'USER_NOT_FOUND') {
        return { success: true, result: { valid: false, error: j.message || 'Kullanıcı bulunamadı' } };
      }

      return { success: false, error: j?.error || j?.message || 'Doğrulama başarısız' };
    });
  }
}

export const backendApi = new BackendApiService();


