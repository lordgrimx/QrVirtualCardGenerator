namespace MauiNfcApp.Services;

public interface INfcService
{
    /// <summary>
    /// NFC desteği kontrol et
    /// </summary>
    bool IsNfcSupported { get; }
    
    /// <summary>
    /// NFC etkin mi kontrol et
    /// </summary>
    bool IsNfcEnabled { get; }
    
    /// <summary>
    /// NFC okuma başlat
    /// </summary>
    Task<NfcReadResult> StartReadingAsync(CancellationToken cancellationToken = default);
    
    /// <summary>
    /// NFC okumayı durdur
    /// </summary>
    Task StopReadingAsync();
    
    /// <summary>
    /// NFC tag yazma
    /// </summary>
    Task<NfcWriteResult> WriteTagAsync(string data, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// NFC okuma eventi
    /// </summary>
    event EventHandler<NfcDataReceivedEventArgs>? NfcDataReceived;
    
    /// <summary>
    /// NFC hata eventi
    /// </summary>
    event EventHandler<NfcErrorEventArgs>? NfcError;
}

public class NfcReadResult
{
    public bool Success { get; set; }
    public string? Data { get; set; }
    public string? TagId { get; set; }
    public string? TagType { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime ReadTime { get; set; } = DateTime.Now;
}

public class NfcWriteResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public int BytesWritten { get; set; }
    public DateTime WriteTime { get; set; } = DateTime.Now;
}

public class NfcDataReceivedEventArgs : EventArgs
{
    public NfcReadResult ReadResult { get; }
    
    public NfcDataReceivedEventArgs(NfcReadResult readResult)
    {
        ReadResult = readResult;
    }
}

public class NfcErrorEventArgs : EventArgs
{
    public string ErrorMessage { get; }
    public Exception? Exception { get; }
    
    public NfcErrorEventArgs(string errorMessage, Exception? exception = null)
    {
        ErrorMessage = errorMessage;
        Exception = exception;
    }
}
