#!/usr/bin/env python3
"""
Günlük temizlik ve istatistik hesaplama job'u
Bu script günlük olarak çalıştırılarak:
1. 1 aylık eski logları temizler
2. Günlük istatistikleri hesaplar
3. Sistem bakımı yapar
"""

import sys
import os
from datetime import datetime, timedelta

# Backend modüllerini import et
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import cleanup_old_logs, calculate_daily_stats, get_db, SessionLocal

def main():
    print(f"🕐 Günlük temizlik job'u başlıyor... {datetime.now()}")
    
    try:
        # 1. Eski logları temizle (30 gün öncesi)
        print("🧹 Eski loglar temizleniyor...")
        cleanup_result = cleanup_old_logs(retention_days=30)
        print(f"✅ Temizlik tamamlandı: {cleanup_result}")
        
        # 2. Dün için istatistikleri hesapla
        print("📊 Günlük istatistikler hesaplanıyor...")
        yesterday = datetime.now() - timedelta(days=1)
        yesterday_date = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
        stats_result = calculate_daily_stats(yesterday_date)
        print(f"✅ İstatistikler hesaplandı: {stats_result}")
        
        # 3. Bugün için de istatistikleri hesapla (canlı veriler için)
        print("📈 Bugünkü istatistikler hesaplanıyor...")
        today_stats = calculate_daily_stats()
        print(f"✅ Bugünkü istatistikler: {today_stats}")
        
        print(f"🎉 Günlük temizlik job'u başarıyla tamamlandı! {datetime.now()}")
        
    except Exception as e:
        print(f"❌ Günlük temizlik job'u hatası: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
