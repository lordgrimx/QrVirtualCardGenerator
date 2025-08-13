using Foundation;
using CoreNFC;
using MauiNfcReader.Models;
using MauiNfcReader.Services;
using Microsoft.Extensions.Logging;
using UIKit;

namespace MauiNfcReader.Platforms.iOS.Services;

public class IOSNfcService : NSObject, INfcService, INFCNdefReaderSessionDelegate
{
    private readonly ILogger<IOSNfcService> _logger;
    private NFCNdefReaderSession? _ndefSession;
    private TaskCompletionSource<NfcCardData?>? _readTcs;
    private bool _isConnected;
    private string? _connectedReaderName;

    public event EventHandler<CardDetectedEventArgs>? CardDetected;
    public event EventHandler<CardRemovedEventArgs>? CardRemoved;

    public bool IsConnected => _isConnected;
    public string? ConnectedReaderName => _connectedReaderName;

    public IOSNfcService(ILogger<IOSNfcService> logger)
    {
        _logger = logger;
        _logger.LogInformation("iOS NFC Service init");
    }

    public Task<IEnumerable<string>> GetAvailableReadersAsync()
    {
        // iOS'ta NFC varlığını kontrol et
        var hasNfc = NFCNdefReaderSession.ReadingAvailable;
        var readers = hasNfc ? new[] { "iOS Device NFC" } : Array.Empty<string>();
        return Task.FromResult<IEnumerable<string>>(readers);
    }

    public Task<bool> ConnectToReaderAsync(string readerName)
    {
        if (!NFCNdefReaderSession.ReadingAvailable)
        {
            _logger.LogWarning("NFC bu cihazda mevcut değil");
            return Task.FromResult(false);
        }

        _isConnected = true;
        _connectedReaderName = readerName;
        _logger.LogInformation("iOS NFC servisi hazır");
        return Task.FromResult(true);
    }

    public Task DisconnectAsync()
    {
        _ndefSession?.InvalidateSession();
        _ndefSession = null;
        _isConnected = false;
        _connectedReaderName = null;
        return Task.CompletedTask;
    }

    public Task<bool> IsCardPresentAsync()
    {
        // iOS'ta session bazlı çalışır, sürekli kart varlığı bilgisi yoktur
        return Task.FromResult(false);
    }

    public Task<NfcCardData?> ReadCardAsync()
    {
        if (!_isConnected || !NFCNdefReaderSession.ReadingAvailable)
        {
            return Task.FromResult<NfcCardData?>(new NfcCardData 
            { 
                IsSuccess = false, 
                ErrorMessage = "NFC bağlantısı yok veya desteklenmiyor",
                ReaderName = _connectedReaderName ?? "iOS NFC"
            });
        }

        _readTcs = new TaskCompletionSource<NfcCardData?>();

        // iOS'ta main thread üzerinde session oluşturulmalı
        MainThread.BeginInvokeOnMainThread(() =>
        {
            try
            {
                _ndefSession = new NFCNdefReaderSession(this, null, false)
                {
                    AlertMessage = "Cihazınızı NFC etiketine yaklaştırın"
                };
                _ndefSession.BeginSession();
                _logger.LogInformation("iOS NFC okuma session'ı başlatıldı");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "NFC session başlatma hatası");
                _readTcs?.TrySetResult(new NfcCardData 
                { 
                    IsSuccess = false, 
                    ErrorMessage = ex.Message,
                    ReaderName = _connectedReaderName ?? "iOS NFC"
                });
            }
        });

        return _readTcs.Task.TimeoutAfter(TimeSpan.FromSeconds(30)).ContinueWith(t =>
        {
            if (t.Status == TaskStatus.RanToCompletion && t.Result != null) 
                return t.Result;
            
            return (NfcCardData?)new NfcCardData 
            { 
                IsSuccess = false, 
                ErrorMessage = "Timeout veya okuma iptal edildi", 
                ReaderName = _connectedReaderName ?? "iOS NFC" 
            };
        });
    }

    public async Task<(bool ok, string? error)> WriteTextNdefAsync(string text, string language = "en")
    {
        if (!_isConnected || !NFCNdefReaderSession.ReadingAvailable)
        {
            return (false, "NFC bağlantısı yok veya desteklenmiyor");
        }

        var tcs = new TaskCompletionSource<(bool, string?)>();

        MainThread.BeginInvokeOnMainThread(() =>
        {
            try
            {
                // iOS'ta yazma işlemi için NFCTagReaderSession kullanılması gerekebilir
                // NDEF yazma işlemi daha karmaşıktır, şimdilik basit bir hata döndürelim
                tcs.SetResult((false, "iOS'ta NDEF yazma henüz desteklenmiyor"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "iOS NDEF yazma hatası");
                tcs.SetResult((false, ex.Message));
            }
        });

        return await tcs.Task;
    }

    #region INFCNdefReaderSessionDelegate Implementation

    [Export("readerSession:didDetectNDEFs:")]
    public void DidDetectNdefs(NFCNdefReaderSession session, NFCNdefMessage[] messages)
    {
        _logger.LogInformation($"NDEF mesajları algılandı: {messages.Length} adet");

        try
        {
            var cardData = new NfcCardData
            {
                CardType = "NDEF",
                ReaderName = _connectedReaderName ?? "iOS NFC",
                IsSuccess = true,
                ReadAt = DateTime.Now
            };

            // İlk mesajın ilk kaydını al
            if (messages.Length > 0 && messages[0].Records.Length > 0)
            {
                var firstRecord = messages[0].Records[0];
                cardData.RawData = firstRecord.Payload.ToArray();
                
                // UID bilgisi iOS'ta session sırasında doğrudan alınamıyor
                cardData.Uid = Array.Empty<byte>();
            }

            CardDetected?.Invoke(this, new CardDetectedEventArgs 
            { 
                ReaderName = cardData.ReaderName, 
                DetectedAt = DateTime.Now 
            });

            _readTcs?.TrySetResult(cardData);

            // Session'ı başarıyla sonlandır
            session.AlertMessage = "NFC etiketi başarıyla okundu!";
            session.InvalidateSession();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NDEF verisi işleme hatası");
            session.AlertMessage = "Okuma hatası oluştu";
            session.InvalidateSession();
            
            _readTcs?.TrySetResult(new NfcCardData 
            { 
                IsSuccess = false, 
                ErrorMessage = ex.Message,
                ReaderName = _connectedReaderName ?? "iOS NFC"
            });
        }
    }

    [Export("readerSession:didInvalidateWithError:")]
    public void DidInvalidate(NFCNdefReaderSession session, NSError error)
    {
        _logger.LogInformation($"NFC session sonlandı: {error?.LocalizedDescription ?? "Kullanıcı iptal etti"}");

        // Session iptal edildiğinde veya hata oluştuğunda
        if (error != null && error.Code != 200) // NFCReaderError.ReaderSessionInvalidationErrorUserCanceled
        {
            _readTcs?.TrySetResult(new NfcCardData 
            { 
                IsSuccess = false, 
                ErrorMessage = error.LocalizedDescription,
                ReaderName = _connectedReaderName ?? "iOS NFC"
            });
        }
        else
        {
            // Kullanıcı iptal etti
            _readTcs?.TrySetResult(new NfcCardData 
            { 
                IsSuccess = false, 
                ErrorMessage = "Kullanıcı tarafından iptal edildi",
                ReaderName = _connectedReaderName ?? "iOS NFC"
            });
        }

        _ndefSession = null;
    }

    #endregion
}

// Task timeout extension (Android'dekinin aynısı)
internal static class TaskExtensions
{
    public static async Task<T> TimeoutAfter<T>(this Task<T> task, TimeSpan timeout)
    {
        using var cts = new CancellationTokenSource();
        var delayTask = Task.Delay(timeout, cts.Token);
        var completed = await Task.WhenAny(task, delayTask).ConfigureAwait(false);
        if (completed == task)
        {
            cts.Cancel();
            return await task.ConfigureAwait(false);
        }
        return default!;
    }
}
