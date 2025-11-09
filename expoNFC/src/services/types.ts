/**
 * Ortak tip tanımları
 */

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
  profilePhoto?: string; // Base64 veya URL
  associationName?: string; // Dernek adı
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
  memberId?: string;
  membershipId?: string;
  name?: string;
  status?: string;
  member?: MemberDetails; // DB'den gelen tam üye bilgileri
}

export interface MemberInfo {
  memberId?: string;
  membershipId?: string;
  name?: string;
  status?: string;
}

