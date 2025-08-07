# .NET MAUI NFC Card Reader - İmplementasyon Rehberi

Bu dokümanda QR Virtual Card projesi için geliştirilmiş .NET MAUI cross-platform NFC uygulamasının detaylı implementasyon adımları yer almaktadır.

## 📁 Proje Yapısı

```
maui-nfc-app/
├── Platforms/
│   ├── Android/
│   │   ├── AndroidManifest.xml      # NFC izinleri ve intent filtreleri
│   │   ├── MainActivity.cs          # Android NFC initialization
│   │   └── Resources/xml/
│   │       └── nfc_tech_filter.xml  # NFC teknoloji filtreleri
│   ├── iOS/
│   │   ├── Entitlements.plist       # Core NFC entitlements
│   │   ├── Info.plist              # NFC usage description
│   │   └── AppDelegate.cs          # iOS NFC initialization
│   └── Windows/
│       └── Services/
│           ├── IWindowsNfcService.cs # USB NFC reader interface
│           └── WindowsNfcService.cs  # PCSC wrapper implementation
├── Services/
│   ├── INfcService.cs              # Cross-platform NFC interface
│   ├── NfcService.cs               # Plugin.NFC wrapper
│   ├── ICryptoService.cs           # Crypto verification interface
│   ├── CryptoService.cs            # RSA-PSS signature verification
│   ├── MockNfcService.cs           # Test ve development için mock service
│   ├── ErrorHandlingService.cs     # Error handling ve logging
│   └── TestConfigurationService.cs # Debug ve test konfigürasyonu
├── ViewModels/
│   ├── MainViewModel.cs            # Ana sayfa MVVM logic
│   └── DebugViewModel.cs           # Debug panel MVVM logic
├── Views/
│   ├── MainPage.xaml/.cs           # Ana kullanıcı arayüzü
│   └── DebugPage.xaml/.cs          # Debug ve test paneli
├── Converters/
│   └── CommonConverters.cs         # XAML value converters
├── MauiProgram.cs                  # Dependency injection setup
├── App.xaml/.cs                    # Application setup
└── AppShell.xaml/.cs               # Shell navigation
```

## 🚀 Kurulum ve Çalıştırma

### 1. Ön Gereksinimler

```bash
# .NET 8 SDK
dotnet --version  # 8.0.0 veya üstü

# MAUI workload'ı yükle
dotnet workload install maui

# Platform-specific gereksinimleri kontrol et
dotnet workload list
```

### 2. Bağımlılıkları Yükle

```bash
cd maui-nfc-app
dotnet restore
```

### 3. Platform-Specific Kurulum

#### Android
```bash
# Android SDK ve NDK kurulu olmalı
# Android 7.0 (API 24) veya üstü gerekli
dotnet build -f net8.0-android
```

#### iOS
```bash
# Xcode 14+ gerekli
# iOS 11.0+ ve iPhone 7+ gerekli (Core NFC için)
dotnet build -f net8.0-ios
```

#### Windows
```bash
# Windows 10 version 1903+ gerekli
# PCSC service aktif olmalı
dotnet build -f net8.0-windows10.0.19041.0
```

## 🔧 Konfigürasyon

### Backend API Bağlantısı

`MauiProgram.cs` dosyasında backend URL'sini güncelleyin:

```csharp
builder.Services.AddHttpClient<ICryptoService, CryptoService>(client =>
{
    client.BaseAddress = new Uri("https://your-backend-url:8000");
    client.Timeout = TimeSpan.FromSeconds(30);
});
```

### Debug Modda Test

Debug modda uygulamayı çalıştırdığınızda:

1. Ana sayfada "Debug Panel" butonu görünür
2. Mock NFC servisini etkinleştirebilirsiniz
3. Test verilerini manuel olarak gönderebilirsiniz
4. Sistem diagnostik bilgilerini görüntüleyebilirsiniz

## 📱 Platform-Specific Özellikler

### Android

#### NFC İzinleri
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.nfc" android:required="true" />
```

#### NFC Intent Handling
```csharp
// MainActivity.cs - OnNewIntent
protected override void OnNewIntent(Intent? intent)
{
    base.OnNewIntent(intent);
    HandleNfcIntent(intent);
}
```

#### Desteklenen NFC Teknolojileri
- NDEF (Text, URI, Custom)
- NFC-A (ISO 14443 Type A)
- NFC-B (ISO 14443 Type B)
- MIFARE Classic/Ultralight

### iOS

#### Core NFC Entitlements
```xml
<!-- Entitlements.plist -->
<key>com.apple.developer.nfc.readersession.formats</key>
<array>
    <string>NDEF</string>
    <string>TAG</string>
</array>
```

#### Kullanım İzni
```xml
<!-- Info.plist -->
<key>NFCReaderUsageDescription</key>
<string>Bu uygulama üyelik kartlarındaki NFC verilerini okumak için NFC özelliğini kullanır.</string>
```

#### Sınırlamalar
- Sadece iPhone 7+ destekleniyor
- Background'da NFC okuma yok
- Sistem tarafından 60 saniye timeout
- Her okuma için kullanıcı onayı gerekli

### Windows

#### USB NFC Reader Desteği
- ACR122U (önerilen)
- ACR1255U-J1
- Herhangi bir PCSC uyumlu reader

#### PCSC Service
```csharp
// Windows Service Status kontrol
var status = await windowsNfcService.GetPcscServiceStatusAsync();
if (!status.IsRunning)
{
    // PCSC service başlatma gerekli
}
```

#### Desteklenen Komutlar
- Card detection
- APDU command sending
- NDEF data reading/writing

## 🔐 Güvenlik ve Şifreleme

### RSA-PSS Dijital İmza Doğrulama

Uygulama Python backend'inizle aynı kriptografik standardı kullanır:

```csharp
// ISO 20248 benzeri format: PAYLOAD|SIGNATURE|METADATA
var parts = qrData.Split('|');
var payloadBytes = Convert.FromBase64String(parts[0]);
var signature = Convert.FromBase64String(parts[1]);

// RSA-PSS doğrulama
var isValid = publicKey.VerifyData(
    payloadBytes,
    signature,
    HashAlgorithmName.SHA256,
    RSASignaturePadding.Pss);
```

### Backend API Entegrasyonu

```csharp
// Public key alma
var response = await httpClient.GetFromJsonAsync<PublicKeyResponse>("/api/qr/public-key");

// QR kod doğrulama (isteğe bağlı - offline preferred)
var verifyResponse = await httpClient.PostAsJsonAsync("/api/qr/verify", new { qr_code = qrData });
```

## 🧪 Test ve Debug

### Mock NFC Service

Development sırasında gerçek NFC hardware'ı olmadan test:

```csharp
// MauiProgram.cs
#if DEBUG
builder.Services.AddSingleton<INfcService, MockNfcService>();
#else
builder.Services.AddSingleton<INfcService, NfcService>();
#endif
```

### Debug Panel Özellikleri

1. **Mock Mode Toggle**: Gerçek NFC yerine test verisi
2. **Backend URL Configuration**: Development/production URL switch
3. **System Information**: Platform, version, capabilities
4. **NFC Diagnostics**: Hardware status, capability test
5. **Crypto Testing**: Public key fetch, signature verification test
6. **Activity Logging**: Real-time operation logs

### Test Senaryoları

```csharp
// Test 1: NFC Hardware Detection
var isSupported = nfcService.IsNfcSupported;
var isEnabled = nfcService.IsNfcEnabled;

// Test 2: Mock Data Generation
var mockData = await mockNfcService.GenerateMockDataAsync();

// Test 3: Crypto Verification
var (isValid, memberData, error) = await cryptoService.VerifyQrSignatureAsync(testData);
```

## 🚀 Production Deployment

### Android

1. **Release Build**:
```bash
dotnet publish -f net8.0-android -c Release
```

2. **APK İmzalama**:
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore release-key.keystore app.apk alias_name
```

3. **Google Play Console**:
- NFC permission açıklaması ekleyin
- Target API level 34 (Android 14)
- 64-bit requirement karşılanıyor

### iOS

1. **Release Build**:
```bash
dotnet publish -f net8.0-ios -c Release
```

2. **App Store Connect**:
- NFC usage description mandatory
- Core NFC entitlement approval gerekli
- iOS 11.0+ minimum requirement

3. **TestFlight Distribution**:
- NFC test için fiziksel cihaz gerekli
- Simulator'da NFC test edilemez

### Windows

1. **Release Build**:
```bash
dotnet publish -f net8.0-windows10.0.19041.0 -c Release
```

2. **MSIX Package**:
- Microsoft Store deployment için
- USB NFC reader drivers dahil edilmeli

3. **Sideload Deployment**:
- Enterprise deployment için
- PowerShell execution policy ayarı gerekli

## 🔧 Troubleshooting

### Android Sorunları

**NFC algılanmıyor:**
```bash
# AndroidManifest.xml kontrol
# NFC permissions ve intent filters
# Hardware requirements
```

**Plugin.NFC crash:**
```bash
# Proguard rules ekle
# Multi-dex enable
# Target SDK version kontrol
```

### iOS Sorunları

**Core NFC başlamıyor:**
```bash
# Entitlements.plist kontrol
# iOS version requirement (11.0+)
# iPhone model requirement (7+)
```

**Permission denied:**
```bash
# Info.plist NFCReaderUsageDescription
# Provisioning profile entitlements
```

### Windows Sorunları

**PCSC service yok:**
```bash
# Windows features: Smart Card service
# USB NFC reader drivers
# Administrative rights
```

**DLL not found:**
```bash
# winscard.dll system path
# .NET runtime dependencies
```

## 📚 Ek Kaynaklar

### NFC Standards
- [ISO 14443](https://www.iso.org/standard/73596.html) - Contact-less cards
- [ISO 15693](https://www.iso.org/standard/39693.html) - Vicinity cards
- [NFC Forum](https://nfc-forum.org/) - NDEF specifications

### Platform Documentation
- [Android NFC Guide](https://developer.android.com/guide/topics/connectivity/nfc)
- [iOS Core NFC](https://developer.apple.com/documentation/corenfc)
- [Windows PCSC](https://docs.microsoft.com/en-us/windows/win32/secauthn/smart-card-and-reader-access-functions)

### .NET MAUI Resources
- [Microsoft MAUI Docs](https://docs.microsoft.com/en-us/dotnet/maui/)
- [Plugin.NFC](https://github.com/franckbour/Plugin.NFC)
- [Community Toolkit MVVM](https://docs.microsoft.com/en-us/dotnet/communitytoolkit/mvvm/)

Bu implementasyon rehberi ile QR Virtual Card projenize tamamen entegre edilmiş, production-ready bir cross-platform NFC uygulaması geliştirebilirsiniz.
