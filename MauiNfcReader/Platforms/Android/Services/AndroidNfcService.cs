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
        _logger.LogInformation("Android NFC Service init");
        Initialize();
    }

    private void Initialize()
    {
        var activity = Platform.CurrentActivity;
        if (activity == null)
        {
            _logger.LogWarning("CurrentActivity null - NFC adapter alınamadı");
            return;
        }
        _nfcAdapter = NfcAdapter.GetDefaultAdapter(activity);
        if (_nfcAdapter == null)
        {
            _logger.LogWarning("Bu cihaz NFC desteklemiyor");
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
    }

    public Task<IEnumerable<string>> GetAvailableReadersAsync()
    {
        var hasNfc = _nfcAdapter?.IsEnabled ?? false;
        var list = hasNfc ? new[] { "Android Device NFC" } : Array.Empty<string>();
        return Task.FromResult<IEnumerable<string>>(list);
    }

    public Task<bool> ConnectToReaderAsync(string readerName)
    {
        var activity = Platform.CurrentActivity;
        if (_nfcAdapter == null || activity == null)
        {
            _isConnected = false;
            return Task.FromResult(false);
        }

        try
        {
            _nfcAdapter.EnableForegroundDispatch(activity, _pendingIntent, null, _techLists);
            _isConnected = true;
            _connectedReaderName = readerName;
            _logger.LogInformation("Android NFC foreground dispatch etkin");
            return Task.FromResult(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Foreground dispatch etkinleştirme hatası");
            _isConnected = false;
            return Task.FromResult(false);
        }
    }

    public Task DisconnectAsync()
    {
        var activity = Platform.CurrentActivity;
        if (_nfcAdapter != null && activity != null)
        {
            try { _nfcAdapter.DisableForegroundDispatch(activity); } catch { }
        }
        _isConnected = false;
        _connectedReaderName = null;
        _lastTag = null;
        return Task.CompletedTask;
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
        return _readTcs.Task.TimeoutAfter(TimeSpan.FromSeconds(10)).ContinueWith(t =>
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


