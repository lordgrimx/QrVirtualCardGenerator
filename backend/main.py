from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
import uvicorn
import json
from datetime import datetime
import random
import os
from dotenv import load_dotenv
import ssl

# Import database components
from database import get_db, init_db, Member as DBMember

# Import crypto utilities
from crypto_utils import (
    generate_secure_member_qr, 
    verify_member_qr, 
    get_public_key_pem
)
from crypto_utils import secure_qr

# Import NFC service

# Load environment variables
load_dotenv()

app = FastAPI(
    title="QR Virtual Card API",
    description="QR Virtual Card Backend API",
    version="1.0.0"
)

# CORS middleware
# Production için Vercel frontend domainini ve local geliştirme hostlarını izinli tut
frontend_url = os.getenv("FRONTEND_URL", "https://qr-virtual-card-generator.vercel.app")
allowed_origins = [
    frontend_url,
    "http://localhost:3000",
    "https://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/")
async def read_root():
    return {"message": "QR Virtual Card API'sine hoş geldiniz!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "API çalışıyor"}

# Pydantic Models
class MemberCreate(BaseModel):
    fullName: str
    phoneNumber: str
    email: str
    address: str
    dateOfBirth: str
    emergencyContact: str
    membershipType: str
    role: str
    status: str = "active"

class MemberUpdate(BaseModel):
    fullName: Optional[str] = None
    phoneNumber: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    dateOfBirth: Optional[str] = None
    emergencyContact: Optional[str] = None
    membershipType: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None

class MemberResponse(BaseModel):
    id: int
    fullName: str
    membershipId: str
    cardNumber: str
    phoneNumber: str
    email: str
    address: str
    dateOfBirth: str
    emergencyContact: str
    membershipType: str
    role: str
    status: str
    createdAt: datetime
    updatedAt: datetime
    secureQrCode: Optional[str] = None  # Standart QR kod
    nfcQrCode: Optional[str] = None     # NFC kompakt veri

    success: bool = True

    class Config:
        from_attributes = True

@app.get("/api/test")
async def test_endpoint():
    return {"data": "Test verisi", "success": True}

def generate_membership_id(db: Session):
    """Otomatik membership ID oluştur"""
    year = datetime.now().year
    # Get count from database
    member_count = db.query(DBMember).count() + 1
    return f"CC-{year}-{str(member_count).zfill(6)}"

def generate_card_number():
    """Otomatik 16 haneli kart numarası oluştur"""
    return ''.join([str(random.randint(0, 9)) for _ in range(16)])

def ensure_unique_membership_id(db: Session, membership_id: str) -> str:
    """Ensure membership ID is unique"""
    original_id = membership_id
    counter = 1
    while db.query(DBMember).filter(DBMember.membership_id == membership_id).first():
        membership_id = f"{original_id[:-3]}{str(counter).zfill(3)}"
        counter += 1
    return membership_id

@app.post("/api/members", response_model=MemberResponse)
async def create_member(member: MemberCreate, db: Session = Depends(get_db)):
    """Yeni üye kaydı oluştur"""
    try:
        # Check if email already exists
        if db.query(DBMember).filter(DBMember.email == member.email).first():
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # Auto-generate membership ID and card number
        membership_id = generate_membership_id(db)
        membership_id = ensure_unique_membership_id(db, membership_id)
        card_number = generate_card_number()
        
        # Ensure unique card number
        while db.query(DBMember).filter(DBMember.card_number == card_number).first():
            card_number = generate_card_number()
        
        # Create new member
        db_member = DBMember(
            full_name=member.fullName,
            membership_id=membership_id,
            card_number=card_number,
            phone_number=member.phoneNumber,
            email=member.email,
            address=member.address,
            date_of_birth=member.dateOfBirth,
            emergency_contact=member.emergencyContact,
            membership_type=member.membershipType,
            role=member.role,
            status=member.status
        )
        
        db.add(db_member)
        db.commit()
        db.refresh(db_member)
        
        # Convert to response format
        response_data = {
            "id": db_member.id,
            "fullName": db_member.full_name,
            "membershipId": db_member.membership_id,
            "cardNumber": db_member.card_number,
            "phoneNumber": db_member.phone_number,
            "email": db_member.email,
            "address": db_member.address,
            "dateOfBirth": db_member.date_of_birth,
            "emergencyContact": db_member.emergency_contact,
            "membershipType": db_member.membership_type,
            "role": db_member.role,
            "status": db_member.status,
            "createdAt": db_member.created_at,
            "updatedAt": db_member.updated_at
        }
        
        # Güvenli QR kod oluştur (standart) ve NFC kompakt veri üret
        try:
            secure_qr_data = generate_secure_member_qr(response_data)
            response_data["secureQrCode"] = secure_qr_data
            # NFC kompakt (NTAG215 uyumlu) payload
            response_data["nfcQrCode"] = secure_qr.create_compact_nfc_payload(response_data)
        except Exception as e:
            print(f"QR kod oluşturma hatası: {e}")
            response_data["secureQrCode"] = None
            response_data["nfcQrCode"] = None
        
        return MemberResponse(**response_data)
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Üye kaydı sırasında hata oluştu: {str(e)}")

@app.get("/api/members")
async def get_all_members(db: Session = Depends(get_db)):
    """Tüm üyeleri listele"""
    members = db.query(DBMember).all()
    member_list = []
    
    for member in members:
        member_data = {
            "id": member.id,
            "fullName": member.full_name,
            "membershipId": member.membership_id,
            "cardNumber": member.card_number,
            "phoneNumber": member.phone_number,
            "email": member.email,
            "address": member.address,
            "dateOfBirth": member.date_of_birth,
            "emergencyContact": member.emergency_contact,
            "membershipType": member.membership_type,
            "role": member.role,
            "status": member.status,
            "createdAt": member.created_at,
            "updatedAt": member.updated_at,
            "secureQrCode": None,
            "nfcQrCode": None
        }
        member_list.append(member_data)
    
    return {
        "members": member_list,
        "count": len(member_list),
        "success": True
    }

# Model for member list dropdown
class MemberInfo(BaseModel):
    id: int
    fullName: str

@app.get("/api/members/list", response_model=List[MemberInfo])
async def get_members_list(db: Session = Depends(get_db)):
    """Dropdown için sadece üye ID ve isimlerini döndürür"""
    try:
        members = db.query(DBMember).order_by(DBMember.full_name).all()
        if not members:
            return []
        return [MemberInfo(id=member.id, fullName=member.full_name) for member in members]
    except Exception as e:
        print(f"Database error in get_members_list: {e}")
        raise HTTPException(status_code=500, detail="Database connection error")

@app.get("/api/members/{member_id}")
async def get_member(member_id: int, db: Session = Depends(get_db)):
    """Belirli bir üyeyi getir"""
    member = db.query(DBMember).filter(DBMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Üye bulunamadı")
    
    member_data = {
        "id": member.id,
        "fullName": member.full_name,
        "membershipId": member.membership_id,
        "cardNumber": member.card_number,
        "phoneNumber": member.phone_number,
        "email": member.email,
        "address": member.address,
        "dateOfBirth": member.date_of_birth,
        "emergencyContact": member.emergency_contact,
        "membershipType": member.membership_type,
        "role": member.role,
        "status": member.status,
        "createdAt": member.created_at,
        "updatedAt": member.updated_at
    }
    
    # Güvenli QR kod oluştur (hem standart hem NFC)
    try:
        secure_qr_data = generate_secure_member_qr(member_data)
        member_data["secureQrCode"] = secure_qr_data
        member_data["nfcQrCode"] = secure_qr.create_compact_nfc_payload(member_data)
        print(f"✅ Standart QR kod oluşturuldu - Member ID: {member.id}, Data length: {len(secure_qr_data)}")
    except Exception as e:
        print(f"❌ Standart QR kod oluşturma hatası: {e}")
        member_data["secureQrCode"] = None
        member_data["nfcQrCode"] = None
    
    return {
        "member": member_data,
        "success": True
    }

@app.get("/api/members/membership/{membership_id}")
async def get_member_by_membership_id(membership_id: str, db: Session = Depends(get_db)):
    """Üyelik ID'si ile üye bilgilerini getir"""
    member = db.query(DBMember).filter(DBMember.membership_id == membership_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Üye bulunamadı")
    
    member_data = {
        "id": member.id,
        "fullName": member.full_name,
        "membershipId": member.membership_id,
        "cardNumber": member.card_number,
        "phoneNumber": member.phone_number,
        "email": member.email,
        "address": member.address,
        "dateOfBirth": member.date_of_birth,
        "emergencyContact": member.emergency_contact,
        "membershipType": member.membership_type,
        "role": member.role,
        "status": member.status,
        "createdAt": member.created_at,
        "updatedAt": member.updated_at
    }
    
    return {
        "member": member_data,
        "success": True
    }

@app.delete("/api/members/{member_id}")
async def delete_member(member_id: int, db: Session = Depends(get_db)):
    """Üyeyi sil"""
    member = db.query(DBMember).filter(DBMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Üye bulunamadı")
    
    db.delete(member)
    db.commit()
    
    return {
        "message": "Üye başarıyla silindi",
        "success": True
    }

@app.put("/api/members/{member_id}")
async def update_member(member_id: int, member: MemberUpdate, db: Session = Depends(get_db)):
    """Üye bilgilerini güncelle"""
    db_member = db.query(DBMember).filter(DBMember.id == member_id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="Üye bulunamadı")
    
    # Update only provided fields (keep existing membershipId and cardNumber)
    update_data = member.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        if field == "fullName":
            db_member.full_name = value
        elif field == "phoneNumber":
            db_member.phone_number = value
        elif field == "email":
            # Check if email is unique (if being updated)
            if value != db_member.email:
                existing = db.query(DBMember).filter(DBMember.email == value).first()
                if existing:
                    raise HTTPException(status_code=400, detail="Email already exists")
            db_member.email = value
        elif field == "address":
            db_member.address = value
        elif field == "dateOfBirth":
            db_member.date_of_birth = value
        elif field == "emergencyContact":
            db_member.emergency_contact = value
        elif field == "membershipType":
            db_member.membership_type = value
        elif field == "role":
            db_member.role = value
        elif field == "status":
            db_member.status = value
    
    db_member.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_member)
    
    # Convert to response format
    member_data = {
        "id": db_member.id,
        "fullName": db_member.full_name,
        "membershipId": db_member.membership_id,
        "cardNumber": db_member.card_number,
        "phoneNumber": db_member.phone_number,
        "email": db_member.email,
        "address": db_member.address,
        "dateOfBirth": db_member.date_of_birth,
        "emergencyContact": db_member.emergency_contact,
        "membershipType": db_member.membership_type,
        "role": db_member.role,
        "status": db_member.status,
        "createdAt": db_member.created_at,
        "updatedAt": db_member.updated_at
    }
    
    return {
        "member": member_data,
        "message": "Üye bilgileri başarıyla güncellendi",
        "success": True
    }

# Güvenlik endpoint'leri

@app.post("/api/qr/verify")
async def verify_qr_code(qr_data: dict):
    """
    QR kod doğrulama endpoint'i - Mağazalar için
    ISO 20248 benzeri dijital imza doğrulaması
    """
    try:
        qr_string = qr_data.get("qr_code", "")
        if not qr_string:
            raise HTTPException(status_code=400, detail="QR kod verisi gerekli")
        
        is_valid, decoded_data, error_msg = verify_member_qr(qr_string)
        
        if not is_valid:
            return {
                "valid": False,
                "error": error_msg or "Geçersiz QR kod",
                "success": False
            }
        
        return {
            "valid": True,
            "member_data": {
                "member_id": decoded_data.get("member_id"),
                "membership_id": decoded_data.get("membership_id"), 
                "name": decoded_data.get("name"),
                "status": decoded_data.get("status"),
                "organization": decoded_data.get("org"),
                "issued_at": decoded_data.get("issued_at"),
                "expires_at": decoded_data.get("expires_at")
            },
            "verification_time": datetime.utcnow().isoformat(),
            "success": True
        }
        
    except Exception as e:
        return {
            "valid": False,
            "error": f"Doğrulama hatası: {str(e)}",
            "success": False
        }

@app.get("/api/qr/public-key")
async def get_public_key():
    """
    Public key endpoint'i - Mağaza sistemleri için
    Offline doğrulama yapmak isteyen mağazalar bu key'i kullanabilir
    """
    try:
        public_key_pem = get_public_key_pem()
        return {
            "public_key": public_key_pem,
            "algorithm": "RSA-PSS-SHA256",
            "key_format": "PEM",
            "usage": "QR code signature verification",
            "organization": "Community Connect",
            "success": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Public key alınamadı: {str(e)}")

@app.get("/download-cert", response_class=HTMLResponse)
async def download_certificate():
    """
    iOS cihazlarda sertifika kurulumu için
    """
    try:
        with open("cert.pem", "r") as f:
            cert_content = f.read()
        
        return HTMLResponse(
            content=f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>SSL Sertifika İndirme</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body>
                <h2>QR Virtual Card - SSL Sertifika</h2>
                <p>iOS cihazınızda bu uygulamanın HTTPS bağlantısı için sertifikayı yükleyin:</p>
                <a href="data:application/x-pem-file;base64,{cert_content.encode('base64').decode()}" 
                   download="qr-virtual-card.pem" 
                   style="background: #007AFF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">
                   📲 Sertifikayı İndir
                </a>
                <h3>Kurulum Adımları:</h3>
                <ol>
                    <li>Yukarıdaki butona tıklayın</li>
                    <li>iOS Ayarlar > Genel > VPN ve Cihaz Yönetimi</li>
                    <li>İndirilen profili seçin ve "Yükle" deyin</li>
                    <li>Ayarlar > Genel > Hakkında > Sertifika Güveni</li>
                    <li>QR Virtual Card sertifikasını aktif edin</li>
                </ol>
            </body>
            </html>
            """,
            headers={"Content-Type": "text/html"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sertifika okunamadı: {str(e)}")

# NFC Decryption API for MAUI
class NfcDecryptRequest(BaseModel):
    encryptedData: str
    deviceInfo: Optional[str] = None

@app.post("/api/nfc/decrypt")
async def decrypt_nfc_data(request: NfcDecryptRequest):
    """
    Şifrelenmiş NFC verisini çözüp doğrula
    MAUI uygulaması için backend doğrulama endpoint'i
    """
    try:
        encrypted_data = request.encryptedData.strip()
        
        # İlk olarak çift şifrelemeyi çöz
        decrypted_json = secure_qr._decrypt_nfc_data(encrypted_data)
        
        if not decrypted_json:
            raise HTTPException(status_code=400, detail="Veri çözülemedi - geçersiz şifreleme")
        
        # JSON parse et
        try:
            nfc_data = json.loads(decrypted_json)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Geçersiz JSON formatı")
        
        # Gerekli alanları kontrol et
        required_fields = ['v', 'mid', 'name', 'exp', 'sig']
        for field in required_fields:
            if field not in nfc_data:
                raise HTTPException(status_code=400, detail=f"Eksik alan: {field}")
        
        # Version kontrolü
        if nfc_data['v'] != 1:
            raise HTTPException(status_code=400, detail="Desteklenmeyen veri versiyonu")
        
        # Expiration date kontrolü
        exp_date_str = nfc_data['exp']
        try:
            exp_date = datetime.strptime(exp_date_str, '%Y%m%d')
            if exp_date < datetime.utcnow():
                return {
                    "success": False,
                    "error": "EXPIRED",
                    "message": "NFC kartının süresi dolmuş",
                    "expiration_date": exp_date.strftime('%Y-%m-%d'),
                    "current_date": datetime.utcnow().strftime('%Y-%m-%d')
                }
        except ValueError:
            raise HTTPException(status_code=400, detail="Geçersiz expiration date formatı")
        
        # İmza doğrulaması (ECDSA P-256)
        signature_valid = secure_qr._verify_nfc_signature(nfc_data)
        
        if not signature_valid:
            return {
                "success": False,
                "error": "INVALID_SIGNATURE",
                "message": "Dijital imza doğrulanamadı - sahte kart olabilir"
            }
        
        # Üye bilgilerini database'den getir
        membership_id = nfc_data['mid']
        db = next(get_db())
        member = db.query(DBMember).filter(DBMember.membership_id == membership_id).first()
        
        member_info = {
            "membershipId": membership_id,
            "name": nfc_data['name'],
            "expirationDate": exp_date.strftime('%Y-%m-%d'),
            "signatureValid": True,
            "fromDatabase": False
        }
        
        # Database'de üye varsa tam bilgileri ekle
        if member:
            member_info.update({
                "fullName": member.full_name,
                "email": member.email,
                "phoneNumber": member.phone_number,
                "role": member.role,
                "status": member.status,
                "membershipType": member.membership_type,
                "joinDate": member.created_at.strftime('%Y-%m-%d'),
                "fromDatabase": True
            })
        
        return {
            "success": True,
            "valid": True,
            "member": member_info,
            "decryptedData": nfc_data,
            "verificationTime": datetime.utcnow().isoformat(),
            "deviceInfo": request.deviceInfo or "Unknown"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"NFC decrypt error: {e}")
        raise HTTPException(status_code=500, detail=f"Sunucu hatası: {str(e)}")

## NFC işlemleri artık MAUI uygulaması tarafından yapılacak. Backend bu amaçla ek NFC endpointlerini içermemektedir.







if __name__ == "__main__":
    # SSL sertifikalarının varlığını kontrol et
    ssl_keyfile = "./key.pem"
    ssl_certfile = "./cert.pem"
    
    use_ssl = os.path.exists(ssl_keyfile) and os.path.exists(ssl_certfile)
    
    if use_ssl:
        print("🔒 HTTPS modunda başlatılıyor...")
        print(f"🌐 API URL: https://localhost:8000")
        print(f"🌐 Network API URL: https://192.168.1.104:8000")
        print(f"📝 API Docs: https://localhost:8000/docs")
        print(f"🔐 SSL Certificate: {ssl_certfile}")
        print("📱 Mobil cihazlardan erişim: Tarayıcıda SSL uyarısını kabul edin")
        
        # HTTPS ile çalıştır
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            ssl_keyfile=ssl_keyfile,
            ssl_certfile=ssl_certfile
        )
    else:
        print("⚠️  HTTP modunda başlatılıyor (SSL sertifikaları bulunamadı)")
        print(f"🌐 API URL: http://localhost:8000")
        print(f"📝 API Docs: http://localhost:8000/docs")
        print("💡 HTTPS için: openssl komutu ile cert.pem ve key.pem oluşturun")
        
        # HTTP ile çalıştır
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True
        )