"""
Kriptografik İmza Sistemi - ISO 20248 Benzeri
QR kodlarının güvenliğini sağlamak için dijital imza kullanır
NFC optimizasyonu: NTAG215 540 bytes sınırı için
"""

import os
import json
import base64
import hashlib
import struct
from datetime import datetime, timedelta
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding, ec
from cryptography.exceptions import InvalidSignature
from typing import Dict, Any, Optional, Tuple
import secrets

class SecureQRManager:
    """Güvenli QR kod yönetimi - ISO 20248 benzeri implementasyon"""
    
    def __init__(self):
        self.private_key = None
        self.public_key = None
        self.nfc_private_key = None  # NFC için ECDSA key
        self.nfc_public_key = None
        self.load_or_generate_keys()
    
    def load_or_generate_keys(self):
        """Private/Public key çifti yükle veya oluştur"""
        private_key_path = "crypto_keys/private_key.pem"
        public_key_path = "crypto_keys/public_key.pem"
        nfc_private_key_path = "crypto_keys/nfc_private_key.pem"
        nfc_public_key_path = "crypto_keys/nfc_public_key.pem"
        
        # Keys klasörü oluştur
        os.makedirs("crypto_keys", exist_ok=True)
        
        # RSA keys (QR code için)
        if os.path.exists(private_key_path) and os.path.exists(public_key_path):
            # Mevcut keysleri yükle
            with open(private_key_path, "rb") as f:
                self.private_key = serialization.load_pem_private_key(
                    f.read(), password=None
                )
            with open(public_key_path, "rb") as f:
                self.public_key = serialization.load_pem_public_key(f.read())
        else:
            # Yeni key çifti oluştur
            self.private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
            )
            self.public_key = self.private_key.public_key()
            
            # Keyleri kaydet
            with open(private_key_path, "wb") as f:
                f.write(self.private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                ))
            
            with open(public_key_path, "wb") as f:
                f.write(self.public_key.public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo
                ))
        
        # ECDSA keys (NFC için - daha kompakt)
        if os.path.exists(nfc_private_key_path) and os.path.exists(nfc_public_key_path):
            # Mevcut NFC keysleri yükle
            with open(nfc_private_key_path, "rb") as f:
                self.nfc_private_key = serialization.load_pem_private_key(
                    f.read(), password=None
                )
            with open(nfc_public_key_path, "rb") as f:
                self.nfc_public_key = serialization.load_pem_public_key(f.read())
        else:
            # Yeni ECDSA key çifti oluştur (P-256 curve - kompakt)
            self.nfc_private_key = ec.generate_private_key(ec.SECP256R1())
            self.nfc_public_key = self.nfc_private_key.public_key()
            
            # NFC keysleri kaydet
            with open(nfc_private_key_path, "wb") as f:
                f.write(self.nfc_private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                ))
            
            with open(nfc_public_key_path, "wb") as f:
                f.write(self.nfc_public_key.public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo
                ))
    
    def create_signed_qr_data(self, member_data: Dict[str, Any]) -> str:
        """
        Üye verilerinden imzalı QR kod verisi oluştur
        ISO 20248 benzeri format: DATA|SIGNATURE|METADATA
        """
        try:
            # QR kod için temel veri yapısı
            qr_payload = {
                "member_id": member_data.get("id"),
                "membership_id": member_data.get("membershipId"),
                "name": member_data.get("fullName"),
                "status": member_data.get("status"),
                "org": "Community Connect",
                "issued_at": datetime.utcnow().isoformat(),
                "expires_at": (datetime.utcnow() + timedelta(days=365)).isoformat(),
                "nonce": secrets.token_hex(8)  # Replay attack önleme
            }
            
            # Veriyi JSON string'e çevir
            payload_json = json.dumps(qr_payload, sort_keys=True, separators=(',', ':'))
            payload_bytes = payload_json.encode('utf-8')
            
            # Veriyi imzala
            signature = self.private_key.sign(
                payload_bytes,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            # İmzayı base64 encode et
            signature_b64 = base64.b64encode(signature).decode('utf-8')
            
            # Metadata (doğrulama için gerekli bilgiler)
            metadata = {
                "version": "1.0",
                "algorithm": "RSA-PSS-SHA256",
                "key_id": self.get_key_fingerprint()
            }
            metadata_json = json.dumps(metadata, separators=(',', ':'))
            
            # ISO 20248 benzeri format: PAYLOAD|SIGNATURE|METADATA
            secure_qr_data = f"{base64.b64encode(payload_bytes).decode()}|{signature_b64}|{base64.b64encode(metadata_json.encode()).decode()}"
            
            return secure_qr_data
            
        except Exception as e:
            raise Exception(f"QR kod imzalama hatası: {str(e)}")
    
    def verify_qr_signature(self, qr_data: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        QR kod imzasını doğrula ve veriyi çöz
        Returns: (is_valid, decoded_data, error_message)
        """
        try:
            # QR veriyi parse et
            parts = qr_data.split('|')
            if len(parts) != 3:
                return False, None, "Geçersiz QR kod formatı"
            
            payload_b64, signature_b64, metadata_b64 = parts
            
            # Base64 decode
            payload_bytes = base64.b64decode(payload_b64)
            signature = base64.b64decode(signature_b64)
            metadata_bytes = base64.b64decode(metadata_b64)
            
            # Metadata kontrol et
            metadata = json.loads(metadata_bytes.decode('utf-8'))
            if metadata.get("key_id") != self.get_key_fingerprint():
                return False, None, "Geçersiz anahtar ID"
            
            # İmzayı doğrula
            self.public_key.verify(
                signature,
                payload_bytes,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            # Veriyi decode et
            payload_data = json.loads(payload_bytes.decode('utf-8'))
            
            # Expiration kontrol et
            expires_at = datetime.fromisoformat(payload_data.get("expires_at", ""))
            if datetime.utcnow() > expires_at:
                return False, None, "QR kod süresi dolmuş"
            
            return True, payload_data, None
            
        except InvalidSignature:
            return False, None, "Geçersiz dijital imza"
        except Exception as e:
            return False, None, f"Doğrulama hatası: {str(e)}"
    
    def get_key_fingerprint(self) -> str:
        """Public key fingerprint oluştur"""
        public_key_bytes = self.public_key.public_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        fingerprint = hashlib.sha256(public_key_bytes).hexdigest()[:16]
        return fingerprint
    
    def create_fake_readable_qr(self) -> str:
        """
        Normal QR okuyucular için sahte/anlamsız veri
        Gerçek veri gizlenmiş durumda
        """
        fake_data = {
            "type": "membership_card",
            "data": "Visit our website for more info",
            "url": "https://community-connect.org",
            "note": "This QR code requires special scanner"
        }
        return json.dumps(fake_data)
    
    def create_nfc_compact_qr(self, member_data: Dict[str, Any]) -> str:
        """
        NFC için ultra-kompakt QR kod verisi oluştur
        NTAG215 540 bytes sınırı için optimize edilmiş
        Binary format: [version][member_id][name_length][name][timestamp][status][nonce][signature]
        """
        try:
            # Kritik veriyi al
            member_id = member_data.get("id", 0)
            member_name = member_data.get("fullName", "Unknown").strip()
            status_map = {"active": 1, "inactive": 0, "suspended": 2, "pending": 3}
            status_code = status_map.get(member_data.get("status", "active").lower(), 1)
            
            # İsmi UTF-8 encode et ve boyutunu sınırla (max 50 karakter)
            if len(member_name) > 50:
                member_name = member_name[:50]
            name_bytes = member_name.encode('utf-8')
            name_length = len(name_bytes)
            
            if name_length > 255:  # 1 byte length sınırı
                name_bytes = name_bytes[:255]
                name_length = 255
            
            # Binary payload oluştur
            timestamp = int(datetime.utcnow().timestamp())
            nonce = secrets.randbits(32)  # 4 bytes random
            
            # Binary format: version(1) + member_id(4) + name_length(1) + name(variable) + timestamp(4) + status(1) + nonce(4)
            payload = struct.pack(
                f'>BIB{name_length}sIBI',  # big-endian: byte, int, byte, string, int, byte, int
                1,           # version (1 byte)
                member_id,   # member ID (4 bytes)
                name_length, # name length (1 byte)
                name_bytes,  # name (variable bytes)
                timestamp,   # timestamp (4 bytes)
                status_code, # status (1 byte)
                nonce        # nonce (4 bytes)
            )
            
            # ECDSA ile imzala (64 bytes signature)
            signature = self.nfc_private_key.sign(
                payload,
                ec.ECDSA(hashes.SHA256())
            )
            
            # Signature'ı DER'den raw format'a çevir (64 bytes fixed)
            signature_raw = self._der_to_raw_signature(signature)
            
            # Final data: payload + signature
            compact_data = payload + signature_raw
            
            # Base64 encode et (URL-safe)
            encoded_data = base64.urlsafe_b64encode(compact_data).decode('ascii').rstrip('=')
            
            print(f"🔧 NFC Compact QR oluşturuldu:")
            print(f"   👤 Üye: {member_name} (ID: {member_id})")
            print(f"   📏 Payload boyutu: {len(payload)} bytes")
            print(f"     ├─ Ad boyutu: {name_length} bytes")
            print(f"     └─ Sabit veriler: {len(payload) - name_length} bytes")
            print(f"   ✍️  Signature boyutu: {len(signature_raw)} bytes") 
            print(f"   📦 Toplam boyut: {len(compact_data)} bytes")
            print(f"   📋 Base64 boyutu: {len(encoded_data)} chars")
            print(f"   💾 NTAG215 kullanım: {len(encoded_data)}/540 bytes ({(len(encoded_data)/540)*100:.1f}%)")
            
            return encoded_data
            
        except Exception as e:
            raise Exception(f"NFC compact QR oluşturma hatası: {str(e)}")
    
    def verify_nfc_compact_qr(self, compact_data: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        NFC compact QR kod verilerini doğrula
        Returns: (is_valid, decoded_data, error_message)
        """
        try:
            # Base64 decode et (padding ekle)
            padding = 4 - (len(compact_data) % 4) if len(compact_data) % 4 else 0
            compact_data_padded = compact_data + '=' * padding
            binary_data = base64.urlsafe_b64decode(compact_data_padded)
            
            if len(binary_data) < 75:  # minimum: version(1) + member_id(4) + name_length(1) + name(1) + timestamp(4) + status(1) + nonce(4) + signature(64) = 80 bytes
                return False, None, "Geçersiz veri boyutu"
            
            # Payload boyutunu hesapla (signature'ı çıkar)
            payload = binary_data[:-64]
            signature_raw = binary_data[-64:]
            
            if len(payload) < 11:  # minimum payload boyutu
                return False, None, "Geçersiz payload boyutu"
            
            # Payload'ı parse et - variable length name ile
            version = struct.unpack('>B', payload[:1])[0]
            member_id = struct.unpack('>I', payload[1:5])[0]
            name_length = struct.unpack('>B', payload[5:6])[0]
            
            if len(payload) < 11 + name_length:  # version(1) + member_id(4) + name_length(1) + name(name_length) + timestamp(4) + status(1) + nonce(4)
                return False, None, "Geçersiz payload boyutu - isim verisi eksik"
            
            name_bytes = payload[6:6+name_length]
            remaining = payload[6+name_length:]
            
            timestamp, status_code, nonce = struct.unpack('>IBI', remaining)
            
            # İsmi decode et
            try:
                member_name = name_bytes.decode('utf-8')
            except UnicodeDecodeError:
                return False, None, "Geçersiz isim encoding"
            
            if version != 1:
                return False, None, f"Desteklenmeyen format versiyonu: {version}"
            
            # Signature'ı raw'dan DER'a çevir
            signature_der = self._raw_to_der_signature(signature_raw)
            
            # İmzayı doğrula
            self.nfc_public_key.verify(
                signature_der,
                payload,
                ec.ECDSA(hashes.SHA256())
            )
            
            # Timestamp kontrolü (24 saat geçerlilik)
            current_time = int(datetime.utcnow().timestamp())
            if current_time - timestamp > 86400:  # 24 saat
                return False, None, "QR kod süresi dolmuş (24 saat)"
            
            # Status decode et
            status_map = {1: "active", 0: "inactive", 2: "suspended", 3: "pending"}
            status = status_map.get(status_code, "unknown")
            
            # Decoded data
            decoded_data = {
                "member_id": member_id,
                "name": member_name,
                "status": status,
                "issued_at": datetime.fromtimestamp(timestamp).isoformat(),
                "nonce": nonce,
                "version": version,
                "type": "nfc_compact"
            }
            
            return True, decoded_data, None
            
        except InvalidSignature:
            return False, None, "Geçersiz dijital imza"
        except Exception as e:
            return False, None, f"NFC doğrulama hatası: {str(e)}"
    
    def _der_to_raw_signature(self, der_signature: bytes) -> bytes:
        """ECDSA DER signature'ını raw 64-byte format'a çevir"""
        try:
            # DER formatından r,s değerlerini çıkar
            from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
            r, s = decode_dss_signature(der_signature)
            
            # r ve s'i 32'şer byte'a çevir
            r_bytes = r.to_bytes(32, byteorder='big')
            s_bytes = s.to_bytes(32, byteorder='big')
            
            return r_bytes + s_bytes
        except Exception as e:
            raise Exception(f"DER to raw conversion hatası: {str(e)}")
    
    def _raw_to_der_signature(self, raw_signature: bytes) -> bytes:
        """Raw 64-byte signature'ı DER format'a çevir"""
        try:
            if len(raw_signature) != 64:
                raise ValueError("Raw signature 64 bytes olmalı")
            
            # r ve s değerlerini ayır
            r_bytes = raw_signature[:32]
            s_bytes = raw_signature[32:]
            
            r = int.from_bytes(r_bytes, byteorder='big')
            s = int.from_bytes(s_bytes, byteorder='big')
            
            # DER formatına çevir
            from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
            return encode_dss_signature(r, s)
        except Exception as e:
            raise Exception(f"Raw to DER conversion hatası: {str(e)}")

# Global instance
secure_qr = SecureQRManager()

def generate_secure_member_qr(member_data: Dict[str, Any]) -> str:
    """Güvenli üye QR kodu oluştur"""
    return secure_qr.create_signed_qr_data(member_data)

def generate_nfc_compact_qr(member_data: Dict[str, Any]) -> str:
    """NFC için kompakt QR kodu oluştur (NTAG215 - 540 bytes)"""
    return secure_qr.create_nfc_compact_qr(member_data)

def verify_member_qr(qr_data: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    """Üye QR kodunu doğrula"""
    return secure_qr.verify_qr_signature(qr_data)

def verify_nfc_compact_qr(qr_data: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    """NFC compact QR kodunu doğrula"""
    return secure_qr.verify_nfc_compact_qr(qr_data)

def get_public_key_pem() -> str:
    """Public key'i PEM formatında döndür (mağazalar için)"""
    return secure_qr.public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')

def get_nfc_public_key_pem() -> str:
    """NFC Public key'i PEM formatında döndür (NFC doğrulama için)"""
    return secure_qr.nfc_public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8') 