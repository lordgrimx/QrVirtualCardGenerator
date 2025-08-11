using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MauiNfcReader.Models;
using MauiNfcReader.Services;
using Microsoft.Extensions.Logging;
using System.Collections.ObjectModel;
using System.Text;
using Microsoft.Maui.Networking;
using Microsoft.Maui.Devices;
using CommunityToolkit.Maui.Views;
using Microsoft.Maui.ApplicationModel;

namespace MauiNfcReader.ViewModels;

/// <summary>
/// NFC okuyucu ana ekran ViewModel'i
/// MVVM pattern ile UI binding'i sağlar
/// </summary>
public partial class NfcReaderViewModel : ObservableObject
{
    private readonly INfcService _nfcService;
    private readonly ICryptoService _cryptoService;
    private readonly IQrVerificationService _qrVerificationService;
    private readonly IBackendApiService _backendApiService;
    private readonly ILogger<NfcReaderViewModel> _logger;

    // Bindable Properties
    [ObservableProperty]
    private bool isConnected;

    [ObservableProperty]
    private bool isReading;

    [ObservableProperty]
    private string selectedReader = string.Empty;

    [ObservableProperty]
    private string statusMessage = "Hazır";

    [ObservableProperty]
    private string decryptionKey = string.Empty;

    [ObservableProperty]
    private NfcCardData? lastReadCard;

    [ObservableProperty]
    private string decryptedContent = string.Empty;

    [ObservableProperty]
    private QrVerificationResult? lastVerification;

    [ObservableProperty]
    private string lastVerificationMode = string.Empty; // "Online" | "Offline"

    // Platform flags for UI visibility
    public bool IsWindows => DeviceInfo.Platform == DevicePlatform.WinUI;
    public bool IsAndroid => DeviceInfo.Platform == DevicePlatform.Android;

    // Writer UI kaldırıldı

    // Collections
    public ObservableCollection<string> AvailableReaders { get; } = new();
    public ObservableCollection<NfcCardData> ReadHistory { get; } = new();

    public NfcReaderViewModel(
        INfcService nfcService, 
        ICryptoService cryptoService,
        IQrVerificationService qrVerificationService,
        IBackendApiService backendApiService,
        ILogger<NfcReaderViewModel> logger)
    {
        _nfcService = nfcService;
        _cryptoService = cryptoService;
        _qrVerificationService = qrVerificationService;
        _backendApiService = backendApiService;
        _logger = logger;

        // Event subscriptions
        _nfcService.CardDetected += OnCardDetected;
        _nfcService.CardRemoved += OnCardRemoved;

        // Initialize
        _ = Task.Run(RefreshReadersAsync);
        _ = Task.Run(EnsurePublicKeyCachedAsync);
    }

    /// <summary>
    /// Mevcut okuyucuları yenile
    /// </summary>
    [RelayCommand]
    private async Task RefreshReadersAsync()
    {
        try
        {
            StatusMessage = "Okuyucular aranıyor...";
            
            var readers = await _nfcService.GetAvailableReadersAsync();
            
            AvailableReaders.Clear();
            foreach (var reader in readers)
            {
                AvailableReaders.Add(reader);
            }

            if (AvailableReaders.Count > 0)
            {
                SelectedReader = AvailableReaders[0];
                StatusMessage = $"{AvailableReaders.Count} okuyucu bulundu";
            }
            else
            {
                StatusMessage = "Hiç NFC okuyucu bulunamadı";
            }

            _logger.LogInformation($"Okuyucu tarama tamamlandı: {AvailableReaders.Count} adet");
        }
        catch (Exception ex)
        {
            StatusMessage = $"Okuyucu tarama hatası: {ex.Message}";
            _logger.LogError(ex, "Okuyucu tarama hatası");
        }
    }

    /// <summary>
    /// Seçili okuyucuya bağlan
    /// </summary>
    [RelayCommand]
    private async Task ConnectAsync()
    {
        if (string.IsNullOrEmpty(SelectedReader))
        {
            StatusMessage = "Lütfen bir okuyucu seçin";
            return;
        }

        try
        {
            StatusMessage = "Bağlanıyor...";
            
            var success = await _nfcService.ConnectToReaderAsync(SelectedReader);
            
            if (success)
            {
                IsConnected = true;
                StatusMessage = $"'{SelectedReader}' bağlandı - Kart yerleştirin";
                _logger.LogInformation($"Okuyucu bağlantısı başarılı: {SelectedReader}");
            }
            else
            {
                StatusMessage = $"'{SelectedReader}' bağlantı hatası";
                _logger.LogWarning($"Okuyucu bağlantı başarısız: {SelectedReader}");
            }
        }
        catch (Exception ex)
        {
            StatusMessage = $"Bağlantı hatası: {ex.Message}";
            _logger.LogError(ex, "Okuyucu bağlantı hatası");
        }
    }

    /// <summary>
    /// Okuyucu bağlantısını kes
    /// </summary>
    [RelayCommand]
    private async Task DisconnectAsync()
    {
        try
        {
            StatusMessage = "Bağlantı kesiliyor...";
            
            await _nfcService.DisconnectAsync();
            
            IsConnected = false;
            StatusMessage = "Bağlantı kesildi";
            
            _logger.LogInformation("Okuyucu bağlantısı kesildi");
        }
        catch (Exception ex)
        {
            StatusMessage = $"Bağlantı kesme hatası: {ex.Message}";
            _logger.LogError(ex, "Bağlantı kesme hatası");
        }
    }

    /// <summary>
    /// Manuel kart okuma
    /// </summary>
    [RelayCommand]
    private async Task ReadCardAsync()
    {
        if (!IsConnected)
        {
            StatusMessage = "Önce okuyucuya bağlanın";
            return;
        }

        try
        {
            IsReading = true;
            StatusMessage = "Kart okunuyor...";

            var cardData = await _nfcService.ReadCardAsync();
            
            if (cardData != null)
            {
                await ProcessCardDataAsync(cardData);
            }
            else
            {
                StatusMessage = "Kart okuma başarısız";
            }
        }
        catch (Exception ex)
        {
            StatusMessage = $"Okuma hatası: {ex.Message}";
            _logger.LogError(ex, "Kart okuma hatası");
        }
        finally
        {
            IsReading = false;
        }
    }

    /// <summary>
    /// Şifre çözme anahtarı oluştur
    /// </summary>
    [RelayCommand]
    private void GenerateKey()
    {
        try
        {
            DecryptionKey = _cryptoService.GenerateKey();
            StatusMessage = "Yeni şifre anahtarı oluşturuldu";
            _logger.LogInformation("Yeni şifre anahtarı oluşturuldu");
        }
        catch (Exception ex)
        {
            StatusMessage = $"Anahtar oluşturma hatası: {ex.Message}";
            _logger.LogError(ex, "Anahtar oluşturma hatası");
        }
    }

    /// <summary>
    /// Veriyi manuel şifre çözme
    /// </summary>
    [RelayCommand]
    private async Task DecryptDataAsync()
    {
        if (LastReadCard?.RawData == null || LastReadCard.RawData.Length == 0)
        {
            StatusMessage = "Şifre çözülecek veri yok";
            return;
        }

        if (string.IsNullOrEmpty(DecryptionKey))
        {
            StatusMessage = "Şifre anahtarı girin";
            return;
        }

        try
        {
            StatusMessage = "Şifre çözülüyor...";

            // Raw data'nın string olduğunu varsayalım ve Base64 decode edelim
            var dataToDecrypt = LastReadCard.RawData;
            
            // Eğer hex string ise önce byte array'e çevir
            if (LastReadCard.RawData.All(b => b < 128)) // ASCII range check
            {
                var hexString = System.Text.Encoding.ASCII.GetString(LastReadCard.RawData);
                if (IsHexString(hexString))
                {
                    dataToDecrypt = Convert.FromHexString(hexString);
                }
            }

            var decryptedBytes = await _cryptoService.DecryptAsync(dataToDecrypt, DecryptionKey);
            DecryptedContent = System.Text.Encoding.UTF8.GetString(decryptedBytes);
            
            if (LastReadCard != null)
            {
                LastReadCard.DecryptedData = DecryptedContent;
            }

            StatusMessage = "Şifre çözme başarılı";
            _logger.LogInformation("Veri şifre çözme başarılı");
        }
        catch (Exception ex)
        {
            StatusMessage = $"Şifre çözme hatası: {ex.Message}";
            DecryptedContent = "Şifre çözme başarısız";
            _logger.LogError(ex, "Şifre çözme hatası");
        }
    }

    /// <summary>
    /// Geçmişi temizle
    /// </summary>
    [RelayCommand]
    private void ClearHistory()
    {
        ReadHistory.Clear();
        LastReadCard = null;
        DecryptedContent = string.Empty;
        StatusMessage = "Geçmiş temizlendi";
        _logger.LogInformation("Okuma geçmişi temizlendi");
    }

    /// <summary>
    /// Kart algılama olayı
    /// </summary>
    private async void OnCardDetected(object? sender, CardDetectedEventArgs e)
    {
        try
        {
            StatusMessage = "Kart algılandı, okunuyor...";
            
            // Otomatik okuma
            var cardData = await _nfcService.ReadCardAsync();
            if (cardData != null)
            {
                await ProcessCardDataAsync(cardData);
            }
        }
        catch (Exception ex)
        {
            // Bazı cihazlarda ilk intent akışında NotImplementedException görülebilir; sessizce yut ve akışı bozma
            if (ex is NotImplementedException || (ex.Message?.Contains("NotImplemented", StringComparison.OrdinalIgnoreCase) ?? false))
            {
                _logger.LogWarning(ex, "İlk otomatik okuma denemesinde NotImplemented - yoksayılıyor");
                StatusMessage = "Hazır";
                return;
            }
            StatusMessage = $"Otomatik okuma hatası: {ex.Message}";
            _logger.LogError(ex, "Otomatik kart okuma hatası");
        }
    }

    /// <summary>
    /// Kart çıkarılma olayı
    /// </summary>
    private void OnCardRemoved(object? sender, CardRemovedEventArgs e)
    {
        StatusMessage = "Kart çıkarıldı";
        _logger.LogInformation("Kart çıkarıldı");
    }

    private async Task EnsurePublicKeyCachedAsync()
    {
        try
        {
            if (Connectivity.Current.NetworkAccess != NetworkAccess.Internet)
                return;
            var existing = Preferences.Default.Get<string>("CachedPublicKeyPem", string.Empty);
            if (!string.IsNullOrWhiteSpace(existing))
                return;
            var (ok, pem, _) = await _backendApiService.GetPublicKeyAsync();
            if (ok && !string.IsNullOrWhiteSpace(pem))
            {
                Preferences.Default.Set("CachedPublicKeyPem", pem);
                _logger.LogInformation("Public key önbelleğe alındı");
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Public key önbellekleme denemesi başarısız");
        }
    }

    /// <summary>
    /// Kart verilerini işle
    /// </summary>
    private async Task ProcessCardDataAsync(NfcCardData cardData)
    {
        LastReadCard = cardData;
        ReadHistory.Insert(0, cardData); // En yeni üstte

        if (cardData.IsSuccess)
        {
            StatusMessage = $"Kart okundu: {cardData.UidHex}";
            
            // Eğer şifre anahtarı varsa ve raw data varsa otomatik şifre çözmeyi dene
            if (!string.IsNullOrEmpty(DecryptionKey) && cardData.RawData?.Length > 0)
            {
                await TryAutoDecryptAsync(cardData);
            }

            // Backend-öncelikli doğrulama: karttan okunan ham veriyi backend'e gönder ve doğrula
            await TryVerifyWithBackendThenOfflineAsync(cardData);
        }
        else
        {
            StatusMessage = $"Okuma başarısız: {cardData.ErrorMessage}";
        }

        _logger.LogInformation($"Kart işleme tamamlandı: Success={cardData.IsSuccess}, UID={cardData.UidHex}");
    }

    private async Task TryVerifyWithBackendThenOfflineAsync(NfcCardData cardData)
    {
        try
        {
            // Karttaki veriyi metinleştir
            var text = DecryptedContent;
            if (string.IsNullOrWhiteSpace(text) && cardData.RawData?.Length > 0)
            {
                var ndefText = TryDecodeNdefText(cardData.RawData);
                if (!string.IsNullOrWhiteSpace(ndefText))
                    text = ndefText;
                else
                    try { text = Encoding.UTF8.GetString(cardData.RawData); } catch { }
            }

            if (string.IsNullOrWhiteSpace(text))
            {
                _logger.LogDebug("Doğrulanacak veri bulunamadı");
                return;
            }

            // 1) Önce backend ile dene (internet varsa) - ham veriyi backend'e yolla ve çözüm/ doğrulama orada yapılsın
            var hasInternet = Connectivity.Current.NetworkAccess == NetworkAccess.Internet;
            if (hasInternet)
            {
                StatusMessage = "Sunucuda doğrulanıyor...";
                var online = await _qrVerificationService.VerifyOnlineAsync(text);
                if (online.ok && online.result != null)
                {
                    LastVerification = online.result;
                    LastVerificationMode = "Online";
                    StatusMessage = online.result.Valid
                        ? $"Doğrulama başarılı: {online.result.Name} ({online.result.MembershipId})"
                        : $"Geçersiz: {online.result.Error}";
                    await ShowMemberInfoPopupAsync(online.result, "Online");
                    return;
                }
            }

            // 2) Backend başarısızsa: kullanıcıya popup ile bilgi ver, ardından offline doğrula
            await ShowConnectionPopupAsync();

            StatusMessage = "Cihazda doğrulanıyor...";
            var offline = await _qrVerificationService.VerifyOfflineAsync(text);
            if (offline.ok && offline.result != null)
            {
                LastVerification = offline.result;
                LastVerificationMode = "Offline";
                StatusMessage = offline.result.Valid
                    ? $"Doğrulama başarılı (offline): {offline.result.Name} ({offline.result.MembershipId})"
                    : $"Geçersiz (offline): {offline.result.Error}";

                await ShowMemberInfoPopupAsync(offline.result, "Offline");
            }
            else
            {
                StatusMessage = $"Offline doğrulama hatası: {offline.error}";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Backend-öncelikli doğrulama akışında hata");
        }
    }

    private static async Task ShowMemberInfoPopupAsync(QrVerificationResult result, string mode)
    {
        var page = Shell.Current?.CurrentPage;
        if (page == null) return;
        var vm = new Views.MemberInfoPopupViewModel
        {
            Name = result.Name,
            MembershipId = result.MembershipId,
            MemberId = result.MemberId,
            Status = result.Status,
            Valid = result.Valid,
            Mode = mode
        };
        var popup = new Views.MemberInfoPopup(vm);
        await page.ShowPopupAsync(popup);
    }

    private static async Task ShowAlertAsync(string title, string message)
    {
        var page = Shell.Current?.CurrentPage;
        if (page != null)
        {
            await page.DisplayAlert(title, message, "Tamam");
        }
    }

    private static Task ShowConnectionPopupAsync()
    {
        return ShowAlertAsync("Sunucuya bağlanılamadı",
            "Üye bilgileri sunucudan doğrulanamadı. Cihazınızdaki public key ile offline doğrulama yapılacak.");
    }

    /// <summary>
    /// Otomatik şifre çözmeyi dene
    /// </summary>
    private async Task TryAutoDecryptAsync(NfcCardData cardData)
    {
        try
        {
            var decryptedBytes = await _cryptoService.DecryptAsync(cardData.RawData!, DecryptionKey);
            var decryptedText = System.Text.Encoding.UTF8.GetString(decryptedBytes);
            
            cardData.DecryptedData = decryptedText;
            DecryptedContent = decryptedText;
            
            StatusMessage += " (Şifre çözüldü)";
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Otomatik şifre çözme başarısız");
            // Hata durumunda sessizce devam et
        }
    }

    /// <summary>
    /// QR doğrulamayı çalıştır (online/offline seçimine göre)
    /// </summary>
    [RelayCommand]
    private async Task VerifyQrAsync()
    {
        var text = DecryptedContent;
        // Android akışı: Decryption yoksa RawData -> NDEF Text decode dene, olmazsa UTF8
        if (string.IsNullOrWhiteSpace(text) && LastReadCard?.RawData?.Length > 0)
        {
            var raw = LastReadCard.RawData;
            var ndefText = TryDecodeNdefText(raw);
            if (!string.IsNullOrWhiteSpace(ndefText))
            {
                text = ndefText;
            }
            else
            {
                try { text = Encoding.UTF8.GetString(raw); } catch { }
            }
        }

        if (string.IsNullOrWhiteSpace(text))
        {
            StatusMessage = "Doğrulanacak veri yok";
            return;
        }

        await VerifyQrAsync(text);
    }

    private async Task VerifyQrAsync(string qrData)
    {
        try
        {
            var hasInternet = Connectivity.Current.NetworkAccess == NetworkAccess.Internet;
            (bool ok, QrVerificationResult? result, string? error) resp;

            if (IsAndroid)
            {
                // Android: "Üyeyi Sorgula" -> mutlaka backend'e git
                if (!hasInternet)
                {
                    StatusMessage = "İnternet bağlantısı yok";
                    return;
                }
                StatusMessage = "Sunucuda doğrulanıyor...";
                resp = await _qrVerificationService.VerifyOnlineAsync(qrData);
            }
            else
            {
                // Windows: internet varsa online, yoksa offline
                StatusMessage = hasInternet ? "Sunucuda doğrulanıyor..." : "Cihazda doğrulanıyor...";
                resp = hasInternet
                    ? await _qrVerificationService.VerifyOnlineAsync(qrData)
                    : await _qrVerificationService.VerifyOfflineAsync(qrData);
            }

            if (resp.ok && resp.result != null)
            {
                LastVerification = resp.result;
                LastVerificationMode = hasInternet ? "Online" : "Offline";
                if (resp.result!.Valid)
                {
                    StatusMessage = $"Doğrulama başarılı: {resp.result.Name} ({resp.result.MembershipId})";
                }
                else
                {
                    StatusMessage = $"Geçersiz: {resp.result.Error}";
                }
            }
            else
            {
                StatusMessage = $"Doğrulama hatası: {resp.error}";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "QR doğrulama beklenmeyen hata");
            StatusMessage = $"Doğrulama hatası: {ex.Message}";
        }
    }

    /// <summary>
    /// NFC'yi aktifleştir (Android'de foreground dispatch, Windows'ta okuyucuya bağlanma)
    /// </summary>
    [RelayCommand]
    private async Task ActivateNfcAsync()
    {
        try
        {
            if (IsAndroid)
            {
                StatusMessage = "NFC aktifleştiriliyor...";
                var ok = await _nfcService.ConnectToReaderAsync("Android Device NFC");
                if (!ok)
                {
                    StatusMessage = "NFC uyumluluğunda bir sorun var. Lütfen cihaz ayarlarını kontrol edin.";
                    return;
                }
                IsConnected = true;
                StatusMessage = "NFC aktif. Kartı yaklaştırın";
            }
            else if (IsWindows)
            {
                StatusMessage = "Okuyucular aranıyor...";
                var readers = await _nfcService.GetAvailableReadersAsync();
                var first = readers.FirstOrDefault();
                if (string.IsNullOrEmpty(first))
                {
                    StatusMessage = "NFC okuyucu bulunamadı";
                    return;
                }
                var ok = await _nfcService.ConnectToReaderAsync(first);
                if (!ok)
                {
                    StatusMessage = "NFC okuyucuya bağlanılamadı";
                    return;
                }
                SelectedReader = first;
                IsConnected = true;
                StatusMessage = $"'{first}' bağlandı - Kart yerleştirin";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NFC aktivasyon hatası");
            StatusMessage = "NFC uyumluluğunda bir sorun var. Lütfen cihazınızı kontrol edin.";
        }
    }

    // Writer komutları kaldırıldı
    // Windows için basit Writer komutu
    [RelayCommand]
    private async Task WriteSampleTextAsync()
    {
        if (!IsWindows)
        {
            StatusMessage = "Yazma yalnızca Windows sürümünde etkindir";
            return;
        }

        if (!IsConnected)
        {
            StatusMessage = "Önce okuyucuya bağlanın";
            return;
        }

        try
        {
            StatusMessage = "Kart yazılıyor...";
            var (ok, error) = await _nfcService.WriteTextNdefAsync("Hello from MAUI", "en");
            StatusMessage = ok ? "Kart yazıldı" : $"Yazma başarısız: {error}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kart yazma hatası");
            StatusMessage = $"Kart yazma hatası: {ex.Message}";
        }
    }

    // Windows: Üye arama popup'ı aç ve seçileni karta yaz
    [RelayCommand]
    private async Task SelectMemberAndWriteAsync()
    {
        if (!IsWindows)
        {
            StatusMessage = "Bu eylem sadece Windows'ta desteklenir";
            return;
        }
        if (!IsConnected)
        {
            StatusMessage = "Önce okuyucuya bağlanın";
            return;
        }

        try
        {
            var popup = new Views.MemberSearchPopup(_backendApiService, _logger);
            var result = await Shell.Current.CurrentPage.ShowPopupAsync(popup);
            if (result is Models.MemberInfo member && member != null)
            {
                // NTAG215'e yazılacak metni hazırla (örnek: pipe ile basit payload)
                var text = $"{member.MemberId}|{member.MembershipId}|{member.Name}|{member.Status}";
                StatusMessage = "Kart yazılıyor...";
                var (ok, error) = await _nfcService.WriteTextNdefAsync(text, "tr");
                StatusMessage = ok ? "Üye bilgileri karta yazıldı" : $"Yazma başarısız: {error}";
            }
            else
            {
                StatusMessage = "Üye seçilmedi";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Üye yazma akışı hatası");
            StatusMessage = $"Üye yazma hatası: {ex.Message}";
        }
    }

    /// <summary>
    /// Hex string kontrolü
    /// </summary>
    private static bool IsHexString(string str)
    {
        return str.All(c => char.IsDigit(c) || (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f'));
    }

    /// <summary>
    /// NDEF Text (TNF Well-known, Type 'T') payload'ını çözer: [status][lang...][text...]
    /// </summary>
    private static string? TryDecodeNdefText(byte[] payload)
    {
        try
        {
            if (payload == null || payload.Length == 0) return null;
            var status = payload[0];
            var langLen = status & 0x3F; // lower 6 bits
            var textStart = 1 + langLen;
            if (textStart > payload.Length) return null;
            var textBytes = payload[textStart..];
            return Encoding.UTF8.GetString(textBytes);
        }
        catch { return null; }
    }
}
