using MauiNfcReader.Models;
using Microsoft.Extensions.Logging;

namespace MauiNfcReader.Services;

/// <summary>
/// Test ve geliştirme için Mock NFC servisi
/// PCSC kurulumu yapılmadan test edilebilir
/// </summary>
public class MockNfcService : INfcService
{
    private readonly ILogger<MockNfcService> _logger;
    private bool _isConnected = false;
    private string? _connectedReader;
    private readonly Random _random = new();

    public event EventHandler<CardDetectedEventArgs>? CardDetected;
    public event EventHandler<CardRemovedEventArgs>? CardRemoved;

    public bool IsConnected => _isConnected;
    public string? ConnectedReaderName => _connectedReader;

    public MockNfcService(ILogger<MockNfcService> logger)
    {
        _logger = logger;
        _logger.LogInformation("Mock NFC Service başlatıldı (Test Modu)");
    }

    public async Task<IEnumerable<string>> GetAvailableReadersAsync()
    {
        await Task.Delay(500); // Simulate search delay
        
        var mockReaders = new[]
        {
            "Mock ACR122U USB NFC Reader",
            "Test Virtual NFC Reader",
            "Development NFC Simulator"
        };

        _logger.LogInformation($"Mock okuyucular bulundu: {string.Join(", ", mockReaders)}");
        return mockReaders;
    }

    public async Task<bool> ConnectToReaderAsync(string readerName)
    {
        await Task.Delay(300); // Simulate connection delay
        
        _isConnected = true;
        _connectedReader = readerName;
        
        _logger.LogInformation($"Mock bağlantı başarılı: {readerName}");
        
        // Simulate card detection after connection
        _ = Task.Delay(2000).ContinueWith(_ => SimulateCardDetection());
        
        return true;
    }

    public async Task DisconnectAsync()
    {
        await Task.Delay(100);
        
        _isConnected = false;
        _connectedReader = null;
        
        _logger.LogInformation("Mock bağlantı kesildi");
    }

    public async Task<bool> IsCardPresentAsync()
    {
        await Task.Delay(50);
        return _isConnected && _random.NextDouble() > 0.3; // 70% kart var
    }

    public async Task<NfcCardData?> ReadCardAsync()
    {
        if (!_isConnected)
        {
            return new NfcCardData
            {
                IsSuccess = false,
                ErrorMessage = "Okuyucu bağlı değil",
                ReaderName = "Mock Reader"
            };
        }

        await Task.Delay(800); // Simulate read delay

        // Generate mock UID
        var uid = new byte[4];
        _random.NextBytes(uid);

        // Create mock encrypted data
        var mockData = System.Text.Encoding.UTF8.GetBytes("Test kullanıcı bilgileri: John Doe, 12345");
        
        var cardData = new NfcCardData
        {
            Uid = uid,
            CardType = "MIFARE Classic 1K (Mock)",
            RawData = mockData,
            IsSuccess = true,
            ReaderName = _connectedReader ?? "Mock Reader",
            ReadAt = DateTime.Now
        };

        _logger.LogInformation($"Mock kart okundu: UID={cardData.UidHex}");
        return cardData;
    }

    public Task<(bool ok, string? error)> WriteTextNdefAsync(string text, string language = "en")
    {
        _logger.LogInformation($"Mock NDEF yazımı: '{text}' ({language})");
        return Task.FromResult<(bool ok, string? error)>((true, null));
    }

    private void SimulateCardDetection()
    {
        if (_isConnected)
        {
            CardDetected?.Invoke(this, new CardDetectedEventArgs
            {
                ReaderName = _connectedReader ?? "Mock Reader",
                DetectedAt = DateTime.Now
            });
            
            // Simulate card removal after 5 seconds
            Task.Delay(5000).ContinueWith(_ => SimulateCardRemoval());
        }
    }

    private void SimulateCardRemoval()
    {
        if (_isConnected)
        {
            CardRemoved?.Invoke(this, new CardRemovedEventArgs
            {
                ReaderName = _connectedReader ?? "Mock Reader",
                RemovedAt = DateTime.Now
            });
        }
    }
}
