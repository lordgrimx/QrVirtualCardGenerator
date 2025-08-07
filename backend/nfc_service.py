"""
NFC Reader Service
NFC kartlarından QR kod verisi okuma ve yazma işlevleri
"""

import json
import logging
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
import asyncio
import threading

logger = logging.getLogger(__name__)

class NFCReaderService:
    """NFC okuyucu servisi"""
    
    def __init__(self):
        self.is_reading = False
        self.reader_thread = None
        self.last_read_data = None
        self.nfc_available = False
        
        # NFC kütüphanelerini kontrol et
        try:
            import nfc
            self.nfc_available = True
            logger.info("NFC kütüphanesi yüklendi")
        except ImportError:
            logger.warning("NFC kütüphanesi bulunamadı - simülasyon modu aktif")
            self.nfc_available = False
    
    def check_nfc_availability(self) -> Dict[str, Any]:
        """NFC donanım durumunu kontrol et"""
        if not self.nfc_available:
            return {
                "available": False,
                "error": "NFC kütüphanesi yüklü değil",
                "message": "pip install nfcpy gerekli"
            }
        
        try:
            import nfc
            with nfc.ContactlessFrontend('usb') as clf:
                if clf:
                    return {
                        "available": True,
                        "device": str(clf.device),
                        "capabilities": clf.capabilities
                    }
                else:
                    return {
                        "available": False,
                        "error": "NFC okuyucu bulunamadı",
                        "message": "USB NFC okuyucu takılı değil"
                    }
        except Exception as e:
            return {
                "available": False,
                "error": f"NFC kontrol hatası: {str(e)}",
                "message": "NFC donanımını kontrol edin"
            }
    
    def read_nfc_card(self, timeout: int = 10) -> Dict[str, Any]:
        """NFC kartından veri okuma"""
        if not self.nfc_available:
            # Simülasyon modu - test verisi döndür
            return {
                "success": True,
                "data": json.dumps({
                    "type": "simulation",
                    "member_id": "TEST_001",
                    "message": "NFC Simülasyon Verisi",
                    "timestamp": datetime.now().isoformat()
                }),
                "card_type": "SIMULATION",
                "message": "Simülasyon modu - gerçek NFC okuyucu bulunamadı"
            }
        
        try:
            import nfc
            
            def on_connect(tag):
                """Kart bağlandığında çalışır"""
                try:
                    if tag.ndef:
                        # NDEF formatındaki veriyi oku
                        for record in tag.ndef.records:
                            if record.type == 'urn:nfc:wkt:T':  # Text record
                                text_data = record.text
                                return {
                                    "success": True,
                                    "data": text_data,
                                    "card_type": "NDEF_TEXT",
                                    "card_id": tag.identifier.hex(),
                                    "message": "NDEF text verisi okundu"
                                }
                    
                    # Raw veri okuma
                    return {
                        "success": True,
                        "data": tag.identifier.hex(),
                        "card_type": "RAW",
                        "card_id": tag.identifier.hex(),
                        "message": "Kart ID'si okundu"
                    }
                        
                except Exception as e:
                    return {
                        "success": False,
                        "error": f"Kart okuma hatası: {str(e)}"
                    }
            
            with nfc.ContactlessFrontend('usb') as clf:
                if not clf:
                    return {
                        "success": False,
                        "error": "NFC okuyucu bulunamadı"
                    }
                
                logger.info(f"NFC okuyucu hazır: {clf.device}")
                
                # Kart bekleme
                tag = clf.connect(rdwr={'on-connect': on_connect}, 
                                 terminate=lambda: False)
                
                if tag:
                    return on_connect(tag)
                else:
                    return {
                        "success": False,
                        "error": "Timeout - kart bulunamadı",
                        "timeout": timeout
                    }
                    
        except Exception as e:
            logger.error(f"NFC okuma hatası: {e}")
            return {
                "success": False,
                "error": f"NFC okuma hatası: {str(e)}"
            }
    
    def write_nfc_card(self, data: str, card_type: str = "text") -> Dict[str, Any]:
        """NFC kartına veri yazma"""
        if not self.nfc_available:
            return {
                "success": True,
                "message": "Simülasyon modu - veri yazıldı (gerçek NFC yok)",
                "data_written": len(data),
                "card_type": "SIMULATION"
            }
        
        try:
            import nfc
            import ndef
            
            def on_connect(tag):
                """Kart bağlandığında yazma işlemi"""
                try:
                    if not tag.ndef:
                        # NDEF formatı yok, formatla
                        tag.ndef = []
                    
                    if card_type == "text":
                        # Text record oluştur
                        record = ndef.TextRecord(data, language='en')
                        tag.ndef.records = [record]
                        
                        return {
                            "success": True,
                            "message": "Text verisi yazıldı",
                            "data_written": len(data),
                            "card_type": "NDEF_TEXT",
                            "card_id": tag.identifier.hex()
                        }
                    
                    return {
                        "success": False,
                        "error": "Desteklenmeyen veri tipi"
                    }
                        
                except Exception as e:
                    error_msg = str(e)
                    if "IO error" in error_msg or "null" in error_msg:
                        error_msg = "Kart bulunamadı veya yazma korumalı - Kartı okuyucuya daha yakın yerleştirin"
                    elif "permission" in error_msg.lower():
                        error_msg = "İzin hatası - Kartın yazma koruması kapalı olmalı"
                    elif "timeout" in error_msg.lower():
                        error_msg = "Zaman aşımı - Kartı okuyucuda daha uzun tutun"
                    
                    return {
                        "success": False,
                        "error": f"Yazma hatası: {error_msg}",
                        "original_error": str(e)
                    }
            
            with nfc.ContactlessFrontend('usb') as clf:
                if not clf:
                    return {
                        "success": False,
                        "error": "NFC okuyucu bulunamadı"
                    }
                
                logger.info("NFC kartına yazma bekleniyor...")
                
                tag = clf.connect(rdwr={'on-connect': on_connect})
                
                if tag:
                    return on_connect(tag)
                else:
                    return {
                        "success": False,
                        "error": "Yazma timeout - kart bulunamadı"
                    }
                    
        except Exception as e:
            logger.error(f"NFC yazma hatası: {e}")
            error_msg = str(e)
            if "IO error" in error_msg or "null" in error_msg:
                error_msg = "NFC I/O Hatası - Kartı okuyucuya yerleştirin ve tekrar deneyin"
            elif "timeout" in error_msg.lower():
                error_msg = "Bağlantı zaman aşımı - NFC kartı bulunamadı"
            elif "permission" in error_msg.lower() or "access" in error_msg.lower():
                error_msg = "Erişim hatası - NFC okuyucu izinlerini kontrol edin"
            
            return {
                "success": False,
                "error": f"NFC yazma hatası: {error_msg}",
                "original_error": str(e),
                "troubleshooting": [
                    "NFC kartının okuyucuya doğru yerleştirildiğinden emin olun",
                    "Kartın yazma korumalı olmadığını kontrol edin", 
                    "NFC okuyucunun düzgün bağlandığını kontrol edin",
                    "Farklı bir NFC kartı deneyin"
                ]
            }
    
    async def start_continuous_reading(self, callback_function=None):
        """Sürekli NFC okuma modunu başlat"""
        if self.is_reading:
            return {"error": "Zaten okuma modu aktif"}
        
        self.is_reading = True
        
        def reading_loop():
            while self.is_reading:
                try:
                    result = self.read_nfc_card(timeout=2)
                    if result.get("success") and callback_function:
                        callback_function(result)
                    
                    # Kısa bekleme
                    asyncio.sleep(1)
                    
                except Exception as e:
                    logger.error(f"Sürekli okuma hatası: {e}")
                    asyncio.sleep(2)
        
        # Ayrı thread'de çalıştır
        self.reader_thread = threading.Thread(target=reading_loop)
        self.reader_thread.daemon = True
        self.reader_thread.start()
        
        return {
            "success": True,
            "message": "Sürekli NFC okuma başlatıldı"
        }
    
    def stop_continuous_reading(self):
        """Sürekli okuma modunu durdur"""
        self.is_reading = False
        if self.reader_thread:
            self.reader_thread.join(timeout=3)
        
        return {
            "success": True,
            "message": "NFC okuma durduruldu"
        }
    
    def get_reader_status(self) -> Dict[str, Any]:
        """NFC okuyucu durumunu döndür"""
        return {
            "nfc_available": self.nfc_available,
            "is_reading": self.is_reading,
            "last_read": self.last_read_data,
            "hardware_status": self.check_nfc_availability()
        }

# Global NFC service instance
nfc_service = NFCReaderService()
