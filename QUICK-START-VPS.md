# 🚀 Hızlı Başlangıç - VPS Kurulum

Bu dosya, yeni VPS'inize hızlıca kurulum yapmanız için özetlenmiş adımları içerir.

## 📝 Ön Hazırlık (Lokal Bilgisayarınızda)

1. **Bu branch'i GitHub'a pushlayın:**
```bash
git push -u origin vps-deployment
```

2. **VPS bilgilerinizi not edin:**
   - VPS IP Adresi: `_________________`
   - SSH Kullanıcı Adı: `_________________`
   - SSH Şifresi/Key: `_________________`
   - (Opsiyonel) Domain: `_________________`

## 🔌 VPS'e Bağlanma

```bash
ssh root@VPS_IP_ADRESI
# veya
ssh kullaniciadi@VPS_IP_ADRESI
```

## ⚡ Hızlı Kurulum (Tek Script)

VPS'e bağlandıktan sonra aşağıdaki komutu çalıştırın:

```bash
# Önce kurulum script'ini indirin
curl -o setup-vps.sh https://raw.githubusercontent.com/KULLANICI_ADINIZ/QrVirtualCardGenerator/vps-deployment/setup-vps.sh

# Script'i çalıştırılabilir yapın
chmod +x setup-vps.sh

# Kurulumu başlatın
./setup-vps.sh
```

**Veya manuel kurulum için aşağıdaki adımları takip edin:**

## 📦 1. Sistem Güncellemesi ve Gerekli Paketler

```bash
# Sistem güncelle
sudo apt update && sudo apt upgrade -y

# Gerekli paketleri yükle
sudo apt install -y python3.12 python3.12-venv python3-pip nginx git curl nodejs npm postgresql postgresql-contrib

# PM2 kur
sudo npm install -g pm2
```

## 🗄️ 2. Database Kurulumu

```bash
sudo -u postgres psql << EOF
CREATE DATABASE qrvirtualcard;
CREATE USER qruser WITH PASSWORD 'güçlü_şifreniz';
GRANT ALL PRIVILEGES ON DATABASE qrvirtualcard TO qruser;
\q
EOF
```

## 📂 3. Projeyi Klonla

```bash
cd /var/www
sudo mkdir -p qrvirtualcard
sudo chown -R $USER:$USER qrvirtualcard
cd qrvirtualcard

git clone -b vps-deployment https://github.com/KULLANICI_ADINIZ/QrVirtualCardGenerator.git .
```

## 🐍 4. Backend Kurulumu

```bash
cd /var/www/qrvirtualcard/backend

# Virtual env oluştur ve aktifleştir
python3.12 -m venv venv
source venv/bin/activate

# Paketleri yükle
pip install -r requirements.txt

# .env dosyası oluştur
cp .env.template .env
nano .env  # Düzenleyin: DATABASE_URL, SECRET_KEY vs.

# Database tablolarını oluştur
python database.py
alembic upgrade head

# Logs dizini oluştur
mkdir -p logs

# PM2 ile başlat
pm2 start ecosystem.config.js
```

## ⚛️ 5. Frontend Kurulumu

```bash
cd /var/www/qrvirtualcard/front

# .env.local oluştur
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://$(hostname -I | awk '{print $1}')/api
EOF

# Paketleri yükle ve build et
npm install
npm run build

# PM2 ile başlat
pm2 start npm --name "frontend" -- start

# PM2'yi kaydet
pm2 startup
pm2 save
```

## 🌐 6. Nginx Kurulumu

```bash
# Nginx config'i kopyala
sudo cp /var/www/qrvirtualcard/backend/nginx.conf /etc/nginx/sites-available/qrvirtualcard

# Domain veya IP adresini düzenleyin
sudo nano /etc/nginx/sites-available/qrvirtualcard
# server_name satırını kendi domain/IP'nizle değiştirin

# Aktifleştir
sudo ln -s /etc/nginx/sites-available/qrvirtualcard /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test ve başlat
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔒 7. Firewall (UFW)

```bash
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

## ✅ 8. Test ve Kontrol

```bash
# PM2 durumu
pm2 status

# Backend test
curl http://localhost:8000/health

# Frontend test
curl http://localhost:3000

# Public erişim
echo "Frontend: http://$(hostname -I | awk '{print $1}')"
echo "Backend API: http://$(hostname -I | awk '{print $1}')/api"
```

## 🔄 9. Güncelleme (Deploy)

Sonraki güncellemeler için:

```bash
cd /var/www/qrvirtualcard
./deploy.sh
```

## 🆘 Sorun Giderme

### PM2 logları
```bash
pm2 logs backend
pm2 logs frontend
```

### Nginx logları
```bash
sudo tail -f /var/log/nginx/qrvirtualcard_error.log
```

### Service'leri restart
```bash
pm2 restart all
sudo systemctl restart nginx
```

### Database problemi
```bash
sudo systemctl status postgresql
sudo -u postgres psql qrvirtualcard
```

## 📞 Yardım

Detaylı bilgi için `VPS-DEPLOYMENT-GUIDE.md` dosyasına bakın.

## ✨ SSL Sertifikası (Opsiyonel - Domain varsa)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

**🎉 Kurulum Tamamlandı!**

Projeniz artık VPS'inizde çalışıyor. Tarayıcınızda VPS IP adresinizi ziyaret ederek test edebilirsiniz.

