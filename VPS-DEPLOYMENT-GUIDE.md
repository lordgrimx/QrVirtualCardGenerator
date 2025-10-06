# VPS Deployment Rehberi 🚀

Bu rehber, QR Virtual Card Generator projesinin yeni VPS sunucunuza nasıl deploy edileceğini adım adım açıklar.

## 📋 Gereksinimler

- Ubuntu 20.04+ veya Debian 10+ çalışan VPS
- Root veya sudo yetkisi
- Domain adı (opsiyonel ama önerilir)
- En az 2GB RAM
- En az 20GB disk alanı

## 🔧 1. Adım: VPS'e SSH ile Bağlanma

```bash
ssh root@VPS_IP_ADRESI
# veya
ssh kullaniciadi@VPS_IP_ADRESI
```

## 📦 2. Adım: Sistem Güncellemeleri ve Gerekli Paketler

```bash
# Sistem güncellemesi
sudo apt update && sudo apt upgrade -y

# Gerekli paketleri yükleyin
sudo apt install -y python3.12 python3.12-venv python3-pip nginx git curl build-essential libssl-dev libffi-dev python3-dev

# Node.js 20.x kurulumu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL kurulumu
sudo apt install -y postgresql postgresql-contrib

# PM2 kurulumu (process manager)
sudo npm install -g pm2
```

## 🗄️ 3. Adım: PostgreSQL Veritabanı Kurulumu

```bash
# PostgreSQL kullanıcısına geçiş
sudo -u postgres psql

# PostgreSQL içinde aşağıdaki komutları çalıştırın:
CREATE DATABASE qrvirtualcard;
CREATE USER qruser WITH PASSWORD 'güçlü_şifreniz';
GRANT ALL PRIVILEGES ON DATABASE qrvirtualcard TO qruser;
\q
```

## 📂 4. Adım: Projeyi VPS'e Klonlama

```bash
# Proje dizini oluştur
cd /var/www
sudo mkdir -p qrvirtualcard
sudo chown -R $USER:$USER qrvirtualcard
cd qrvirtualcard

# Projeyi klonla (vps-deployment branch'ini)
git clone -b vps-deployment https://github.com/KULLANICI_ADINIZ/QrVirtualCardGenerator.git .

# Eğer private repo ise SSH key eklemeniz gerekebilir
```

## 🐍 5. Adım: Backend Kurulumu

```bash
cd /var/www/qrvirtualcard/backend

# Virtual environment oluştur
python3.12 -m venv venv
source venv/bin/activate

# Paketleri yükle
pip install --upgrade pip
pip install -r requirements.txt

# .env dosyasını oluştur
cp .env.template .env
nano .env
```

### .env Dosyası İçeriği:
```env
# Database
DATABASE_URL=postgresql://qruser:güçlü_şifreniz@localhost:5432/qrvirtualcard

# Security
SECRET_KEY=çok_güçlü_ve_random_bir_key_buraya
JWT_SECRET_KEY=başka_bir_güçlü_random_key

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Environment
ENVIRONMENT=production
DEBUG=False

# Server
HOST=0.0.0.0
PORT=8000
```

```bash
# Veritabanı tablolarını oluştur
python database.py

# Alembic migrations çalıştır
alembic upgrade head
```

## ⚛️ 6. Adım: Frontend Kurulumu

```bash
cd /var/www/qrvirtualcard/front

# Paketleri yükle
npm install

# .env.local dosyası oluştur
nano .env.local
```

### .env.local İçeriği:
```env
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
# veya
NEXT_PUBLIC_API_URL=http://VPS_IP_ADRESI:8000
```

```bash
# Production build oluştur
npm run build
```

## 🔄 7. Adım: PM2 ile Backend'i Başlatma

```bash
cd /var/www/qrvirtualcard/backend

# PM2 ecosystem dosyası oluştur (daha önce oluşturuldu)
pm2 start ecosystem.config.js

# PM2'yi sistem başlangıcında otomatik başlat
pm2 startup
pm2 save

# PM2 durumunu kontrol et
pm2 status
pm2 logs backend
```

## 🌐 8. Adım: Nginx Konfigürasyonu

```bash
# Nginx config dosyasını kopyala
sudo cp /var/www/qrvirtualcard/backend/nginx.conf /etc/nginx/sites-available/qrvirtualcard

# Sembolik link oluştur
sudo ln -s /etc/nginx/sites-available/qrvirtualcard /etc/nginx/sites-enabled/

# Default site'ı devre dışı bırak (opsiyonel)
sudo rm /etc/nginx/sites-enabled/default

# Nginx konfigürasyonunu test et
sudo nginx -t

# Nginx'i yeniden başlat
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔒 9. Adım: SSL Sertifikası (Let's Encrypt)

Domain adınız varsa ücretsiz SSL sertifikası:

```bash
# Certbot kurulumu
sudo apt install -y certbot python3-certbot-nginx

# SSL sertifikası al
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Otomatik yenileme testi
sudo certbot renew --dry-run
```

## 🔥 10. Adım: Güvenlik Duvarı Ayarları

```bash
# UFW firewall kurulumu
sudo apt install -y ufw

# Temel kurallar
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Firewall'u aktifleştir
sudo ufw enable
sudo ufw status
```

## 🎯 11. Adım: PM2 ile Frontend'i Başlatma

```bash
cd /var/www/qrvirtualcard/front

# Frontend'i PM2 ile başlat
pm2 start npm --name "frontend" -- start

# PM2'yi kaydet
pm2 save
```

## 🔍 Kontrol ve Test

```bash
# Backend kontrolü
curl http://localhost:8000/health

# Frontend kontrolü
curl http://localhost:3000

# PM2 durumu
pm2 status

# Nginx durumu
sudo systemctl status nginx

# Logları görüntüleme
pm2 logs backend
pm2 logs frontend
sudo tail -f /var/log/nginx/error.log
```

## 🔄 Güncelleme ve Deploy

```bash
# Deployment script kullanarak otomatik güncelleme
cd /var/www/qrvirtualcard
./deploy.sh
```

veya manuel:

```bash
cd /var/www/qrvirtualcard

# Son değişiklikleri çek
git pull origin vps-deployment

# Backend güncelleme
cd backend
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
pm2 restart backend

# Frontend güncelleme
cd ../front
npm install
npm run build
pm2 restart frontend
```

## 📊 Monitoring ve Bakım

```bash
# PM2 monitoring
pm2 monit

# Sistem kaynakları
htop
df -h
free -h

# Log dosyalarını temizleme
pm2 flush

# PostgreSQL backup
sudo -u postgres pg_dump qrvirtualcard > backup_$(date +%Y%m%d).sql
```

## 🆘 Sorun Giderme

### Backend başlamıyor:
```bash
pm2 logs backend
cd /var/www/qrvirtualcard/backend
source venv/bin/activate
python main.py  # Manuel test
```

### Database bağlantı hatası:
```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT 1"
```

### Nginx hatası:
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Port kullanımda:
```bash
sudo lsof -i :8000
sudo lsof -i :3000
```

## 📱 Erişim

Kurulum tamamlandıktan sonra:

- **Frontend:** http://VPS_IP_ADRESI veya https://yourdomain.com
- **Backend API:** http://VPS_IP_ADRESI/api veya https://yourdomain.com/api
- **API Docs:** http://VPS_IP_ADRESI/api/docs

## 🎉 Tebrikler!

VPS deployment işlemi tamamlandı! Projeniz artık kendi VPS'inizde çalışıyor.

## 📞 Yardım

Sorun yaşarsanız:
1. PM2 loglarını kontrol edin
2. Nginx loglarını kontrol edin
3. Database bağlantısını kontrol edin
4. Firewall kurallarını kontrol edin

---

**Not:** Bu dosyadaki `yourdomain.com`, `VPS_IP_ADRESI`, `güçlü_şifreniz` gibi değerleri kendi bilgilerinizle değiştirin.

