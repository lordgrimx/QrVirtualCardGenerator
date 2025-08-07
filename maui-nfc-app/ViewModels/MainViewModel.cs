using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MauiNfcApp.Services;
using System.Collections.ObjectModel;

namespace MauiNfcApp.ViewModels;

public partial class MainViewModel : ObservableObject
{
    private readonly INfcService _nfcService;
    private readonly ICryptoService _cryptoService;
    private readonly ILogger<MainViewModel> _logger;

    [ObservableProperty]
    private bool isNfcSupported;

    [ObservableProperty]
    private bool isNfcEnabled;

    [ObservableProperty]
    private bool isReading;

    [ObservableProperty]
    private string statusMessage = "NFC durumu kontrol ediliyor...";

    [ObservableProperty]
    private string? lastReadData;

    [ObservableProperty]
    private MemberData? memberData;

    [ObservableProperty]
    private bool isVerificationSuccess;

    [ObservableProperty]
    private string? errorMessage;

    [ObservableProperty]
    private ObservableCollection<NfcLogEntry> nfcLogs = new();

    public MainViewModel(INfcService nfcService, ICryptoService cryptoService, ILogger<MainViewModel> logger)
    {
        _nfcService = nfcService;
        _cryptoService = cryptoService;
        _logger = logger;

        // NFC event'lerini dinle
        _nfcService.NfcDataReceived += OnNfcDataReceived;
        _nfcService.NfcError += OnNfcError;

        // Başlangıç durumunu kontrol et
        CheckNfcStatus();
    }

    [RelayCommand]
    private async Task StartReadingAsync()
    {
        try
        {
            if (!IsNfcSupported)
            {
                StatusMessage = "❌ NFC bu cihazda desteklenmiyor";
                return;
            }

            if (!IsNfcEnabled)
            {
                StatusMessage = "⚠️ NFC devre dışı. Lütfen ayarlardan etkinleştirin.";
                return;
            }

            IsReading = true;
            StatusMessage = "📱 NFC kartınızı cihaza yaklaştırın...";
            ErrorMessage = null;

            AddLog("NFC okuma başlatıldı", LogType.Info);

            var result = await _nfcService.StartReadingAsync();
            
            if (!result.Success)
            {
                StatusMessage = $"❌ Okuma başlatılamadı: {result.ErrorMessage}";
                IsReading = false;
                AddLog($"Okuma başlatma hatası: {result.ErrorMessage}", LogType.Error);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NFC okuma başlatma hatası");
            StatusMessage = $"❌ Hata: {ex.Message}";
            IsReading = false;
            AddLog($"Beklenmeyen hata: {ex.Message}", LogType.Error);
        }
    }

    [RelayCommand]
    private async Task StopReadingAsync()
    {
        try
        {
            await _nfcService.StopReadingAsync();
            IsReading = false;
            StatusMessage = "⏸️ NFC okuma durduruldu";
            AddLog("NFC okuma durduruldu", LogType.Info);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NFC okuma durdurma hatası");
            AddLog($"Durdurma hatası: {ex.Message}", LogType.Error);
        }
    }

    [RelayCommand]
    private void CheckNfcStatus()
    {
        try
        {
            IsNfcSupported = _nfcService.IsNfcSupported;
            IsNfcEnabled = _nfcService.IsNfcEnabled;

            if (!IsNfcSupported)
            {
                StatusMessage = "❌ NFC bu cihazda desteklenmiyor";
            }
            else if (!IsNfcEnabled)
            {
                StatusMessage = "⚠️ NFC devre dışı";
            }
            else
            {
                StatusMessage = "✅ NFC hazır";
            }

            AddLog($"NFC durum kontrolü: Destekleniyor={IsNfcSupported}, Etkin={IsNfcEnabled}", LogType.Info);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NFC durum kontrolü hatası");
            StatusMessage = $"❌ Durum kontrol hatası: {ex.Message}";
        }
    }

    [RelayCommand]
    private void ClearLogs()
    {
        NfcLogs.Clear();
        AddLog("Loglar temizlendi", LogType.Info);
    }

    [RelayCommand]
    private async Task VerifyLastDataAsync()
    {
        if (string.IsNullOrEmpty(LastReadData))
        {
            StatusMessage = "⚠️ Doğrulanacak veri yok";
            return;
        }

        try
        {
            StatusMessage = "🔍 Veri doğrulanıyor...";
            AddLog("QR kod doğrulaması başlatıldı", LogType.Info);

            var (isValid, memberData, errorMessage) = await _cryptoService.VerifyQrSignatureAsync(LastReadData);

            if (isValid && memberData != null)
            {
                IsVerificationSuccess = true;
                MemberData = memberData;
                StatusMessage = "✅ Veri başarıyla doğrulandı";
                ErrorMessage = null;
                AddLog($"Doğrulama başarılı: {memberData.Name}", LogType.Success);
            }
            else
            {
                IsVerificationSuccess = false;
                MemberData = null;
                StatusMessage = "❌ Veri doğrulama başarısız";
                ErrorMessage = errorMessage;
                AddLog($"Doğrulama başarısız: {errorMessage}", LogType.Error);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Veri doğrulama hatası");
            IsVerificationSuccess = false;
            MemberData = null;
            StatusMessage = $"❌ Doğrulama hatası: {ex.Message}";
            ErrorMessage = ex.Message;
            AddLog($"Doğrulama hatası: {ex.Message}", LogType.Error);
        }
    }

    private async void OnNfcDataReceived(object? sender, NfcDataReceivedEventArgs e)
    {
        try
        {
            await MainThread.InvokeOnMainThreadAsync(() =>
            {
                LastReadData = e.ReadResult.Data;
                StatusMessage = "📄 Veri okundu - Doğrulanıyor...";
                AddLog($"NFC veri okundu: {e.ReadResult.Data?.Length ?? 0} karakter", LogType.Success);
            });

            // Otomatik doğrulama
            if (!string.IsNullOrEmpty(e.ReadResult.Data))
            {
                await VerifyLastDataAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NFC veri işleme hatası");
            await MainThread.InvokeOnMainThreadAsync(() =>
            {
                StatusMessage = $"❌ Veri işleme hatası: {ex.Message}";
                AddLog($"Veri işleme hatası: {ex.Message}", LogType.Error);
            });
        }
    }

    private async void OnNfcError(object? sender, NfcErrorEventArgs e)
    {
        await MainThread.InvokeOnMainThreadAsync(() =>
        {
            StatusMessage = $"❌ NFC Hatası: {e.ErrorMessage}";
            IsReading = false;
            AddLog($"NFC hatası: {e.ErrorMessage}", LogType.Error);
        });
    }

    private void AddLog(string message, LogType type)
    {
        var logEntry = new NfcLogEntry
        {
            Timestamp = DateTime.Now,
            Message = message,
            Type = type
        };

        // UI thread'de çalıştır
        MainThread.BeginInvokeOnMainThread(() =>
        {
            NfcLogs.Insert(0, logEntry);
            
            // En fazla 100 log tutma
            while (NfcLogs.Count > 100)
            {
                NfcLogs.RemoveAt(NfcLogs.Count - 1);
            }
        });
    }

    public void Dispose()
    {
        _nfcService.NfcDataReceived -= OnNfcDataReceived;
        _nfcService.NfcError -= OnNfcError;
    }
}

public class NfcLogEntry
{
    public DateTime Timestamp { get; set; }
    public string Message { get; set; } = string.Empty;
    public LogType Type { get; set; }
    public string FormattedTime => Timestamp.ToString("HH:mm:ss");
    public string TypeIcon => Type switch
    {
        LogType.Info => "ℹ️",
        LogType.Success => "✅",
        LogType.Warning => "⚠️",
        LogType.Error => "❌",
        _ => "📝"
    };
}

public enum LogType
{
    Info,
    Success,
    Warning,
    Error
}
