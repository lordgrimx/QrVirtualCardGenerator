"""
Kriptografik İmza Sistemi - ISO 20248 Benzeri
QR kodlarının güvenliğini sağlamak için dijital imza kullanır
"""

import os
import json
import base64
import hashlib
from datetime import datetime, timedelta
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.exceptions import InvalidSignature
from typing import Dict, Any, Optional, Tuple
import secrets

class SecureQRManager:
    """Güvenli QR kod yönetimi - ISO 20248 benzeri implementasyon"""
    
    def __init__(self):
        self.private_key = None
        self.public_key = None
        self.load_or_generate_keys()
    
    def load_or_generate_keys(self):
        """Private/Public key çifti yükle veya oluştur"""
        private_key_path = "crypto_keys/private_key.pem"
        public_key_path = "crypto_keys/public_key.pem"
        
        # Keys klasörü oluştur
        os.makedirs("crypto_keys", exist_ok=True)
        
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

# Global instance
secure_qr = SecureQRManager()

def generate_secure_member_qr(member_data: Dict[str, Any]) -> str:
    """Güvenli üye QR kodu oluştur"""
    return secure_qr.create_signed_qr_data(member_data)

def verify_member_qr(qr_data: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    """Üye QR kodunu doğrula"""
    return secure_qr.verify_qr_signature(qr_data)

def get_public_key_pem() -> str:
    """Public key'i PEM formatında döndür (mağazalar için)"""
    return secure_qr.public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8') 