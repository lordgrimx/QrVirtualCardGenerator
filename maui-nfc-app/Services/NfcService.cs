using Plugin.NFC;
using Plugin.NFC.Abstractions;
using System.Text;

namespace MauiNfcApp.Services;

public class NfcService : INfcService, IDisposable
{
    private readonly ILogger<NfcService> _logger;
    private bool _isListening;
    private CancellationTokenSource? _cancellationTokenSource;

    public event EventHandler<NfcDataReceivedEventArgs>? NfcDataReceived;
    public event EventHandler<NfcErrorEventArgs>? NfcError;

    public bool IsNfcSupported => CrossNFC.IsSupported;
    public bool IsNfcEnabled => CrossNFC.Current?.IsAvailable ?? false;

    public NfcService(ILogger<NfcService> logger)
    {
        _logger = logger;
        InitializeNfc();
    }

    private void InitializeNfc()
    {
        try
        {
            if (!IsNfcSupported)
            {
                _logger.LogWarning("NFC bu cihazda desteklenmiyor");
                return;
            }

            // NFC event'lerini dinle
            CrossNFC.Current.OnMessageReceived += OnMessageReceived;
            CrossNFC.Current.OnTagDetected += OnTagDetected;
            CrossNFC.Current.OnNfcStatusChanged += OnNfcStatusChanged;

            _logger.LogInformation("NFC service başlatıldı");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NFC service başlatma hatası");
            OnNfcError("NFC service başlatma hatası", ex);
        }
    }

    public async Task<NfcReadResult> StartReadingAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (!IsNfcSupported)
            {
                return new NfcReadResult
                {
                    Success = false,
                    ErrorMessage = "NFC bu cihazda desteklenmiyor"
                };
            }

            if (!IsNfcEnabled)
            {
                return new NfcReadResult
                {
                    Success = false,
                    ErrorMessage = "NFC devre dışı. Lütfen ayarlardan NFC'yi etkinleştirin."
                };
            }

            if (_isListening)
            {
                await StopReadingAsync();
            }

            _cancellationTokenSource = new CancellationTokenSource();
            var combinedToken = CancellationTokenSource.CreateLinkedTokenSource(
                cancellationToken, _cancellationTokenSource.Token).Token;

            _isListening = true;
            _logger.LogInformation("NFC okuma başlatıldı");

            // Platform'a göre okuma konfigürasyonu
            var config = new NfcConfiguration
            {
                Messages = new[] { "NFC kartınızı cihaza yaklaştırın" },
                InvalidateAfterFirstRead = false,
                ReadOnlyMessages = true
            };

            await CrossNFC.Current.StartListeningAsync(combinedToken);

            return new NfcReadResult
            {
                Success = true,
                ErrorMessage = null
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NFC okuma başlatma hatası");
            _isListening = false;
            
            return new NfcReadResult
            {
                Success = false,
                ErrorMessage = $"NFC okuma başlatma hatası: {ex.Message}"
            };
        }
    }

    public async Task StopReadingAsync()
    {
        try
        {
            if (_isListening && CrossNFC.Current != null)
            {
                await CrossNFC.Current.StopListeningAsync();
                _isListening = false;
                
                _cancellationTokenSource?.Cancel();
                _cancellationTokenSource?.Dispose();
                _cancellationTokenSource = null;

                _logger.LogInformation("NFC okuma durduruldu");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NFC okuma durdurma hatası");
        }
    }

    public async Task<NfcWriteResult> WriteTagAsync(string data, CancellationToken cancellationToken = default)
    {
        try
        {
            if (!IsNfcSupported)
            {
                return new NfcWriteResult
                {
                    Success = false,
                    ErrorMessage = "NFC bu cihazda desteklenmiyor"
                };
            }

            if (!IsNfcEnabled)
            {
                return new NfcWriteResult
                {
                    Success = false,
                    ErrorMessage = "NFC devre dışı"
                };
            }

            var ndefMessage = new NFCNdefMessage(new[]
            {
                new NFCNdefRecord(
                    NFCNdefTypeFormat.WellKnown,
                    Encoding.UTF8.GetBytes("T"),
                    new byte[0],
                    Encoding.UTF8.GetBytes(data))
            });

            await CrossNFC.Current.PublishMessage(ndefMessage, cancellationToken);

            _logger.LogInformation($"NFC tag yazıldı: {data.Length} bytes");

            return new NfcWriteResult
            {
                Success = true,
                BytesWritten = data.Length
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NFC yazma hatası");
            
            return new NfcWriteResult
            {
                Success = false,
                ErrorMessage = $"NFC yazma hatası: {ex.Message}"
            };
        }
    }

    private void OnMessageReceived(ITagInfo tagInfo)
    {
        try
        {
            if (tagInfo.Records?.Any() == true)
            {
                var record = tagInfo.Records.First();
                var data = Encoding.UTF8.GetString(record.Message);

                var result = new NfcReadResult
                {
                    Success = true,
                    Data = data,
                    TagId = tagInfo.Identifier,
                    TagType = tagInfo.Type.ToString()
                };

                _logger.LogInformation($"NFC mesajı alındı: {data}");
                NfcDataReceived?.Invoke(this, new NfcDataReceivedEventArgs(result));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NFC mesajı işleme hatası");
            OnNfcError("NFC mesajı işleme hatası", ex);
        }
    }

    private void OnTagDetected(ITagInfo tagInfo, bool format)
    {
        try
        {
            _logger.LogInformation($"NFC tag algılandı: {tagInfo.Identifier}");

            if (!format && (tagInfo.Records?.Any() != true))
            {
                // Boş tag - raw data okumaya çalış
                var result = new NfcReadResult
                {
                    Success = true,
                    Data = tagInfo.Identifier,
                    TagId = tagInfo.Identifier,
                    TagType = tagInfo.Type.ToString()
                };

                NfcDataReceived?.Invoke(this, new NfcDataReceivedEventArgs(result));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NFC tag işleme hatası");
            OnNfcError("NFC tag işleme hatası", ex);
        }
    }

    private void OnNfcStatusChanged(bool isEnabled)
    {
        _logger.LogInformation($"NFC durumu değişti: {(isEnabled ? "Etkin" : "Devre dışı")}");
        
        if (!isEnabled && _isListening)
        {
            _ = Task.Run(async () => await StopReadingAsync());
        }
    }

    private void OnNfcError(string message, Exception? exception = null)
    {
        NfcError?.Invoke(this, new NfcErrorEventArgs(message, exception));
    }

    public void Dispose()
    {
        try
        {
            if (_isListening)
            {
                _ = Task.Run(async () => await StopReadingAsync());
            }

            if (CrossNFC.Current != null)
            {
                CrossNFC.Current.OnMessageReceived -= OnMessageReceived;
                CrossNFC.Current.OnTagDetected -= OnTagDetected;
                CrossNFC.Current.OnNfcStatusChanged -= OnNfcStatusChanged;
            }

            _cancellationTokenSource?.Dispose();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NFC service dispose hatası");
        }
    }
}
