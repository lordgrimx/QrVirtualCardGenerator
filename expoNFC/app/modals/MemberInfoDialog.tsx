/**
 * Üye Bilgisi Modal Dialog
 * NFC okuma ve QR doğrulama sonuçlarını gösterir
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function MemberInfoDialog() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const {
    valid,
    name,
    membershipId,
    memberId,
    status,
    mode,
    email,
    phoneNumber,
    role,
    membershipType,
    expirationDate,
    joinDate,
    fromDatabase,
    verificationTime,
    error,
    profilePhoto,
    associationName,
  } = params;

  const isValid = valid === 'true';
  const isOffline = mode === 'Offline';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Durum Başlığı */}
        <View style={[styles.header, isValid ? styles.headerSuccess : styles.headerError]}>
          {/* Profil Fotoğrafı */}
          {profilePhoto ? (
            <Image 
              source={{ uri: profilePhoto.startsWith('data:') ? profilePhoto : `data:image/jpeg;base64,${profilePhoto}` }}
              style={styles.profilePhoto}
            />
          ) : (
            <View style={styles.profilePhotoPlaceholder}>
              <MaterialCommunityIcons name="account" size={60} color="#fff" />
            </View>
          )}
          
          <MaterialCommunityIcons
            name={isValid ? 'check-circle' : 'close-circle'}
            size={48}
            color="#fff"
            style={styles.statusIcon}
          />
          <Text style={styles.headerTitle}>
            {isValid ? 'Doğrulama Başarılı' : 'Doğrulama Başarısız'}
          </Text>
          {mode && (
            <Text style={styles.headerSubtitle}>
              {mode} {isOffline && '(Cihaz doğrulaması)'}
            </Text>
          )}
        </View>

        {/* Hata Mesajı */}
        {!isValid && error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Üye Bilgileri */}
        {isValid && (
          <View style={styles.infoSection}>
            {associationName && (
              <View style={styles.associationBanner}>
                <MaterialCommunityIcons name="bank" size={24} color="#7C2D12" />
                <Text style={styles.associationText}>{String(associationName)}</Text>
              </View>
            )}
            {name && (
              <InfoRow
                icon="account"
                label="Ad Soyad"
                value={String(name)}
              />
            )}
            {membershipId && (
              <InfoRow
                icon="card-account-details"
                label="Üyelik No"
                value={String(membershipId)}
              />
            )}
            {status && (
              <InfoRow
                icon="information"
                label="Durum"
                value={String(status)}
                valueColor={status === 'Active' || status?.includes('Active') ? '#10B981' : '#F59E0B'}
              />
            )}

            {/* Ek Bilgiler (NFC Backend'den geliyorsa) */}
            {email && (
              <InfoRow
                icon="email"
                label="E-posta"
                value={String(email)}
              />
            )}
            {phoneNumber && (
              <InfoRow
                icon="phone"
                label="Telefon"
                value={String(phoneNumber)}
              />
            )}
            {role && (
              <InfoRow
                icon="shield-account"
                label="Rol"
                value={String(role)}
              />
            )}
            {membershipType && (
              <InfoRow
                icon="star"
                label="Üyelik Türü"
                value={String(membershipType)}
              />
            )}
            {expirationDate && (
              <InfoRow
                icon="calendar-clock"
                label="Bitiş Tarihi"
                value={String(expirationDate)}
              />
            )}
            {joinDate && (
              <InfoRow
                icon="calendar-check"
                label="Kayıt Tarihi"
                value={String(joinDate)}
              />
            )}
            {verificationTime && (
              <InfoRow
                icon="clock"
                label="Doğrulama Zamanı"
                value={String(verificationTime)}
              />
            )}

            {/* Veri Kaynağı */}
            {fromDatabase !== undefined && (
              <View style={styles.sourceBox}>
                <MaterialCommunityIcons
                  name={fromDatabase === 'true' ? 'database' : 'card-bulleted'}
                  size={20}
                  color="#6B7280"
                />
                <Text style={styles.sourceText}>
                  {fromDatabase === 'true' ? 'Veritabanından' : 'NFC Karttan'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Kapat Butonu - Sabit */}
      <View style={styles.closeButtonContainer}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.closeButtonText}>Kapat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
}

function InfoRow({ icon, label, value, valueColor }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabel}>
        <MaterialCommunityIcons name={icon as any} size={20} color="#6B7280" />
        <Text style={styles.infoLabelText}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
  },
  headerSuccess: {
    backgroundColor: '#7C2D12',
  },
  headerError: {
    backgroundColor: '#991B1B',
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
    marginBottom: 12,
  },
  profilePhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    marginBottom: 12,
  },
  statusIcon: {
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  associationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#7C2D12',
  },
  associationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7C2D12',
    marginLeft: 8,
  },
  errorBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    fontSize: 14,
    color: '#991B1B',
  },
  infoSection: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoLabelText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    marginLeft: 26,
  },
  sourceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sourceText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
  },
  closeButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  closeButton: {
    backgroundColor: '#7C2D12',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

