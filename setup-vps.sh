#!/bin/bash

##############################################################################
# QR Virtual Card Generator - Otomatik VPS Kurulum Script
# Bu script tüm kurulum işlemlerini otomatik olarak yapar
##############################################################################

set -e

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Banner
echo -e "${BLUE}"
cat << "EOF"
  ___  ____    __     ___      _               _    ____            _ 
 / _ \|  _ \   \ \   / (_)_ __| |_ _   _  __ _| |  / ___|__ _ _ __ | |
| | | | |_) |   \ \ / /| | '__| __| | | |/ _` | | | |   / _` | '__|| |
| |_| |  _ <     \ V / | | |  | |_| |_| | (_| | | | |__| (_| | |   |_|
 \__\_\_| \_\     \_/  |_|_|   \__|\__,_|\__,_|_|  \____\__,_|_|   (_)
                                                                        
              VPS Otomatik Kurulum Script v1.0
EOF
echo -e "${NC}"

# Kullanıcıdan bilgi al
echo -e "${YELLOW}📝 Kurulum Bilgileri${NC}"
echo "=================================="
read -p "GitHub kullanıcı adınız: " GITHUB_USER
echo ""
echo -e "${YELLOW}PostgreSQL Database Bilgileri (Local VPS):${NC}"
read -p "Database adı (varsayılan: qrvirtualcard): " DB_NAME
DB_NAME=${DB_NAME:-qrvirtualcard}
read -p "Database kullanıcı adı (varsayılan: qruser): " DB_USER
DB_USER=${DB_USER:-qruser}
read -p "Database şifresi: " DB_PASSWORD
echo ""
read -p "Domain adınız (örn: anefuye.com.tr): " DOMAIN
read -p "Admin email: " ADMIN_EMAIL

# Bilgileri onayla
echo ""
echo -e "${YELLOW}Aşağıdaki bilgilerle kurulum yapılacak:${NC}"
echo "GitHub User: $GITHUB_USER"
echo "PostgreSQL Database: $DB_NAME"
echo "PostgreSQL User: $DB_USER"
echo "PostgreSQL Password: ********"
echo "Domain: ${DOMAIN:-IP adresi kullanılacak}"
echo "Admin Email: $ADMIN_EMAIL"
echo ""
read -p "Devam etmek istiyor musunuz? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

echo -e "${GREEN}🚀 Kurulum başlıyor...${NC}"

# 1. Sistem güncellemesi
echo -e "${YELLOW}📦 Sistem güncelleniyor...${NC}"
sudo apt update && sudo apt upgrade -y

# 2. Gerekli paketleri yükle
echo -e "${YELLOW}📦 Gerekli paketler yükleniyor...${NC}"
sudo apt install -y python3 python3-venv python3-pip nginx git curl build-essential libssl-dev libffi-dev python3-dev postgresql postgresql-contrib libpq-dev

# 3. Node.js kurulumu
echo -e "${YELLOW}📦 Node.js kuruluyor...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. PM2 kurulumu
echo -e "${YELLOW}📦 PM2 kuruluyor...${NC}"
sudo npm install -g pm2

# 5. PostgreSQL kurulumu ve ayarları
echo -e "${YELLOW}🗄️  PostgreSQL ayarlanıyor...${NC}"

# PostgreSQL servisini başlat
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Database ve kullanıcı oluştur
sudo -u postgres psql << EOF
-- Eğer database varsa sil
DROP DATABASE IF EXISTS $DB_NAME;
DROP USER IF EXISTS $DB_USER;

-- Yeni database ve kullanıcı oluştur
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- PostgreSQL 15+ için gerekli izinler
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF

echo -e "${GREEN}✅ PostgreSQL başarıyla yapılandırıldı!${NC}"

# 6. Proje dizini oluştur ve klonla
echo -e "${YELLOW}📂 Proje klonlanıyor...${NC}"
echo -e "${YELLOW}Not: Repository public olmalıdır veya SSH key ile erişim sağlanmalıdır${NC}"

# Eski dizini varsa temizle
if [ -d "/var/www/qrvirtualcard" ]; then
    echo -e "${YELLOW}⚠️  Eski kurulum bulundu, temizleniyor...${NC}"
    sudo rm -rf /var/www/qrvirtualcard
fi

cd /var/www
sudo mkdir -p qrvirtualcard
sudo chown -R $USER:$USER qrvirtualcard
cd qrvirtualcard

# Public repo olduğu için authentication gerektirmez
git clone -b vps-deployment https://github.com/$GITHUB_USER/QrVirtualCardGenerator.git .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git clone başarısız!${NC}"
    echo -e "${YELLOW}Repository public mi? GitHub kullanıcı adı doğru mu?${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Proje başarıyla klonlandı!${NC}"

# 7. Backend kurulumu
echo -e "${YELLOW}🐍 Backend kuruluyor...${NC}"
cd /var/www/qrvirtualcard/backend

python3 -m venv venv
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt

# .env dosyası oluştur
echo -e "${YELLOW}🔧 .env dosyası oluşturuluyor...${NC}"

cat > .env << EOF
# PostgreSQL Database Configuration (Local VPS)
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Server Configuration
API_HOST=0.0.0.0
API_PORT=8000
HOST=0.0.0.0
PORT=8000

# Security Keys (Otomatik oluşturuluyor)
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://$(hostname -I | awk '{print $1}')

# Environment
ENVIRONMENT=production
DEBUG=False

# Admin Configuration
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_this_password

# NFC Configuration
NFC_ENABLED=true

# Session Configuration
SESSION_TIMEOUT=3600

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=/var/www/qrvirtualcard/backend/uploads

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/www/qrvirtualcard/backend/logs/app.log
EOF

# Domain varsa ekle
if [ ! -z "$DOMAIN" ]; then
    sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://localhost:3000,http://$(hostname -I | awk '{print $1}'),https://$DOMAIN,http://$DOMAIN,https://www.$DOMAIN,http://www.$DOMAIN,https://qr-virtual-card-generator.vercel.app|g" .env
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|g" .env
else
    echo "FRONTEND_URL=http://$(hostname -I | awk '{print $1}')" >> .env
fi

# Database oluştur
python database.py
alembic upgrade head

# Logs dizini
mkdir -p logs
mkdir -p uploads

# 8. Frontend kurulumu
echo -e "${YELLOW}⚛️  Frontend kuruluyor...${NC}"
cd /var/www/qrvirtualcard/front

npm install

# .env.local oluştur
if [ ! -z "$DOMAIN" ]; then
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=https://$DOMAIN/api
EOF
else
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://$(hostname -I | awk '{print $1}')/api
EOF
fi

npm run build

# 9. PM2 ile servisleri başlat
echo -e "${YELLOW}🔄 Servisler başlatılıyor...${NC}"
cd /var/www/qrvirtualcard/backend
pm2 start ecosystem.config.js

cd /var/www/qrvirtualcard/front
pm2 start npm --name "frontend" -- start

pm2 startup
pm2 save

# 10. Nginx kurulumu
echo -e "${YELLOW}🌐 Nginx ayarlanıyor...${NC}"
sudo cp /var/www/qrvirtualcard/backend/nginx.conf /etc/nginx/sites-available/qrvirtualcard

# Domain veya IP ayarla
if [ ! -z "$DOMAIN" ]; then
    sudo sed -i "s/yourdomain.com/$DOMAIN/g" /etc/nginx/sites-available/qrvirtualcard
else
    sudo sed -i "s/server_name yourdomain.com www.yourdomain.com;/server_name $(hostname -I | awk '{print $1}');/g" /etc/nginx/sites-available/qrvirtualcard
fi

sudo ln -s /etc/nginx/sites-available/qrvirtualcard /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# 11. Firewall
echo -e "${YELLOW}🔒 Firewall ayarlanıyor...${NC}"
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Deploy script'i çalıştırılabilir yap
chmod +x /var/www/qrvirtualcard/deploy.sh

# Test
echo -e "${YELLOW}✅ Test ediliyor...${NC}"
sleep 5

pm2 status

# Sonuç
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Kurulum başarıyla tamamlandı!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📱 Erişim Bilgileri:${NC}"
if [ ! -z "$DOMAIN" ]; then
    echo "   Frontend: https://$DOMAIN"
    echo "   Backend API: https://$DOMAIN/api"
    echo "   API Docs: https://$DOMAIN/api/docs"
else
    echo "   Frontend: http://$(hostname -I | awk '{print $1}')"
    echo "   Backend API: http://$(hostname -I | awk '{print $1}')/api"
    echo "   API Docs: http://$(hostname -I | awk '{print $1}')/api/docs"
fi
echo ""
echo -e "${BLUE}📋 Faydalı Komutlar:${NC}"
echo "   PM2 durumu: pm2 status"
echo "   Backend logs: pm2 logs backend"
echo "   Frontend logs: pm2 logs frontend"
echo "   Güncelleme: cd /var/www/qrvirtualcard && ./deploy.sh"
echo ""
if [ ! -z "$DOMAIN" ]; then
    echo -e "${YELLOW}🔒 SSL sertifikası için:${NC}"
    echo "   sudo apt install -y certbot python3-certbot-nginx"
    echo "   sudo certbot --nginx -d $DOMAIN"
fi
echo ""
echo -e "${GREEN}🎉 Hayırlı olsun!${NC}"

