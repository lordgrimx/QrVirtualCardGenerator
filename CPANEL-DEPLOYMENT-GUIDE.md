# cPanel Deployment Rehberi - QR Virtual Card Backend

Bu rehber, QR Virtual Card Backend uygulamasını cPanel hosting üzerinde deploy etmek için gerekli adımları açıklar.

## 🎯 Hedef Yapı

- **Ana Domain**: `sabrialperenkaya.com.tr`
- **Backend API**: `api.sabrialperenkaya.com.tr`
- **Frontend**: `qr.sabrialperenkaya.com.tr`
- **Veritabanı**: MySQL (cPanel)

## 📋 Ön Gereksinimler

### 1. cPanel'de Subdomain Oluşturma

1. cPanel > **Subdomains** bölümüne gidin
2. Aşağıdaki subdomain'leri oluşturun:
   - `api.sabrialperenkaya.com.tr` → `/home/sabrialp/api.sabrialperenkaya.com.tr`
   - `qr.sabrialperenkaya.com.tr` → `/home/sabrialp/qr.sabrialperenkaya.com.tr`

### 2. MySQL Veritabanı Ayarları

1. cPanel > **MySQL Databases** bölümüne gidin
2. Veritabanınız zaten oluşturulmuş:
   - **Database Name**: `sabrialp_Qr`
   - **Username**: `sabrialp_sabrialp`
   - **Password**: `Asker123!asker123.`

### 3. Python Environment Kurulumu

1. cPanel > **Python App** bölümüne gidin
2. Yeni Python uygulaması oluşturun:
   - **Python Version**: 3.11
   - **Application Root**: `/home/sabrialp/api.sabrialperenkaya.com.tr`
   - **Application URL**: `api.sabrialperenkaya.com.tr`
   - **Application Startup File**: `passenger_wsgi.py`
   - **Application Entry Point**: `application`

## 🚀 Backend Deployment Adımları

### 1. Dosyaları Upload Etme

Backend klasöründeki tüm dosyaları `/home/sabrialp/api.sabrialperenkaya.com.tr` klasörüne upload edin:

```
/home/sabrialp/api.sabrialperenkaya.com.tr/
├── passenger_wsgi.py      # Entry point
├── main.py               # FastAPI uygulaması
├── database.py           # Veritabanı bağlantıları
├── crypto_utils.py       # Şifreleme fonksiyonları
├── startup.py            # Başlangıç scripti
├── requirements.txt      # Python paketleri
├── .htaccess            # Apache konfigürasyonu
├── .env                 # Environment variables
├── alembic/             # Database migrations
├── crypto_keys/         # Şifreleme anahtarları
└── logs/                # Log dosyaları (opsiyonel)
```

### 2. Environment Variables (.env)

`environment_config.txt` dosyasını `.env` olarak yeniden adlandırın:

```bash
# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sabrialp_Qr
DB_USER=sabrialp_sabrialp
DB_PASSWORD=Asker123!asker123.

# Full connection string
DATABASE_URL=mysql+pymysql://sabrialp_sabrialp:Asker123!asker123.@localhost:3306/sabrialp_Qr?charset=utf8mb4

# Frontend URL
FRONTEND_URL=https://qr.sabrialperenkaya.com.tr

# Secret Key
SECRET_KEY=QRVirtualCard2024_SuperSecure_ProductionKey_SafeToUse_MySQLMigration!

# SSL Settings
USE_SSL=true

# CORS Origins
ALLOWED_ORIGINS=https://sabrialperenkaya.com.tr,https://www.sabrialperenkaya.com.tr,https://qr.sabrialperenkaya.com.tr,https://api.sabrialperenkaya.com.tr

# Production Settings
DEBUG=false
ENVIRONMENT=production
```

### 3. Python Paketlerini Yükleme

cPanel > **Python App** > **Paket Yöneticisi** üzerinden gerekli paketleri yükleyin:

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
PyMySQL==1.1.0
mysqlclient==2.2.0
asgiref==3.7.2
sqlalchemy==2.0.23
alembic==1.13.1
cryptography==41.0.7
qrcode==7.4.2
pillow==10.1.0
websockets==12.0
gunicorn
requests==2.31.0
pyopenssl==24.2.1
```

### 4. Veritabanı Başlatma

SSH veya cPanel Terminal'de:

```bash
cd /home/sabrialp/api.sabrialperenkaya.com.tr
python startup.py
```

Bu script:
- Environment variables'ları yükler
- Veritabanı bağlantısını test eder
- Gerekli tabloları oluşturur
- Default admin kullanıcısını ekler

### 5. SSL Sertifikası Aktifleştirme

1. cPanel > **SSL/TLS** bölümüne gidin
2. **Let's Encrypt** ile SSL sertifikası oluşturun:
   - `api.sabrialperenkaya.com.tr`
   - `qr.sabrialperenkaya.com.tr`

## 🔧 Konfigürasyon Dosyaları

### passenger_wsgi.py
```python
#!/home/sabrialp/virtualenv/api.sabrialperenkaya.com.tr/3.11/bin/python3.11
# cPanel için WSGI entry point
```

### .htaccess
```apache
PassengerEnabled On
PassengerAppRoot /home/sabrialp/api.sabrialperenkaya.com.tr
PassengerAppType wsgi
PassengerStartupFile passenger_wsgi.py
PassengerPython /home/sabrialp/virtualenv/api.sabrialperenkaya.com.tr/3.11/bin/python3.11
```

## ✅ Test Etme

### 1. Backend API Test

Tarayıcıda şu URL'leri ziyaret edin:

- **Health Check**: `https://api.sabrialperenkaya.com.tr/health`
- **API Docs**: `https://api.sabrialperenkaya.com.tr/docs`
- **Root**: `https://api.sabrialperenkaya.com.tr/`

### 2. Database Test

API docs üzerinden:
- `/api/members` endpoint'ini test edin
- `/api/auth/login` ile admin girişi yapın:
  - Email: `admin@elfed.org.tr`
  - Password: `elfed2024`

## 🐛 Sorun Giderme

### 1. Log Dosyaları

```
/home/sabrialp/logs/qr_api.log         # Uygulama logları
/home/sabrialp/logs/api_access.log     # Apache access logları
/home/sabrialp/logs/api_error.log      # Apache error logları
```

### 2. Yaygın Hatalar

**"Entry point option requires startup file"**
- `passenger_wsgi.py` dosyasının doğru konumda olduğundan emin olun
- Python path'lerinin doğru olduğunu kontrol edin

**"Database connection error"**
- `.env` dosyasındaki veritabanı bilgilerini kontrol edin
- MySQL service'inin çalıştığından emin olun

**"CORS errors"**
- `ALLOWED_ORIGINS` listesinin güncel olduğunu kontrol edin
- Frontend URL'lerinin doğru olduğundan emin olun

### 3. Debugging

```bash
# Error loglarını kontrol etme
tail -f /home/sabrialp/logs/api_error.log

# Uygulama loglarını kontrol etme
tail -f /home/sabrialp/logs/qr_api.log

# Python path'leri kontrol etme
python -c "import sys; print(sys.path)"
```

## 🔄 Frontend Deployment

Frontend (`qr.sabrialperenkaya.com.tr`) için ayrı bir deployment guide gerekecek. Next.js uygulamasını static export veya Vercel'den cPanel'e migrate etme seçenekleri değerlendirilmelidir.

## 📞 Destek

Herhangi bir sorunla karşılaştığınızda:
1. Log dosyalarını kontrol edin
2. cPanel error loglarını inceleyin
3. Python app console'dan restart yapın

## 🎉 Tamamlandı!

Backend başarıyla deploy edildikten sonra:
- ✅ `https://api.sabrialperenkaya.com.tr` erişilebilir olmalı
- ✅ Database bağlantısı çalışıyor olmalı
- ✅ Admin paneli fonksiyonel olmalı
- ✅ NFC ve QR endpoints aktif olmalı