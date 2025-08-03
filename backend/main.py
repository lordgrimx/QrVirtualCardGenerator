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

# Import database components
from database import get_db, init_db, Member as DBMember

# Import crypto utilities
from crypto_utils import (
    generate_secure_member_qr, 
    generate_nfc_compact_qr,
    verify_member_qr, 
    verify_nfc_compact_qr,
    get_public_key_pem,
    get_nfc_public_key_pem
)

# Load environment variables
load_dotenv()

app = FastAPI(
    title="QR Virtual Card API",
    description="QR Virtual Card Backend API",
    version="1.0.0"
)

# CORS middleware ekliyoruz
# CORS Configuration from environment
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url,
        "http://localhost:3000",  # Development
        "http://127.0.0.1:3000",  # Alternative localhost
    ],
    allow_credentials=True,
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
    nfcQrCode: Optional[str] = None     # NFC kompakt QR kod
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
        
        # Güvenli QR kod oluştur (hem standart hem NFC)
        try:
            secure_qr_data = generate_secure_member_qr(response_data)
            response_data["secureQrCode"] = secure_qr_data
        except Exception as e:
            print(f"QR kod oluşturma hatası: {e}")
            response_data["secureQrCode"] = None
        
        # NFC Compact QR kod oluştur
        try:
            nfc_compact_qr = generate_nfc_compact_qr(response_data)
            response_data["nfcQrCode"] = nfc_compact_qr
        except Exception as e:
            print(f"NFC QR kod oluşturma hatası: {e}")
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
            "updatedAt": member.updated_at
        }
        member_list.append(member_data)
    
    return {
        "members": member_list,
        "count": len(member_list),
        "success": True
    }

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
        print(f"✅ Standart QR kod oluşturuldu - Member ID: {member.id}, Data length: {len(secure_qr_data)}")
    except Exception as e:
        print(f"❌ Standart QR kod oluşturma hatası: {e}")
        member_data["secureQrCode"] = None
    
    # NFC Compact QR kod oluştur
    try:
        nfc_compact_qr = generate_nfc_compact_qr(member_data)
        member_data["nfcQrCode"] = nfc_compact_qr
        print(f"✅ NFC compact QR kod oluşturuldu - Member ID: {member.id}, Data length: {len(nfc_compact_qr)}")
    except Exception as e:
        print(f"❌ NFC QR kod oluşturma hatası: {e}")
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

@app.post("/api/qr/verify-nfc")
async def verify_nfc_qr_code(qr_data: dict, db: Session = Depends(get_db)):
    """
    NFC kompakt QR kod doğrulama endpoint'i - NTAG215 için
    Ultra-kompakt ECDSA imza doğrulaması (540 bytes sınırı)
    """
    try:
        qr_string = qr_data.get("qr_code", "")
        if not qr_string:
            raise HTTPException(status_code=400, detail="NFC QR kod verisi gerekli")
        
        is_valid, decoded_data, error_msg = verify_nfc_compact_qr(qr_string)
        
        if not is_valid:
            return {
                "valid": False,
                "error": error_msg or "Geçersiz NFC QR kod",
                "success": False
            }
        
        # NFC'de member_id ve name var, detayları DB'den çek ve karşılaştır
        member_id = decoded_data.get("member_id")
        nfc_name = decoded_data.get("name", "").strip()
        member = db.query(DBMember).filter(DBMember.id == member_id).first()
        
        if not member:
            return {
                "valid": False,
                "error": "Üye kaydı bulunamadı",
                "success": False
            }
        
        # İsim kontrolü (güvenlik için)
        db_name = member.full_name.strip()
        name_match = nfc_name.lower() == db_name.lower()
        
        return {
            "valid": True,
            "member_data": {
                "member_id": member_id,
                "membership_id": member.membership_id,
                "name": nfc_name,  # NFC'den gelen isim (offline görünür)
                "db_name": db_name,  # DB'deki isim (karşılaştırma için)
                "name_verified": name_match,  # İsim eşleşmesi
                "status": decoded_data.get("status"),  # NFC'den gelen güncel status
                "organization": "Community Connect",
                "phone": member.phone_number,
                "email": member.email,
                "role": member.role,
                "issued_at": decoded_data.get("issued_at"),
                "nonce": decoded_data.get("nonce"),
                "format": "nfc_compact"
            },
            "verification_time": datetime.utcnow().isoformat(),
            "data_source": "hybrid_nfc_db",
            "name_verification": {
                "nfc_name": nfc_name,
                "db_name": db_name,
                "match": name_match
            },
            "success": True
        }
        
    except Exception as e:
        return {
            "valid": False,
            "error": f"NFC doğrulama hatası: {str(e)}",
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

@app.get("/api/qr/nfc-public-key")
async def get_nfc_public_key():
    """
    NFC Public key endpoint'i - NFC okuyucular için
    NTAG215 kompakt QR kod doğrulaması için ECDSA P-256 key
    """
    try:
        nfc_public_key_pem = get_nfc_public_key_pem()
        return {
            "public_key": nfc_public_key_pem,
            "algorithm": "ECDSA-P256-SHA256",
            "key_format": "PEM",
            "usage": "NFC compact QR signature verification",
            "organization": "Community Connect",
            "memory_optimized": True,
            "ntag215_compatible": True,
            "max_size_bytes": 540,
            "success": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"NFC public key alınamadı: {str(e)}")

@app.get("/api/qr/demo-scanner")
async def demo_scanner_page():
    """
    Demo QR kod tarayıcı sayfası
    Test amaçlı - gerçek mağaza entegrasyonu simülasyonu
    """
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Community Connect - QR Scanner Demo</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .title { color: #2563eb; margin-bottom: 10px; }
            .subtitle { color: #6b7280; font-size: 14px; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; color: #374151; }
            textarea { width: 100%; min-height: 100px; padding: 10px; border: 2px solid #d1d5db; border-radius: 5px; font-family: monospace; font-size: 12px; }
            button { background: #2563eb; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
            button:hover { background: #1d4ed8; }
            .result { margin-top: 20px; padding: 15px; border-radius: 5px; }
            .success { background: #dcfce7; border: 1px solid #16a34a; color: #166534; }
            .error { background: #fef2f2; border: 1px solid #dc2626; color: #991b1b; }
            .warning { background: #fffbeb; border: 1px solid #d97706; color: #92400e; }
            .member-info { background: #eff6ff; border: 1px solid #3b82f6; color: #1e40af; margin-top: 10px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
            .info-item { padding: 8px; background: rgba(255,255,255,0.7); border-radius: 3px; }
            .status-active { color: #059669; font-weight: bold; }
            .status-inactive { color: #dc2626; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="title">🏪 Mağaza QR Tarayıcı</h1>
                <p class="subtitle">Community Connect - Üye Doğrulama Sistemi</p>
                <p class="subtitle">ISO 20248 Benzeri Kriptografik İmza Doğrulaması</p>
            </div>
            
            <div class="form-group">
                <label for="qrInput">QR Kod Verisi:</label>
                <textarea id="qrInput" placeholder="QR kod verisini buraya yapıştırın..."></textarea>
            </div>
            
            <button onclick="verifyQR()">🔍 QR Kodu Doğrula</button>
            
            <div id="result"></div>
        </div>
        
        <script>
        // QR tip detection ve uygun endpoint seçimi
        function detectQRType(qrData) {
            // NFC compact QR: base64-urlsafe, yaklaşık 100-120 karakter, padding yok
            // Standard QR: JSON benzeri veya daha uzun base64
            
            if (qrData.length < 200 && 
                qrData.match(/^[A-Za-z0-9_-]+$/) && 
                !qrData.includes('{')) {
                return 'nfc';  // URL-safe base64, compact
            } else {
                return 'standard';  // JSON veya normal format
            }
        }
        
        async function verifyQR() {
            const qrData = document.getElementById('qrInput').value.trim();
            const resultDiv = document.getElementById('result');
            
            if (!qrData) {
                resultDiv.innerHTML = '<div class="result warning">⚠️ Lütfen QR kod verisi girin</div>';
                return;
            }
            
            const qrType = detectQRType(qrData);
            const endpoint = qrType === 'nfc' ? '/api/qr/verify-nfc' : '/api/qr/verify';
            
            try {
                resultDiv.innerHTML = `<div class="result">🔄 ${qrType === 'nfc' ? 'NFC' : 'Standart'} QR kod doğrulanıyor...</div>`;
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ qr_code: qrData })
                });
                
                const result = await response.json();
                
                if (result.valid) {
                    const memberData = result.member_data;
                    const isActive = memberData.status === 'active';
                    const formatType = qrType === 'nfc' ? 'NFC Kompakt' : 'Standart';
                    const algorithm = qrType === 'nfc' ? 'ECDSA P-256' : 'RSA-PSS SHA256';
                    const dataSource = result.data_source || 'full_qr_data';
                    
                    resultDiv.innerHTML = `
                        <div class="result success">
                            <h3>✅ Geçerli Üyelik Kartı (${formatType})</h3>
                            <div class="member-info">
                                <h4>👤 Üye Bilgileri:</h4>
                                <div class="info-grid">
                                    <div class="info-item"><strong>Ad:</strong> ${memberData.name}</div>
                                    <div class="info-item"><strong>Üye ID:</strong> ${memberData.membership_id}</div>
                                    <div class="info-item"><strong>Durum:</strong> <span class="status-${isActive ? 'active' : 'inactive'}">${memberData.status.toUpperCase()}</span></div>
                                    <div class="info-item"><strong>Organizasyon:</strong> ${memberData.organization}</div>
                                    <div class="info-item"><strong>Algorithm:</strong> ${algorithm}</div>
                                    <div class="info-item"><strong>Veri Kaynağı:</strong> ${dataSource === 'hybrid_nfc_db' ? 'NFC + DB' : 'QR İçi'}</div>
                                </div>
                                
                                ${qrType === 'standard' && memberData.expires_at ? `
                                <div class="info-grid" style="margin-top: 10px;">
                                    <div class="info-item"><strong>Veriliş:</strong> ${new Date(memberData.issued_at).toLocaleDateString('tr-TR')}</div>
                                    <div class="info-item"><strong>Geçerlilik:</strong> ${new Date(memberData.expires_at).toLocaleDateString('tr-TR')}</div>
                                </div>
                                ` : ''}
                                
                                ${qrType === 'nfc' && memberData.nonce ? `
                                <div class="info-grid" style="margin-top: 10px;">
                                    <div class="info-item"><strong>Veriliş:</strong> ${new Date(memberData.issued_at).toLocaleDateString('tr-TR')}</div>
                                    <div class="info-item"><strong>Nonce:</strong> ${memberData.nonce}</div>
                                    ${memberData.name_verified !== undefined ? `
                                    <div class="info-item"><strong>İsim Doğrulaması:</strong> <span style="color: ${memberData.name_verified ? '#059669' : '#dc2626'}; font-weight: bold;">${memberData.name_verified ? '✅ Eşleşti' : '⚠️ Farklı'}</span></div>
                                    ${!memberData.name_verified ? `<div class="info-item"><strong>DB İsmi:</strong> ${memberData.db_name}</div>` : ''}
                                    ` : ''}
                                </div>
                                ` : ''}
                                
                                <p style="margin-top: 10px; font-size: 12px; opacity: 0.7;">
                                    Doğrulama Zamanı: ${new Date(result.verification_time).toLocaleString('tr-TR')}
                                </p>
                            </div>
                            ${!isActive ? '<div class="result warning" style="margin-top: 10px;">⚠️ Üyelik aktif değil!</div>' : ''}
                        </div>
                    `;
                } else {
                    resultDiv.innerHTML = `
                        <div class="result error">
                            <h3>❌ Geçersiz QR Kod (${qrType === 'nfc' ? 'NFC' : 'Standart'})</h3>
                            <p><strong>Hata:</strong> ${result.error}</p>
                            <p style="font-size: 12px; margin-top: 10px;">
                                ${qrType === 'nfc' ? 
                                  'Bu NFC QR kod sahte, zamanı dolmuş veya bozulmuş olabilir. ECDSA imza geçersiz.' :
                                  'Bu QR kod sahte, zamanı dolmuş veya bozulmuş olabilir. RSA imza geçersiz.'
                                }
                            </p>
                        </div>
                    `;
                }
            } catch (error) {
                resultDiv.innerHTML = `
                    <div class="result error">
                        <h3>🚫 Bağlantı Hatası</h3>
                        <p>Doğrulama servisine bağlanılamıyor: ${error.message}</p>
                        <p style="font-size: 12px; margin-top: 10px;">
                            Denenen endpoint: ${endpoint} (${qrType === 'nfc' ? 'NFC' : 'Standart'} format)
                        </p>
                    </div>
                `;
            }
        }
        
        // Enter tuşu ile doğrulama
        document.getElementById('qrInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                verifyQR();
            }
        });
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True) 