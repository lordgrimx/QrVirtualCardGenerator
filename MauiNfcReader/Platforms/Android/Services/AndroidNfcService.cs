using Android.App;
using Android.Content;
using Android.Nfc;
using Android.Nfc.Tech;
using MauiNfcReader.Models;
using MauiNfcReader.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Maui.ApplicationModel;
using Android.OS;

namespace MauiNfcReader.Platforms.Android.Services;

public class AndroidNfcService : Java.Lang.Object, INfcService
{
    private readonly ILogger<AndroidNfcService> _logger;
    private NfcAdapter? _nfcAdapter;
    private PendingIntent? _pendingIntent;
    private readonly string[][] _techLists = new[]
    {
        new[] { "android.nfc.tech.Ndef" },
        new[] { "android.nfc.tech.NfcA" },
        new[] { "android.nfc.tech.MifareClassic" }
    };

    private Tag? _lastTag;
    private bool _isConnected;
    private string? _connectedReaderName;
    private TaskCompletionSource<NfcCardData?>? _readTcs;

    public event EventHandler<CardDetectedEventArgs>? CardDetected;
    public event EventHandler<CardRemovedEventArgs>? CardRemoved; // Android'de çıkarılma sinyali doğrudan yok

    public bool IsConnected => _isConnected;
    public string? ConnectedReaderName => _connectedReaderName;

    public AndroidNfcService(ILogger<AndroidNfcService> logger)
    {
        _logger = logger;
        _logger.LogInformation("🔵 Android NFC Service oluşturuldu (lazy init)");
        // Initialize'i lazy olarak yapacağız - ilk kullanımda
    }

    private bool _initialized = false;
    private void EnsureInitialized()
    {
        if (_initialized) return;

        var activity = Platform.CurrentActivity;
        if (activity == null)
        {
            _logger.LogWarning("⚠️ CurrentActivity null - NFC adapter alınamadı");
            return;
        }
        
        _nfcAdapter = NfcAdapter.GetDefaultAdapter(activity);
        if (_nfcAdapter == null)
        {
            _logger.LogWarning("⚠️ Bu cihaz NFC desteklemiyor");
            _initialized = true; // Tekrar denemeyi önle
            return;
        }

        var intent = new Intent(activity, activity.Class);
        intent.AddFlags(ActivityFlags.SingleTop);
        var flags = PendingIntentFlags.UpdateCurrent;
        // Android 12+ (S) için FLAG_MUTABLE zorunlu (NFC foreground dispatch sistemin extra eklemesi için)
        if ((int)Build.VERSION.SdkInt >= 31)
        {
            flags |= PendingIntentFlags.Mutable;
        }
        _pendingIntent = PendingIntent.GetActivity(activity, 0, intent, flags);
        
        _initialized = true;
        _logger.LogInformation("✅ NFC adapter başlatıldı");
    }

    public Task<IEnumerable<string>> GetAvailableReadersAsync()
    {
        EnsureInitialized();
        
        var hasNfc = _nfcAdapter?.IsEnabled ?? false;
        var list = hasNfc ? new[] { "Android Device NFC" } : Array.Empty<string>();
        
        _logger.LogInformation($"📱 NFC Durum - Adapter: {_nfcAdapter != null}, Etkin: {hasNfc}, Okuyucu sayısı: {list.Length}");
        
        return Task.FromResult<IEnumerable<string>>(list);
    }

    public async Task<bool> ConnectToReaderAsync(string readerName)
    {
        var tcs = new TaskCompletionSource<bool>();
        
        // EnableForegroundDispatch UI thread'de çalışmalı
        await MainThread.InvokeOnMainThreadAsync(() =>
        {
            try
            {
                // UI thread'de initialize
                EnsureInitialized();
                
                var activity = Platform.CurrentActivity;
                if (_nfcAdapter == null || activity == null)
                {
                    _logger.LogWarning($"⚠️ NFC adapter veya activity null - Adapter: {_nfcAdapter != null}, Activity: {activity != null}");
                    _isConnected = false;
                    tcs.SetResult(false);
                    return;
                }

                _logger.LogInformation($"🔄 NFC Foreground Dispatch etkinleştiriliyor...");
                _nfcAdapter.EnableForegroundDispatch(activity, _pendingIntent, null, _techLists);
                _isConnected = true;
                _connectedReaderName = readerName;
                _logger.LogInformation($"✅ Android NFC foreground dispatch etkinleştirildi - Okuyucu: {readerName}");
                tcs.SetResult(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Foreground dispatch etkinleştirme hatası");
                _isConnected = false;
                tcs.SetResult(false);
            }
        });

        return await tcs.Task;
    }

    public async Task DisconnectAsync()
    {
        await MainThread.InvokeOnMainThreadAsync(() =>
        {
            var activity = Platform.CurrentActivity;
            if (_nfcAdapter != null && activity != null)
            {
                try 
                { 
                    _nfcAdapter.DisableForegroundDispatch(activity);
                    _logger.LogInformation("✅ Android NFC foreground dispatch devre dışı");
                } 
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "DisableForegroundDispatch hatası (göz ardı edildi)");
                }
            }
            _isConnected = false;
            _connectedReaderName = null;
            _lastTag = null;
        });
    }

    public Task<bool> IsCardPresentAsync()
    {
        // Android’de anlık varlık bilgisi yok; son tag’a göre varsayım
        return Task.FromResult(_lastTag != null);
    }

    public Task<NfcCardData?> ReadCardAsync()
    {
        _readTcs = new TaskCompletionSource<NfcCardData?>();
        // Kullanıcı karta dokundurduğunda OnNewIntent ile sonuç dönecek
        return _readTcs.Task.TimeoutAfter(TimeSpan.FromSeconds(30)).ContinueWith(t =>
        {
            if (t.Status == TaskStatus.RanToCompletion) return t.Result;
            return new NfcCardData { IsSuccess = false, ErrorMessage = "Timeout veya intent alınamadı", ReaderName = _connectedReaderName ?? "Android NFC" };
        });
    }

    public async Task<(bool ok, string? error)> WriteTextNdefAsync(string text, string language = "en")
    {
        if (_lastTag == null)
            return (false, "Yazmak için önce karta dokundurun");

        try
        {
            var ndef = Ndef.Get(_lastTag);
            if (ndef == null)
                return (false, "NDEF desteklenmiyor");

            var langBytes = System.Text.Encoding.UTF8.GetBytes(language);
            var textBytes = System.Text.Encoding.UTF8.GetBytes(text);
            var payload = new byte[1 + langBytes.Length + textBytes.Length];
            payload[0] = (byte)langBytes.Length; // UTF-8, no encoding bit set
            Array.Copy(langBytes, 0, payload, 1, langBytes.Length);
            Array.Copy(textBytes, 0, payload, 1 + langBytes.Length, textBytes.Length);

            // 'T' well-known type for Text NDEF
            var typeT = System.Text.Encoding.ASCII.GetBytes("T");
            var record = new NdefRecord(NdefRecord.TnfWellKnown, typeT, new byte[0], payload);
            var message = new NdefMessage(new[] { record });

            ndef.Connect();
            await Task.Run(() => ndef.WriteNdefMessage(message));
            ndef.Close();
            return (true, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NDEF yazma hatası (Android)");
            return (false, ex.Message);
        }
    }

    // MainActivity'den forward edilecek
    public void OnNewIntent(Intent intent)
    {
        var tag = intent.GetParcelableExtra(NfcAdapter.ExtraTag) as Tag;
        if (tag == null) return;

        _lastTag = tag;

        var uid = tag.GetId();
        var cardData = new NfcCardData
        {
            Uid = uid ?? Array.Empty<byte>(),
            CardType = string.Join(",", tag.GetTechList() ?? Array.Empty<string>()),
            ReaderName = _connectedReaderName ?? "Android NFC",
            IsSuccess = true,
            ReadAt = DateTime.Now
        };

        // NDEF var ise mesajı oku
        try
        {
            var ndef = Ndef.Get(tag);
            if (ndef != null)
            {
                ndef.Connect();
                var msg = ndef.NdefMessage;
                ndef.Close();
                if (msg != null)
                {
                    var recs = msg.GetRecords();
                    if (recs != null && recs.Length > 0)
                    {
                        // İlk kayıt payload'ını aktar
                        cardData.RawData = recs[0]?.GetPayload();
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "NDEF okuma yok/başarısız");
        }

        CardDetected?.Invoke(this, new CardDetectedEventArgs { ReaderName = cardData.ReaderName, DetectedAt = DateTime.Now });
        _readTcs?.TrySetResult(cardData);
    }
}

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


