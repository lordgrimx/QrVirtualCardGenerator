# ANEF NFC Desktop (Windows)

Electron + React tabanlı masaüstü uygulama. Mobil (Expo) ile aynı tasarım ve akış; ek olarak PC tarafında NFC Write özelliği bulunur.

## Kurulum

Önkoşullar:
- Node.js 18+
- Windows için NFC okuyucu sürücüsü (ör. ACR122U) yüklü olmalı

```bash
cd desktopNFC
npm install

# (Önerilir) ANEF logosunu kopyalayın
# Bu adım build ikonunun doğru görünmesi için gerekli
copy ..\expoNFC\assets\anef-logo.png .\assets\anef-logo.png

# Geliştirme
npm run electron:dev

# Üretim paketi
npm run build
```

## Özellikler
- NFC Okuma: NDEF Text (karttan ham içerik okunur, UI'da UID ve geçmiş gösterilir)
- NFC Yazma (yalnızca PC): Girilen metni NDEF Text olarak karta yazar
- ANEF teması, logo ve sekmeli arayüz

> Not: Backend doğrulama, offline doğrulama ve QR tarama adımları bir sonraki iterasyonda eklenecektir.


