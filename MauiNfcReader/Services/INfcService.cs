using MauiNfcReader.Models;

namespace MauiNfcReader.Services;

/// <summary>
/// NFC okuyucu servisi için ana interface
/// Platform-specific implementasyonlar bu interface'i implement eder
/// </summary>
public interface INfcService
{
    /// <summary>
    /// NFC okuyucu cihazlarını tespit eder
    /// </summary>
    Task<IEnumerable<string>> GetAvailableReadersAsync();
    
    /// <summary>
    /// Belirtilen okuyucuya bağlanır
    /// </summary>
    Task<bool> ConnectToReaderAsync(string readerName);
    
    /// <summary>
    /// Bağlantıyı keser
    /// </summary>
    Task DisconnectAsync();
    
    /// <summary>
    /// Kart algılama durumunu kontrol eder
    /// </summary>
    Task<bool> IsCardPresentAsync();
    
    /// <summary>
    /// NFC kartından veri okur
    /// </summary>
    Task<NfcCardData?> ReadCardAsync();
    
    /// <summary>
    /// (Windows'ta etkin) NFC karta kısa bir NDEF Text kaydı yazar
    /// Android implementasyonu da mevcuttur
    /// </summary>
    Task<(bool ok, string? error)> WriteTextNdefAsync(string text, string language = "en");
    
    /// <summary>
    /// Kart algılama olayları
    /// </summary>
    event EventHandler<CardDetectedEventArgs>? CardDetected;
    event EventHandler<CardRemovedEventArgs>? CardRemoved;
    
    /// <summary>
    /// Servis durumu
    /// </summary>
    bool IsConnected { get; }
    string? ConnectedReaderName { get; }
}

/// <summary>
/// Kart algılama olay argümanları
/// </summary>
public class CardDetectedEventArgs : EventArgs
{
    public string ReaderName { get; set; } = string.Empty;
    public DateTime DetectedAt { get; set; } = DateTime.Now;
}

/// <summary>
/// Kart çıkarılma olay argümanları
/// </summary>
public class CardRemovedEventArgs : EventArgs
{
    public string ReaderName { get; set; } = string.Empty;
    public DateTime RemovedAt { get; set; } = DateTime.Now;
}
