using MauiNfcReader.Models;
using MauiNfcReader.Services;
using Microsoft.Extensions.Logging;
using PCSC;
using PCSC.Monitoring;
using PCSC.Iso7816;
using System.Text;
using System.Threading;
using PCSC.Utils;

namespace MauiNfcReader.Platforms.Windows.Services;

/// <summary>
/// Windows platformu için PCSC tabanlı NFC okuma servisi
/// ACR122U ve benzeri USB NFC okuyucular için optimize edilmiştir
/// </summary>
public class WindowsNfcService : INfcService, IDisposable
{
    private readonly ILogger<WindowsNfcService> _logger;
    private ISCardContext? _context;
    private ICardReader? _reader;
    private SCardMonitor? _monitor;
    private string? _connectedReaderName;
    private readonly Timer _cardCheckTimer;
    private bool _disposed = false;

    // Events
    public event EventHandler<CardDetectedEventArgs>? CardDetected;
    public event EventHandler<CardRemovedEventArgs>? CardRemoved;

    // Properties
    public bool IsConnected => _connectedReaderName != null;
    public string? ConnectedReaderName => _connectedReaderName;

    public WindowsNfcService(ILogger<WindowsNfcService> logger)
    {
        _logger = logger;
        
        // Kart varlığını kontrol etmek için timer
        _cardCheckTimer = new Timer(CheckCardPresence, null, TimeSpan.Zero, TimeSpan.FromSeconds(1));
        
        _logger.LogInformation("Windows NFC Service başlatıldı");
    }

    /// <summary>
    /// Mevcut NFC okuyucuları listeler
    /// </summary>
    public async Task<IEnumerable<string>> GetAvailableReadersAsync()
    {
        try
        {
            await Task.Run(() =>
            {
                _context = ContextFactory.Instance.Establish(SCardScope.System);
            });

            var readers = _context.GetReaders();
            
            _logger.LogInformation($"Bulunan okuyucular: {string.Join(", ", readers)}");
            
            return readers;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Okuyucu listesi alınırken hata");
            return Enumerable.Empty<string>();
        }
    }

    /// <summary>
    /// Belirtilen okuyucuya bağlanır
    /// </summary>
    public async Task<bool> ConnectToReaderAsync(string readerName)
    {
        try
        {
            if (_context == null)
            {
                _context = ContextFactory.Instance.Establish(SCardScope.System);
            }

            // Bağlı okuyucu adını sakla (PC/SC bağlantısı her işlem öncesi yapılacak)
            _connectedReaderName = readerName;

            // Kart durumu monitoring başlat
            SetupCardMonitoring();

            _logger.LogInformation($"'{readerName}' okuyucusuna başarıyla bağlanıldı");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"'{readerName}' okuyucusuna bağlanırken hata");
            return false;
        }
    }

    /// <summary>
    /// Okuyucu bağlantısını keser
    /// </summary>
    public async Task DisconnectAsync()
    {
        try
        {
            if (_monitor != null)
            {
                _monitor.Cancel();
                _monitor.Dispose();
                _monitor = null;
            }

            // Reader bağlantısını işlem bazında kuruyoruz; burada ekstra iş yok

            _connectedReaderName = null;
            _logger.LogInformation("NFC okuyucu bağlantısı kesildi");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Bağlantı kesme hatası");
        }
    }

    /// <summary>
    /// Kart varlığını kontrol eder
    /// </summary>
    public async Task<bool> IsCardPresentAsync()
    {
        if (_reader == null) return false;

        try
        {
            // Basit kontrol: UID komutu gönder, başarılı ise kart mevcut
            var present = await Task.Run(() =>
            {
                try
                {
                    using var iso = new IsoReader(_context!, _connectedReaderName!, SCardShareMode.Shared, SCardProtocol.Any, false);
                    var apdu = new CommandApdu(IsoCase.Case2Short, iso.ActiveProtocol)
                    { CLA = 0xFF, INS = 0xCA, P1 = 0x00, P2 = 0x00, Le = 0x00 };
                    var resp = iso.Transmit(apdu);
                    return resp.SW1 == 0x90 && resp.SW2 == 0x00;
                }
                catch
                {
                    return false;
                }
            });
            return present;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kart varlık kontrol hatası");
            return false;
        }
    }

    /// <summary>
    /// NFC kartından veri okur
    /// </summary>
    public async Task<NfcCardData?> ReadCardAsync()
    {
        if (_reader == null || _connectedReaderName == null)
        {
            _logger.LogWarning("Okuyucu bağlı değil");
            return new NfcCardData
            {
                IsSuccess = false,
                ErrorMessage = "Okuyucu bağlı değil",
                ReaderName = _connectedReaderName ?? "Bilinmiyor"
            };
        }

        try
        {
            _logger.LogInformation("Kart okuma başlatılıyor...");

            // Kartın varlığını kontrol et
            if (!await IsCardPresentAsync())
            {
                return new NfcCardData
                {
                    IsSuccess = false,
                    ErrorMessage = "Kart algılanmadı",
                    ReaderName = _connectedReaderName
                };
            }

            // Kart bilgilerini oku
            var cardData = await Task.Run(() => ReadCardInformation());
            
            _logger.LogInformation($"Kart başarıyla okundu: UID={cardData.UidHex}");
            
            return cardData;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kart okuma hatası");
            return new NfcCardData
            {
                IsSuccess = false,
                ErrorMessage = ex.Message,
                ReaderName = _connectedReaderName
            };
        }
    }

    /// <summary>
    /// Basit NDEF Text yazma - PC/SC ile ACR122U için APDU akışı gerektirir
    /// Not: Kart türüne göre (Ultralight/NTAG/Mifare Classic) blok/ sayfa yazımı değişir.
    /// Burada ACR122U native komutları (FF D6 vb.) ile basit NDEF yazımı denenir.
    /// </summary>
    /// <summary>
    /// NTAG215 (Type 2 Tag) için NDEF Text yazımı.
    /// ACR122U ile sayfa başına 4 byte yazılır (FF D6 ...). Başlangıç sayfası 0x04.
    /// </summary>
    public async Task<(bool ok, string? error)> WriteTextNdefAsync(string text, string language = "en")
    {
        if (_connectedReaderName == null || _context == null)
            return (false, "Okuyucu bağlı değil");

        try
        {
            return await Task.Run<(bool ok, string? error)>(() =>
            {
                using var iso = new IsoReader(_context, _connectedReaderName, SCardShareMode.Shared, SCardProtocol.Any, false);

                // 1) CC (Capability Container) sayfasını kontrol et (page 0x03)
                var cc = ReadPage(iso, 0x03);
                if (cc == null)
                    return (false, "CC okunamadı");

                // NTAG215 için CC: E1 10 3F 00 (3F => 63 * 8 = 504 byte user memory)
                if (!(cc.Length == 4 && cc[0] == 0xE1 && cc[1] == 0x10))
                {
                    var desiredCc = new byte[] { 0xE1, 0x10, 0x3F, 0x00 };
                    if (!WritePage(iso, 0x03, desiredCc))
                        return (false, "CC yazılamadı");
                }

                // 2) NDEF Text message -> TLV oluştur
                var tlv = BuildNdefTextTlv(text, language);

                // 3) TLV'yi page 0x04'ten itibaren yaz (4 byte sayfa)
                var startPage = 0x04;
                var totalPages = (int)Math.Ceiling(tlv.Length / 4.0);
                for (var i = 0; i < totalPages; i++)
                {
                    var page = startPage + i;
                    var chunk = new byte[4];
                    var offset = i * 4;
                    var take = Math.Min(4, tlv.Length - offset);
                    Array.Copy(tlv, offset, chunk, 0, take);
                    if (!WritePage(iso, (byte)page, chunk))
                        return (false, $"Sayfa 0x{page:X2} yazılamadı");
                }

                return (true, null);
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NDEF yazma hatası (Windows)");
            return (false, ex.Message);
        }
    }

    private static byte[] BuildNdefTextTlv(string text, string language)
    {
        var langBytes = Encoding.UTF8.GetBytes(language);
        var textBytes = Encoding.UTF8.GetBytes(text);
        var payload = new byte[1 + langBytes.Length + textBytes.Length];
        payload[0] = (byte)langBytes.Length; // UTF-8 (MSB=0)
        Array.Copy(langBytes, 0, payload, 1, langBytes.Length);
        Array.Copy(textBytes, 0, payload, 1 + langBytes.Length, textBytes.Length);

        // NDEF short record header: D1 01 <plen> 54 (type 'T')
        if (payload.Length > 0xFF)
            throw new InvalidOperationException("Text payload çok büyük (short record dışı)");
        var ndef = new List<byte>(5 + payload.Length)
        {
            0xD1, // MB=1, ME=1, SR=1, TNF=0x01 (Well-known)
            0x01, // Type Length
            (byte)payload.Length, // Payload Length (SR)
            0x54  // 'T'
        };
        ndef.AddRange(payload);

        // TLV: 0x03, length, ndef..., 0xFE terminator
        if (ndef.Count < 0xFF)
        {
            return BuildTlvShort(0x03, (byte)ndef.Count, ndef.ToArray());
        }
        else
        {
            return BuildTlvLong(0x03, (ushort)ndef.Count, ndef.ToArray());
        }
    }

    private static byte[] BuildTlvShort(byte type, byte length, byte[] value)
    {
        var total = 2 + value.Length + 1; // type + len + value + terminator
        var bytes = new byte[total];
        bytes[0] = type;
        bytes[1] = length;
        Array.Copy(value, 0, bytes, 2, value.Length);
        bytes[^1] = 0xFE; // terminator TLV
        return bytes;
    }

    private static byte[] BuildTlvLong(byte type, ushort length, byte[] value)
    {
        var total = 4 + value.Length + 1; // type + 0xFF + len(2) + value + terminator
        var bytes = new byte[total];
        bytes[0] = type;
        bytes[1] = 0xFF;
        bytes[2] = (byte)((length >> 8) & 0xFF);
        bytes[3] = (byte)(length & 0xFF);
        Array.Copy(value, 0, bytes, 4, value.Length);
        bytes[^1] = 0xFE;
        return bytes;
    }

    private static byte[]? ReadPage(IsoReader iso, byte page)
    {
        var apdu = new CommandApdu(IsoCase.Case2Short, iso.ActiveProtocol)
        { CLA = 0xFF, INS = 0xB0, P1 = 0x00, P2 = page, Le = 0x04 };
        var resp = iso.Transmit(apdu);
        if (resp.SW1 == 0x90 && resp.SW2 == 0x00 && resp.HasData)
            return resp.GetData().ToArray();
        return null;
    }

    private static bool WritePage(IsoReader iso, byte page, byte[] data4)
    {
        if (data4.Length != 4)
            throw new ArgumentException("Sayfa yazımı için 4 byte gerekir");
        var apdu = new CommandApdu(IsoCase.Case3Short, iso.ActiveProtocol)
        { CLA = 0xFF, INS = 0xD6, P1 = 0x00, P2 = page, Data = data4 };
        var resp = iso.Transmit(apdu);
        return resp.SW1 == 0x90 && resp.SW2 == 0x00;
    }

    /// <summary>
    /// Kart bilgilerini okur (PCSC komutları)
    /// </summary>
    private NfcCardData ReadCardInformation()
    {
        var cardData = new NfcCardData
        {
            ReaderName = _connectedReaderName!,
            ReadAt = DateTime.Now
        };

        try
        {
            // Basit UID okuma denemesi
            using var iso = new IsoReader(_context!, _connectedReaderName!, SCardShareMode.Shared, SCardProtocol.Any, false);
            var apdu = new CommandApdu(IsoCase.Case2Short, iso.ActiveProtocol)
            { CLA = 0xFF, INS = 0xCA, P1 = 0x00, P2 = 0x00, Le = 0x00 };
            var resp = iso.Transmit(apdu);

            if (resp.SW1 == 0x90 && resp.SW2 == 0x00 && resp.HasData)
            {
                var data = resp.GetData();
                cardData.Uid = data.ToArray();
                cardData.IsSuccess = true;
                DetectCardType(cardData);

                // NTAG215 tespiti için CC sayfasını kontrol et (0x03)
                try
                {
                    var cc = ReadPage(iso, 0x03);
                    if (cc != null && cc.Length == 4 && cc[0] == 0xE1 && cc[1] == 0x10)
                    {
                        // 0x3F => 504 bytes user memory => NTAG215 (muhtemel)
                        if (cc[2] == 0x3F)
                        {
                            cardData.CardType = "NTAG215";
                        }
                    }
                }
                catch { /* ignore */ }
                _logger.LogInformation($"UID başarıyla okundu: {cardData.UidHex}");

                // NDEF Text içeriğini okumayı dene (NTAG/Type2 varsayımı)
                try
                {
                    var ndefText = TryReadNdefText(iso);
                    if (ndefText != null && ndefText.Length > 0)
                    {
                        cardData.RawData = ndefText;
                        _logger.LogInformation($"NDEF Text okundu (len={ndefText.Length})");
                    }
                }
                catch (Exception nex)
                {
                    _logger.LogDebug(nex, "NDEF text okuma başarısız - yok sayılıyor");
                }
            }
            else
            {
                cardData.IsSuccess = false;
                cardData.ErrorMessage = $"UID okuma başarısız (SW={resp.SW1:X2}{resp.SW2:X2})";
                _logger.LogWarning(cardData.ErrorMessage);
            }

            return cardData;
        }
        catch (Exception ex)
        {
            cardData.IsSuccess = false;
            cardData.ErrorMessage = ex.Message;
            _logger.LogError(ex, "PCSC kart okuma hatası");
            return cardData;
        }
    }

    private static byte[]? TryReadNdefText(IsoReader iso)
    {
        // Type 2 Tag: NDEF TLV 0x03, terminator 0xFE, data page 0x04'ten başlar
        var buffer = new List<byte>(1024);
        const int startPage = 0x04;
        const int maxPages = 0x50; // güvenli sınır: ~80 sayfa
        for (int p = startPage; p < maxPages; p++)
        {
            var page = ReadPage(iso, (byte)p);
            if (page == null) break;
            buffer.AddRange(page);
            if (page[^1] == 0xFE) // terminator TLV sonu olabilir
                break;
        }

        var data = buffer.ToArray();
        if (data.Length < 8) return null;

        // TLV parse: 0x03 (NDEF), sonra length (1 byte veya 0xFF + 2 byte)
        int idx = 0;
        // Skip potential NULL TLV (0x00)
        while (idx < data.Length && data[idx] == 0x00) idx++;
        if (idx >= data.Length || data[idx] != 0x03) return null; // NDEF TLV yok
        idx++;
        int ndefLen;
        if (data[idx] == 0xFF)
        {
            if (idx + 2 >= data.Length) return null;
            ndefLen = (data[idx + 1] << 8) | data[idx + 2];
            idx += 3;
        }
        else
        {
            ndefLen = data[idx];
            idx += 1;
        }
        if (ndefLen <= 0 || idx + ndefLen > data.Length) return null;
        var ndef = data.Skip(idx).Take(ndefLen).ToArray();

        // NDEF record parse (SR varsayımı): D1 01 <plen> 54 'T' [status][lang..][text..]
        if (ndef.Length < 5) return null;
        byte header = ndef[0];
        bool sr = (header & 0x10) != 0; // SR bit
        if (!sr) return null; // kısa kayıt bekleniyor
        byte typeLen = ndef[1];
        int payloadLen = ndef[2];
        if (typeLen != 0x01) return null;
        if (ndef.Length < 3 + 1 + payloadLen) return null;
        byte type = ndef[3];
        if (type != 0x54) return null; // 'T'
        int payloadStart = 4;
        var payload = ndef.Skip(payloadStart).Take(payloadLen).ToArray();
        if (payload.Length == 0) return null;
        int langLen = payload[0] & 0x3F;
        int textStart = 1 + langLen;
        if (textStart > payload.Length) return null;
        return payload.Skip(textStart).ToArray();
    }

    /// <summary>
    /// Kart türünü belirlemeye çalışır
    /// </summary>
    private void DetectCardType(NfcCardData cardData)
    {
        if (cardData.Uid.Length == 4)
        {
            cardData.CardType = "MIFARE Classic 1K (muhtemel)";
        }
        else if (cardData.Uid.Length == 7)
        {
            cardData.CardType = "MIFARE Ultralight (muhtemel)";
        }
        else if (cardData.Uid.Length == 10)
        {
            cardData.CardType = "MIFARE Classic 4K (muhtemel)";
        }
        else
        {
            cardData.CardType = $"Bilinmeyen ({cardData.Uid.Length} byte UID)";
        }
    }

    /// <summary>
    /// Kart durumu monitoring ayarlar
    /// </summary>
    private void SetupCardMonitoring()
    {
        if (_context == null || _connectedReaderName == null) return;

        try
        {
            _monitor = new SCardMonitor(ContextFactory.Instance, SCardScope.System);
            _monitor.CardInserted += OnCardInserted;
            _monitor.CardRemoved += OnCardRemoved;
            _monitor.Start(_connectedReaderName);
            
            _logger.LogInformation("Kart monitoring başlatıldı");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kart monitoring kurulum hatası");
        }
    }

    /// <summary>
    /// Kart takılma olayı
    /// </summary>
    private void OnCardInserted(object? sender, CardStatusEventArgs e)
    {
        _logger.LogInformation($"Kart algılandı: {e.ReaderName}");
        CardDetected?.Invoke(this, new CardDetectedEventArgs
        {
            ReaderName = e.ReaderName,
            DetectedAt = DateTime.Now
        });
    }

    /// <summary>
    /// Kart çıkarılma olayı
    /// </summary>
    private void OnCardRemoved(object? sender, CardStatusEventArgs e)
    {
        _logger.LogInformation($"Kart çıkarıldı: {e.ReaderName}");
        CardRemoved?.Invoke(this, new CardRemovedEventArgs
        {
            ReaderName = e.ReaderName,
            RemovedAt = DateTime.Now
        });
    }

    /// <summary>
    /// Periyodik kart varlık kontrolü
    /// </summary>
    private async void CheckCardPresence(object? state)
    {
        if (_disposed || _reader == null) return;

        try
        {
            await IsCardPresentAsync();
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Kart varlık kontrol hatası");
        }
    }

    /// <summary>
    /// Kaynak temizleme
    /// </summary>
    public void Dispose()
    {
        if (_disposed) return;

        _disposed = true;
        _cardCheckTimer?.Dispose();
        
        DisconnectAsync().Wait(TimeSpan.FromSeconds(5));
        
        _context?.Dispose();
        
        _logger.LogInformation("Windows NFC Service temizlendi");
    }
}