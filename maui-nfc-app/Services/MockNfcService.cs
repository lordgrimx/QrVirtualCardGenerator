namespace MauiNfcApp.Services;

/// <summary>
/// Mock NFC Service - Test ve geliştirme amaçlı
/// Gerçek NFC donanımı olmayan cihazlarda test yapabilmek için
/// </summary>
public class MockNfcService : INfcService
{
    private readonly ILogger<MockNfcService> _logger;
    private bool _isReading;

    public event EventHandler<NfcDataReceivedEventArgs>? NfcDataReceived;
    public event EventHandler<NfcErrorEventArgs>? NfcError;

    public bool IsNfcSupported => true; // Mock'ta her zaman destekleniyor
    public bool IsNfcEnabled => true;   // Mock'ta her zaman etkin

    public MockNfcService(ILogger<MockNfcService> logger)
    {
        _logger = logger;
    }

    public async Task<NfcReadResult> StartReadingAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Mock NFC okuma başlatıldı");
        
        _isReading = true;
        
        // 3 saniye sonra fake veri gönder
        _ = Task.Run(async () =>
        {
            await Task.Delay(3000, cancellationToken);
            
            if (_isReading && !cancellationToken.IsCancellationRequested)
            {
                await SendMockDataAsync();
            }
        }, cancellationToken);

        return new NfcReadResult
        {
            Success = true,
            ErrorMessage = null
        };
    }

    public async Task StopReadingAsync()
    {
        _logger.LogInformation("Mock NFC okuma durduruldu");
        _isReading = false;
        await Task.CompletedTask;
    }

    public async Task<NfcWriteResult> WriteTagAsync(string data, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation($"Mock NFC yazma: {data.Length} bytes");
        
        await Task.Delay(1000, cancellationToken); // Yazma simülasyonu
        
        return new NfcWriteResult
        {
            Success = true,
            BytesWritten = data.Length
        };
    }

    private async Task SendMockDataAsync()
    {
        try
        {
            // Python backend'ten gelen gerçek QR veri formatını simüle et
            var mockQrData = await GenerateMockQrDataAsync();
            
            var result = new NfcReadResult
            {
                Success = true,
                Data = mockQrData,
                TagId = "MOCK_TAG_001",
                TagType = "MOCK_NTAG213"
            };

            _logger.LogInformation("Mock NFC verisi gönderiliyor");
            NfcDataReceived?.Invoke(this, new NfcDataReceivedEventArgs(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Mock veri gönderme hatası");
            NfcError?.Invoke(this, new NfcErrorEventArgs("Mock veri hatası", ex));
        }
    }

    private async Task<string> GenerateMockQrDataAsync()
    {
        // Mock veri - Python backend formatına uygun
        var mockMemberData = new
        {
            member_id = 1,
            membership_id = "CC-2024-000001",
            name = "Test Kullanıcısı",
            status = "active",
            org = "Community Connect",
            issued_at = DateTime.UtcNow.ToString("o"),
            expires_at = DateTime.UtcNow.AddYears(1).ToString("o"),
            nonce = "mock_nonce_123"
        };

        var payloadJson = System.Text.Json.JsonSerializer.Serialize(mockMemberData);
        var payloadBytes = System.Text.Encoding.UTF8.GetBytes(payloadJson);
        var payloadB64 = Convert.ToBase64String(payloadBytes);

        // Mock signature (gerçek değil, test amaçlı)
        var mockSignature = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("MOCK_SIGNATURE_FOR_TESTING"));

        // Mock metadata
        var mockMetadata = new
        {
            version = "1.0",
            algorithm = "RSA-PSS-SHA256",
            key_id = "mock_key_id_123"
        };
        var metadataJson = System.Text.Json.JsonSerializer.Serialize(mockMetadata);
        var metadataB64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(metadataJson));

        // ISO 20248 benzeri format
        return $"{payloadB64}|{mockSignature}|{metadataB64}";
    }

    public void Dispose()
    {
        _isReading = false;
    }
}
