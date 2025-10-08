# 🚀 VPS Frontend Deployment Guide
## anefuye.com.tr → 91.151.95.47

---

## 📍 Mevcut Durum

```
VPS IP: 91.151.95.47
Backend: backend.anefuye.com.tr → Port 8000 ✅ (Çalışıyor)
Frontend: anefuye.com.tr → Port 3000 (Kuracağız)
```

---

## 🔧 ADIM 1: SSH ile VPS'e Bağlanın

### Windows PowerShell:

```powershell
ssh root@91.151.95.47
# veya
ssh kullanici_adi@91.151.95.47
```

**Not:** Backend kurulumunda kullandığınız kullanıcı adıyla girin.

---

## 🔧 ADIM 2: Node.js ve PM2 Kontrolü

```bash
# Node.js versiyonu kontrol
node --version  # v18 veya v20 olmalı

# PM2 kontrol (backend için kullanıyorsanız)
pm2 list

# Eğer Node.js yoksa veya eski versiyonsa:
# Ubuntu/Debian için:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 yoksa:
npm install -g pm2
```

---

## 🔧 ADIM 3: Frontend Klasörü Oluşturun

```bash
# Ana dizine gidin
cd /var/www

# Frontend klasörü oluşturun
sudo mkdir -p /var/www/frontend
sudo chown $USER:$USER /var/www/frontend
cd /var/www/frontend
```

---

## 🔧 ADIM 4: Dosyaları Upload Edin

### Seçenek A: SCP ile (Windows PowerShell - YENİ TERMINAL):

```powershell
# Yerel build alın
cd D:\Projects\QrVirtualCardGenerator\front
npm run build

# Dosyaları VPS'e yükleyin
scp -r * root@91.151.95.47:/var/www/frontend/

# veya zip ile (daha hızlı):
Compress-Archive -Path * -DestinationPath frontend.zip
scp frontend.zip root@91.151.95.47:/tmp/
```

### Seçenek B: Git ile (VPS'te):

```bash
cd /var/www/frontend

# Git varsa:
git clone https://github.com/YOUR_USERNAME/QrVirtualCardGenerator.git .
cd front

# Yoksa dosyaları manuel upload edin (yukarıdaki SCP)
```

---

## 🔧 ADIM 5: Dependencies Kurun

```bash
cd /var/www/frontend

# Node modules kur
npm install --production

# Build al (eğer local'de almadıysanız)
npm run build
```

---

## 🔧 ADIM 6: .env.production Oluşturun

```bash
nano /var/www/frontend/.env.production
```

**İçerik:**

```bash
# Backend API URL (aynı sunucuda)
NEXT_PUBLIC_API_URL=https://backend.anefuye.com.tr

# NextAuth Configuration
NEXTAUTH_URL=https://anefuye.com.tr
NEXTAUTH_SECRET=your-32-character-secret-here

# Production Settings
NODE_ENV=production
PORT=3000
```

**NEXTAUTH_SECRET oluşturmak için:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🔧 ADIM 7: PM2 ile Başlatın

```bash
cd /var/www/frontend

# PM2 ile başlat
pm2 start npm --name "frontend" -- start

# veya server.js kullanarak:
pm2 start server.js --name "frontend" --node-args="--max-old-space-size=1024"

# PM2'yi otomatik başlatmaya kaydet
pm2 save
pm2 startup
```

**Kontrol:**

```bash
pm2 list
pm2 logs frontend
```

---

## 🔧 ADIM 8: Nginx Reverse Proxy (Önemli!)

Backend için zaten Nginx kullanıyorsanız, frontend için de ekleyin.

```bash
sudo nano /etc/nginx/sites-available/anefuye.com.tr
```

**İçerik:**

```nginx
# Frontend - anefuye.com.tr
server {
    listen 80;
    server_name anefuye.com.tr www.anefuye.com.tr;

    # SSL için Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # HTTP'den HTTPS'e yönlendir
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name anefuye.com.tr www.anefuye.com.tr;

    # SSL Sertifikaları (Let's Encrypt ile oluşturacağız)
    ssl_certificate /etc/letsencrypt/live/anefuye.com.tr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/anefuye.com.tr/privkey.pem;

    # SSL Ayarları
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Next.js frontend'e proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static dosyalar için cache
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # Public dosyalar
    location /public {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600";
    }
}
```

**Nginx'i aktif edin:**

```bash
# Symlink oluştur
sudo ln -s /etc/nginx/sites-available/anefuye.com.tr /etc/nginx/sites-enabled/

# Test et
sudo nginx -t

# Restart
sudo systemctl restart nginx
```

---

## 🔧 ADIM 9: SSL Sertifikası (Let's Encrypt)

```bash
# Certbot kur (yoksa)
sudo apt-get install certbot python3-certbot-nginx

# SSL sertifikası al
sudo certbot --nginx -d anefuye.com.tr -d www.anefuye.com.tr

# Otomatik yenileme testi
sudo certbot renew --dry-run
```

---

## 🔧 ADIM 10: DNS Ayarları

Domain registrar'ınızda (alan adı sağlayıcınızda):

```
A Record:
anefuye.com.tr → 91.151.95.47

A Record (opsiyonel):
www.anefuye.com.tr → 91.151.95.47
```

**Not:** Backend için subdomain zaten ayarlıysa, sadece ana domain'i ekleyin.

---

## 🔧 ADIM 11: Firewall Ayarları

```bash
# Port 80 ve 443'ü açın (zaten açıksa gerek yok)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # Frontend port (internal)

# Durumu kontrol
sudo ufw status
```

---

## ✅ TEST

### 1. Backend Test (zaten çalışıyor):
```
https://backend.anefuye.com.tr/health
```

### 2. Frontend Test (yeni):
```
https://anefuye.com.tr
```

### 3. PM2 Kontrol:
```bash
pm2 list
pm2 logs frontend
pm2 logs backend
```

### 4. Nginx Kontrol:
```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🔄 GÜNCELLEME (Kod Değişikliklerinde)

```bash
# SSH ile bağlan
ssh root@91.151.95.47

# Frontend klasörüne git
cd /var/www/frontend

# Yeni kodu çek (Git kullanıyorsanız)
git pull

# Dependencies güncelle
npm install

# Build al
npm run build

# PM2'yi restart et
pm2 restart frontend

# Logları kontrol et
pm2 logs frontend --lines 50
```

---

## 🛡️ GÜVENLİK ÖNERİLERİ

### 1. Firewall:
```bash
# Sadece gerekli portları açın
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 2. Fail2Ban (Brute force koruması):
```bash
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
```

### 3. SSH Key Authentication:
```powershell
# Windows'ta (local):
ssh-keygen -t rsa -b 4096

# Public key'i VPS'e kopyala
scp ~/.ssh/id_rsa.pub root@91.151.95.47:/tmp/
```

```bash
# VPS'te:
cat /tmp/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

## 📊 PERFORMANS İZLEME

```bash
# PM2 monitoring
pm2 monit

# Sistem kaynakları
htop

# Disk kullanımı
df -h

# Memory kullanımı
free -m

# Process'ler
ps aux | grep node
```

---

## 🆘 SORUN GİDERME

### Frontend çalışmıyor:
```bash
# Logları kontrol
pm2 logs frontend --lines 100

# Port kontrolü
netstat -tulpn | grep :3000

# Manuel başlatma testi
cd /var/www/frontend
NODE_ENV=production PORT=3000 node server.js
```

### Nginx hataları:
```bash
# Error log
sudo tail -f /var/log/nginx/error.log

# Config testi
sudo nginx -t

# Restart
sudo systemctl restart nginx
```

### SSL sorunları:
```bash
# Sertifika kontrolü
sudo certbot certificates

# Yenileme
sudo certbot renew --force-renewal
```

---

## 🎯 SONUÇ

✅ Frontend: https://anefuye.com.tr (Port 3000 → Nginx → HTTPS)  
✅ Backend: https://backend.anefuye.com.tr (Port 8000 → Nginx → HTTPS)  
✅ PM2 ile otomatik başlatma  
✅ SSL/TLS ile güvenli  
✅ Nginx reverse proxy ile hızlı  

---

## 📞 YARDIM

Kurulum sırasında sorun yaşarsanız:

1. PM2 loglarını kontrol edin: `pm2 logs frontend`
2. Nginx loglarını kontrol edin: `sudo tail -f /var/log/nginx/error.log`
3. Port dinleme kontrolü: `netstat -tulpn | grep :3000`

**Başarılar! 🚀**

