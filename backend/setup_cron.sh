#!/bin/bash

# Günlük temizlik job'u için cron job kurulum script'i

echo "🕐 Günlük temizlik job'u kurulumu başlıyor..."

# Script'in yolunu al
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
CLEANUP_SCRIPT="$SCRIPT_DIR/daily_cleanup.py"

# Python path'ini bul
PYTHON_PATH=$(which python3)
if [ -z "$PYTHON_PATH" ]; then
    PYTHON_PATH=$(which python)
fi

if [ -z "$PYTHON_PATH" ]; then
    echo "❌ Python bulunamadı!"
    exit 1
fi

echo "🐍 Python yolu: $PYTHON_PATH"
echo "📁 Script yolu: $CLEANUP_SCRIPT"

# Script'i executable yap
chmod +x "$CLEANUP_SCRIPT"

# Mevcut crontab'ı al
TEMP_CRON=$(mktemp)
crontab -l > "$TEMP_CRON" 2>/dev/null || echo "" > "$TEMP_CRON"

# Yeni cron job'u
CRON_JOB="0 2 * * * cd $SCRIPT_DIR && $PYTHON_PATH daily_cleanup.py >> /var/log/qr_cleanup.log 2>&1"

# Eğer bu job zaten varsa, kaldır
grep -v "daily_cleanup.py" "$TEMP_CRON" > "$TEMP_CRON.tmp"
mv "$TEMP_CRON.tmp" "$TEMP_CRON"

# Yeni job'u ekle
echo "$CRON_JOB" >> "$TEMP_CRON"

# Crontab'ı güncelle
crontab "$TEMP_CRON"

# Geçici dosyayı temizle
rm "$TEMP_CRON"

echo "✅ Günlük temizlik job'u kuruldu!"
echo "⏰ Her gün saat 02:00'da çalışacak"
echo "📝 Loglar: /var/log/qr_cleanup.log"

# Cron servisinin çalıştığından emin ol
if command -v systemctl &> /dev/null; then
    sudo systemctl enable cron
    sudo systemctl start cron
    echo "🔧 Cron servisi başlatıldı"
elif command -v service &> /dev/null; then
    sudo service cron start
    echo "🔧 Cron servisi başlatıldı"
fi

echo ""
echo "📋 Mevcut cron job'ları:"
crontab -l

echo ""
echo "🧪 Test için manuel çalıştırma:"
echo "cd $SCRIPT_DIR && $PYTHON_PATH daily_cleanup.py"
