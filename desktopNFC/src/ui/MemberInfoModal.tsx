import React from 'react';
import './styles.css';
import { MemberDetails } from '../services/BackendApi';

export interface MemberInfoData {
  valid: boolean;
  mode: 'Online' | 'Offline' | 'Online Backend' | string;
  member?: MemberDetails;
  error?: string;
  verificationTime?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  data: MemberInfoData;
}

export default function MemberInfoModal({ open, onClose, data }: Props) {
  if (!open) return null;
  const { valid, mode, member, error, verificationTime } = data;

  const profileSrc = member?.profilePhoto
    ? (member.profilePhoto.startsWith('data:')
        ? member.profilePhoto
        : `data:image/jpeg;base64,${member.profilePhoto}`)
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-header ${valid ? 'success' : 'error'}`}>
          {profileSrc ? (
            <img className="modal-avatar" src={profileSrc} />
          ) : (
            <div className="modal-avatar placeholder">👤</div>
          )}
          <div className="modal-title">{valid ? 'Doğrulama Başarılı' : 'Doğrulama Başarısız'}</div>
          <div className="modal-subtitle">
            {mode} {mode === 'Offline' ? '(Cihaz doğrulaması)' : ''}
          </div>
        </div>

        {!valid && error && (
          <div className="modal-error">
            {error}
          </div>
        )}

        {valid && (
          <div className="modal-section">
            {member?.associationName && (
              <div className="modal-association">
                🏛️ <strong style={{ marginLeft: 6 }}>{member.associationName}</strong>
              </div>
            )}
            {member?.name && (
              <InfoRow label="Ad Soyad" value={member.name} />
            )}
            {member?.membershipId && (
              <InfoRow label="Üyelik No" value={member.membershipId} />
            )}
            {member?.status && (
              <InfoRow label="Durum" value={member.status} />
            )}
            {member?.email && (
              <InfoRow label="E-posta" value={member.email} />
            )}
            {member?.phoneNumber && (
              <InfoRow label="Telefon" value={member.phoneNumber} />
            )}
            {member?.membershipType && (
              <InfoRow label="Üyelik Tipi" value={member.membershipType} />
            )}
            {member?.expirationDate && (
              <InfoRow label="Bitiş Tarihi" value={member.expirationDate} />
            )}
            {member?.joinDate && (
              <InfoRow label="Kayıt Tarihi" value={member.joinDate} />
            )}
            {typeof member?.fromDatabase !== 'undefined' && (
              <div className="modal-source">
                {member?.fromDatabase ? 'Veritabanından' : 'NFC Karttan'}
              </div>
            )}
            {verificationTime && (
              <InfoRow label="Doğrulama Zamanı" value={verificationTime} />
            )}
          </div>
        )}

        <div className="modal-footer">
          <button className="main-button" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="info-row">
      <div className="info-label">{label}</div>
      <div className="info-value">{value}</div>
    </div>
  );
}


