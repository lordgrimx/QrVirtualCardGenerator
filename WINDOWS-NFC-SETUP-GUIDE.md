# Windows NFC Okuyucu Kurulum Rehberi

## 1. Donanım Gereksinimleri

### Önerilen USB NFC Okuyucular:
- **ACR122U** (En yaygın, PC/SC uyumlu)
- **ACR38U** (Kompakt alternatif)
- **SCM Microsystems** serisi

### ACR122U Kurulumu:

#### Adım 1: Sürücü Kurulumu
1. **Resmi ACS sürücülerini indirin**:
   - ACS web sitesinden en güncel PC/SC sürücüsünü indirin
   - Alternatif: Windows'un built-in CCID sürücüsü (genelde yeterli)

2. **Kurulum Adımları**:
   ```powershell
   # Windows Device Manager'dan USB Smart Card Reader'ın tanındığını kontrol edin
   # Cihaz Yöneticisi > Akıllı Kart Okuyucuları > ACS ACR122U PICC Interface
   ```

#### Adım 2: PC/SC Service Kontrolü
```powershell
# Smart Card Service'in çalıştığını kontrol edin
Get-Service SCardSvr
Start-Service SCardSvr
```

#### Adım 3: Test
```csharp
// Basit bağlantı testi
using PCSC;
var context = ContextFactory.Instance.Establish(SCardScope.System);
var readers = context.GetReaders();
// ACR122U görünmeli
```

## 2. Geliştirme Ortamı

### Gerekli Araçlar:
- **Visual Studio 2022** (Community veya üstü)
- **.NET 8.0 SDK**
- **MAUI Workload**: `dotnet workload install maui`

### NuGet Paketleri:
```xml
<PackageReference Include="PCSC" Version="6.2.0" />
<PackageReference Include="PCSC.Iso7816" Version="6.2.0" />
<PackageReference Include="Microsoft.Extensions.Logging" Version="8.0.0" />
<PackageReference Include="CommunityToolkit.Mvvm" Version="8.2.2" />
```

## 3. Desteklenen NFC Kartları

### Test İçin Önerilen Kartlar:
- **MIFARE Classic 1K** (En yaygın)
- **MIFARE Ultralight**
- **NTAG213/215/216**
- **ISO14443 Type A/B**

### Kart Bilgileri:
- **UID**: 4-10 byte unique identifier
- **ATQA**: Answer to Request Type A
- **SAK**: Select Acknowledge

## 4. Güvenlik Notları

- **Sürücü İmzası**: Sadece imzalı sürücüler kullanın
- **Test Ortamı**: Üretim verileri ile test yapmayın
- **USB Port**: Güvenilir USB portları kullanın
- **Kart Güvenliği**: Test kartlarında hassas veri bulundurmayın

## 5. Troubleshooting

### Yaygın Sorunlar:

#### Okuyucu Tanınmıyor:
```powershell
# Device Manager'dan Unknown Device varsa:
# 1. ACS sürücüsünü yeniden kurun
# 2. USB portu değiştirin
# 3. Windows Update çalıştırın
```

#### PC/SC Service Başlamıyor:
```powershell
# Service'i manuel başlatın:
sc start SCardSvr
# Otomatik başlatma için:
sc config SCardSvr start= auto
```

#### Kart Okunmuyor:
- Kartın temiz ve hasarsız olduğunu kontrol edin
- Farklı kart türü deneyin
- NFC okuyucunun LED'lerini kontrol edin (yeşil = hazır)

### Debug Araçları:
- **SCardSvr logs**: Windows Event Viewer
- **PCSC Debug**: Ortam değişkeni `PCSCLITE_DEBUG=1`
- **ACR122U Test Tool**: ACS tarafından sağlanan test uygulaması

