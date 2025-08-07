namespace MauiNfcApp.Platforms.Windows.Services;

/// <summary>
/// Windows-specific USB NFC reader interface
/// ACR122U ve benzer PCSC uyumlu USB NFC okuyucular için
/// </summary>
public interface IWindowsNfcService
{
    /// <summary>
    /// USB NFC okuyucu mevcut mu kontrol et
    /// </summary>
    Task<bool> IsUsbNfcReaderAvailableAsync();
    
    /// <summary>
    /// Mevcut USB NFC okuyucuları listele
    /// </summary>
    Task<List<NfcReaderInfo>> GetAvailableReadersAsync();
    
    /// <summary>
    /// USB NFC okuyucu ile kart okuma
    /// </summary>
    Task<WindowsNfcReadResult> ReadCardAsync(string? readerName = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// USB NFC okuyucu ile kart yazma
    /// </summary>
    Task<WindowsNfcWriteResult> WriteCardAsync(string data, string? readerName = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// PCSC servisi durumunu kontrol et
    /// </summary>
    Task<PcscServiceStatus> GetPcscServiceStatusAsync();
}

public class NfcReaderInfo
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public bool IsConnected { get; set; }
    public string Status { get; set; } = string.Empty;
    public string[] SupportedProtocols { get; set; } = Array.Empty<string>();
}

public class WindowsNfcReadResult
{
    public bool Success { get; set; }
    public string? Data { get; set; }
    public string? CardId { get; set; }
    public string? CardType { get; set; }
    public string? ReaderName { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime ReadTime { get; set; } = DateTime.Now;
    public byte[]? RawData { get; set; }
}

public class WindowsNfcWriteResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public int BytesWritten { get; set; }
    public string? ReaderName { get; set; }
    public DateTime WriteTime { get; set; } = DateTime.Now;
}

public class PcscServiceStatus
{
    public bool IsRunning { get; set; }
    public string Status { get; set; } = string.Empty;
    public string[] AvailableReaders { get; set; } = Array.Empty<string>();
    public string ErrorMessage { get; set; } = string.Empty;
}
