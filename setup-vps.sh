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
read -p "Database şifresi (qruser için): " DB_PASSWORD
read -p "Domain adınız (yoksa boş bırakın): " DOMAIN
read -p "Admin email: " ADMIN_EMAIL

# Bilgileri onayla
echo ""
echo -e "${YELLOW}Aşağıdaki bilgilerle kurulum yapılacak:${NC}"
echo "GitHub User: $GITHUB_USER"
echo "Database Password: ********"
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
sudo apt install -y python3 python3-venv python3-pip nginx git curl build-essential libssl-dev libffi-dev python3-dev postgresql postgresql-contrib

# 3. Node.js kurulumu
echo -e "${YELLOW}📦 Node.js kuruluyor...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. PM2 kurulumu
echo -e "${YELLOW}📦 PM2 kuruluyor...${NC}"
sudo npm install -g pm2

# 5. PostgreSQL setup
echo -e "${YELLOW}🗄️  PostgreSQL ayarlanıyor...${NC}"
sudo -u postgres psql << EOF
CREATE DATABASE qrvirtualcard;
CREATE USER qruser WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE qrvirtualcard TO qruser;
\q
EOF

# 6. Proje dizini oluştur ve klonla
echo -e "${YELLOW}📂 Proje klonlanıyor...${NC}"
cd /var/www
sudo mkdir -p qrvirtualcard
sudo chown -R $USER:$USER qrvirtualcard
cd qrvirtualcard

git clone -b vps-deployment https://github.com/$GITHUB_USER/QrVirtualCardGenerator.git .

# 7. Backend kurulumu
echo -e "${YELLOW}🐍 Backend kuruluyor...${NC}"
cd /var/www/qrvirtualcard/backend

python3 -m venv venv
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt

# .env dosyası oluştur
cat > .env << EOF
DATABASE_URL=postgresql://qruser:$DB_PASSWORD@localhost:5432/qrvirtualcard
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)
ALLOWED_ORIGINS=http://localhost:3000,http://$(hostname -I | awk '{print $1}')
ENVIRONMENT=production
DEBUG=False
HOST=0.0.0.0
PORT=8000
ADMIN_EMAIL=$ADMIN_EMAIL
EOF

# Domain varsa ekle
if [ ! -z "$DOMAIN" ]; then
    echo "ALLOWED_ORIGINS=http://localhost:3000,http://$(hostname -I | awk '{print $1}'),https://$DOMAIN,http://$DOMAIN" >> .env
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

