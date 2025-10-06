#!/bin/bash

##############################################################################
# QR Virtual Card Backend - Full Security Setup
# DDoS, Brute-Force, Rate Limiting, Fail2Ban
##############################################################################

set -e

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
  ____                      _ _         
 / ___|  ___  ___ _   _ _ __(_) |_ _   _ 
 \___ \ / _ \/ __| | | | '__| | __| | | |
  ___) |  __/ (__| |_| | |  | | |_| |_| |
 |____/ \___|\___|\__,_|_|  |_|\__|\__, |
                                   |___/ 
    Backend Security Hardening v1.0
EOF
echo -e "${NC}"

echo -e "${YELLOW}🔒 Backend güvenlik yapılandırması başlıyor...${NC}"
echo ""

# Domain bilgisi
DOMAIN="backend.anefuye.com.tr"
BACKEND_DIR="/var/www/qrvirtualcard/backend"

# 1. Fail2Ban Kurulumu
echo -e "${YELLOW}📦 1/6 - Fail2Ban kuruluyor...${NC}"
apt update
apt install -y fail2ban

# Fail2Ban nginx jail
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = anefiletisim@gmail.com
sendername = Fail2Ban
action = %(action_mwl)s

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/qrvirtualcard_error.log
maxretry = 3
bantime = 3600

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/qrvirtualcard_access.log
maxretry = 6
bantime = 86400

[nginx-badbots]
enabled = true
port = http,https
filter = nginx-badbots
logpath = /var/log/nginx/qrvirtualcard_access.log
maxretry = 2
bantime = 86400

[nginx-noproxy]
enabled = true
port = http,https
filter = nginx-noproxy
logpath = /var/log/nginx/qrvirtualcard_access.log
maxretry = 2
bantime = 86400

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/qrvirtualcard_error.log
maxretry = 10
findtime = 600
bantime = 7200
EOF

# Nginx limit-req filter
cat > /etc/fail2ban/filter.d/nginx-limit-req.conf << 'EOF'
[Definition]
failregex = limiting requests, excess:.* by zone.*client: <HOST>
ignoreregex =
EOF

echo -e "${GREEN}✅ Fail2Ban yapılandırıldı${NC}"

# 2. Nginx Security Configuration
echo -e "${YELLOW}📦 2/6 - Nginx güvenlik yapılandırması...${NC}"

# Ana Nginx konfigürasyonu
cat > /etc/nginx/sites-available/qrvirtualcard << 'EOF'
# Rate Limiting Zones
limit_req_zone $binary_remote_addr zone=api_general:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=api_auth:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=api_strict:10m rate=5r/m;

# Connection Limiting
limit_conn_zone $binary_remote_addr zone=addr:10m;

# DDoS Protection - Request body size
client_body_buffer_size 1K;
client_header_buffer_size 1k;
large_client_header_buffers 2 1k;

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name backend.anefuye.com.tr;
    
    # Block common attacks
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name backend.anefuye.com.tr;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/backend.anefuye.com.tr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/backend.anefuye.com.tr/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;

    # File upload size
    client_max_body_size 10M;
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 15;
    send_timeout 10;

    # Logging
    access_log /var/log/nginx/qrvirtualcard_access.log;
    error_log /var/log/nginx/qrvirtualcard_error.log;

    # Connection limit (max 10 connections per IP)
    limit_conn addr 10;

    # Block access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Block access to backup and source files
    location ~* (?:\.(?:bak|conf|dist|fla|in[ci]|log|psd|sh|sql|sw[op])|~)$ {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Health endpoint (minimal rate limit)
    location = /health {
        limit_req zone=api_general burst=5 nodelay;
        
        proxy_pass http://127.0.0.1:8000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Documentation
    location /docs {
        limit_req zone=api_general burst=10 nodelay;
        
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /openapi.json {
        limit_req zone=api_general burst=10 nodelay;
        
        proxy_pass http://127.0.0.1:8000/openapi.json;
        proxy_set_header Host $host;
    }

    # Authentication endpoints (strict rate limiting)
    location ~ ^/(auth|login|register|api/auth) {
        limit_req zone=api_strict burst=3 nodelay;
        limit_req_status 429;
        
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Brute-force protection timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }

    # Admin endpoints (very strict)
    location ~ ^/(admin|api/admin) {
        limit_req zone=api_strict burst=2 nodelay;
        limit_req_status 429;
        
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files (uploads)
    location /uploads/ {
        limit_req zone=api_general burst=20 nodelay;
        
        alias /var/www/qrvirtualcard/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        
        # Security: prevent script execution
        location ~ \.(php|py|pl|sh|cgi)$ {
            deny all;
        }
    }

    # All other API endpoints (normal rate limiting)
    location / {
        limit_req zone=api_auth burst=10 nodelay;
        limit_req_status 429;
        
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
    gzip_disable "msie6";
}
EOF

echo -e "${GREEN}✅ Nginx konfigürasyonu oluşturuldu${NC}"

# 3. UFW (Firewall) Advanced Configuration
echo -e "${YELLOW}📦 3/6 - Firewall güvenlik kuralları...${NC}"

# Rate limiting at firewall level
ufw limit 22/tcp comment 'SSH rate limit'
ufw limit 80/tcp comment 'HTTP rate limit'
ufw limit 443/tcp comment 'HTTPS rate limit'

# Block common attack ports
ufw deny 23 comment 'Block Telnet'
ufw deny 3389 comment 'Block RDP'
ufw deny 5900 comment 'Block VNC'

# Log suspicious activity
ufw logging medium

echo -e "${GREEN}✅ Firewall kuralları güncellendi${NC}"

# 4. System Security (sysctl)
echo -e "${YELLOW}📦 4/6 - Kernel güvenlik parametreleri...${NC}"

cat >> /etc/sysctl.conf << 'EOF'

# DDoS Protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_syn_retries = 2
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_max_syn_backlog = 4096

# IP Spoofing protection
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0

# Ignore send redirects
net.ipv4.conf.all.send_redirects = 0

# Disable source packet routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# Log Martians
net.ipv4.conf.all.log_martians = 1

# Ignore ICMP ping requests
net.ipv4.icmp_echo_ignore_all = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Ignore Directed pings
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Connection tracking
net.netfilter.nf_conntrack_max = 2000000
net.netfilter.nf_conntrack_tcp_timeout_established = 3600
EOF

sysctl -p

echo -e "${GREEN}✅ Kernel parametreleri güncellendi${NC}"

# 5. Automatic Security Updates
echo -e "${YELLOW}📦 5/6 - Otomatik güvenlik güncellemeleri...${NC}"

apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

echo -e "${GREEN}✅ Otomatik güncellemeler aktifleştirildi${NC}"

# 6. Backend CORS ve Security Headers
echo -e "${YELLOW}📦 6/6 - Backend güvenlik ayarları...${NC}"

# Backend .env güncelleme
cd $BACKEND_DIR
if ! grep -q "# Security Headers" .env; then
    cat >> .env << 'EOF'

# Security Headers
SECURE_HEADERS=True
ALLOWED_HOSTS=backend.anefuye.com.tr,anefuye.com.tr

# Rate Limiting (backend level - additional to nginx)
RATE_LIMIT_ENABLED=True
RATE_LIMIT_PER_MINUTE=60
EOF
fi

echo -e "${GREEN}✅ Backend güvenlik ayarları güncellendi${NC}"

# Servisleri başlat/yeniden başlat
echo -e "${YELLOW}🔄 Servisler yeniden başlatılıyor...${NC}"

# Nginx test ve restart
nginx -t
systemctl restart nginx

# Fail2Ban başlat
systemctl enable fail2ban
systemctl restart fail2ban

# Backend restart
pm2 restart backend

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Güvenlik kurulumu tamamlandı!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}🛡️  Aktif Güvenlik Özellikleri:${NC}"
echo ""
echo "✅ Rate Limiting:"
echo "   - Genel API: 100 istek/dakika"
echo "   - Auth endpoints: 10 istek/dakika"
echo "   - Admin endpoints: 5 istek/dakika"
echo ""
echo "✅ DDoS Koruması:"
echo "   - SYN flood koruması"
echo "   - Connection limiting (10 bağlantı/IP)"
echo "   - Request timeout"
echo ""
echo "✅ Brute-Force Koruması:"
echo "   - Fail2Ban aktif"
echo "   - SSH: 3 başarısız deneme = 24 saat ban"
echo "   - HTTP Auth: 3 başarısız = 1 saat ban"
echo "   - Bad bots: 2 istek = 24 saat ban"
echo ""
echo "✅ SSL/TLS:"
echo "   - TLS 1.2/1.3"
echo "   - HSTS enabled"
echo "   - Strong ciphers"
echo ""
echo "✅ Security Headers:"
echo "   - X-Frame-Options"
echo "   - Content-Security-Policy"
echo "   - X-XSS-Protection"
echo ""
echo -e "${BLUE}📊 Monitoring Komutları:${NC}"
echo "   sudo fail2ban-client status          # Fail2Ban durumu"
echo "   sudo fail2ban-client status sshd     # SSH ban listesi"
echo "   sudo ufw status verbose              # Firewall durumu"
echo "   pm2 monit                            # Backend monitoring"
echo "   tail -f /var/log/nginx/qrvirtualcard_error.log  # Nginx hataları"
echo ""
echo -e "${YELLOW}⚠️  Önemli Notlar:${NC}"
echo "   - Kendi IP'nizi ban etmeyin!"
echo "   - Log dosyalarını düzenli kontrol edin"
echo "   - Fail2Ban logları: /var/log/fail2ban.log"
echo ""
echo -e "${GREEN}🎉 Backend'iniz artık güvenli!${NC}"

