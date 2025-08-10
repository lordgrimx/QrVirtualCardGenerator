using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using MauiNfcReader.ViewModels;
using Microsoft.Maui.Storage;

namespace MauiNfcReader.Services;

public class QrVerificationService : IQrVerificationService
{
    private readonly IBackendApiService _backendApiService;
    private readonly ILogger<QrVerificationService> _logger;

    // Uygulamaya gömülü son çare public key (kullanıcının ilettiği PEM)
    private const string EmbeddedFallbackPublicKeyPem =
        "-----BEGIN PUBLIC KEY-----\n" +
        "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyWZIuCkBd0TwoOrLXqih\n" +
        "+p4Km6EQJpdnAFRKF0fhUP30YWMD+vYFFqT2b0k593nsMuOGmP/FohD7QcQpRQlV\n" +
        "5/TZh8+srNN2NeGzjjmgQifh4mzJ5mhtkYeTvj6/vMVDdJN81xY+HCVkIZ6CpcGR\n" +
        "s7QSZwAB5FUtBv08vfXeAIQhNG7RNeITTztWaQR6no5rC1dERvtkwZgjS+nv/GAR\n" +
        "4weqoBYJwZHtINXIAL1l8ZUJutbpxPGdOx7F4YmSm0kA7mn8t+XkuNuXPxFOApBW\n" +
        "HIMp+rgoyt3YPLB3l1p3xlzupluIrYhiHYzFO8TQyN7lzwhGMzjOc+dos52ejldh\n" +
        "RwIDAQAB\n" +
        "-----END PUBLIC KEY-----\n";

    public QrVerificationService(IBackendApiService backendApiService, ILogger<QrVerificationService> logger)
    {
        _backendApiService = backendApiService;
        _logger = logger;
    }

    public async Task<(bool ok, QrVerificationResult? result, string? error)> VerifyOfflineAsync(string qrData, CancellationToken ct = default)
    {
        try
        {
            // Public key edinme stratejisi:
            // 1) Backend'den almayı dene (varsa local cache'e yaz)
            // 2) Backend yoksa Preferences cache
            // 3) Paketlenmiş kaynak: Resources/Raw/public_key.pem

            string? publicKeyPem = null;
            try
            {
                var (ok, pem, _) = await _backendApiService.GetPublicKeyAsync(ct);
                if (ok && !string.IsNullOrWhiteSpace(pem))
                {
                    publicKeyPem = pem;
                    Preferences.Default.Set("CachedPublicKeyPem", pem);
                }
            }
            catch
            {
                // ignore; diğer kaynaklara düşülecek
            }

            if (string.IsNullOrWhiteSpace(publicKeyPem))
            {
                var cached = Preferences.Default.Get<string>("CachedPublicKeyPem", string.Empty);
                if (!string.IsNullOrWhiteSpace(cached))
                    publicKeyPem = cached;
            }

            if (string.IsNullOrWhiteSpace(publicKeyPem))
            {
                try
                {
                    using var stream = await FileSystem.OpenAppPackageFileAsync("public_key.pem");
                    using var reader = new StreamReader(stream);
                    publicKeyPem = await reader.ReadToEndAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "public_key.pem okunamadı, Raw/public_key.pem deneniyor");
                    try
                    {
                        using var stream2 = await FileSystem.OpenAppPackageFileAsync("Raw/public_key.pem");
                        using var reader2 = new StreamReader(stream2);
                        publicKeyPem = await reader2.ReadToEndAsync();
                    }
                    catch (Exception ex2)
                    {
                        _logger.LogDebug(ex2, "Raw/public_key.pem de okunamadı");
                    }
                }
            }

            if (string.IsNullOrWhiteSpace(publicKeyPem))
            {
                // Son bir kez backend'i dene (kısa timeout ile)
                try
                {
                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
                    var (ok2, pem2, _) = await _backendApiService.GetPublicKeyAsync(cts.Token);
                    if (ok2 && !string.IsNullOrWhiteSpace(pem2))
                    {
                        publicKeyPem = pem2;
                        Preferences.Default.Set("CachedPublicKeyPem", pem2);
                    }
                }
                catch { }
            }

            if (string.IsNullOrWhiteSpace(publicKeyPem))
            {
                // Son çare: uygulamaya gömülü public key
                publicKeyPem = EmbeddedFallbackPublicKeyPem;
            }

            if (string.IsNullOrWhiteSpace(publicKeyPem))
                return (false, null, "Public key mevcut değil");

            var parse = ParseSecureQr(qrData);
            if (!parse.ok || parse.payloadBytes == null || parse.signature == null)
                return (false, null, parse.error ?? "Geçersiz QR formatı");

            using var rsa = RSA.Create();
            rsa.ImportFromPem(publicKeyPem);

            var verified = rsa.VerifyData(
                parse.payloadBytes,
                parse.signature,
                HashAlgorithmName.SHA256,
                RSASignaturePadding.Pss);

            if (!verified)
                return (true, new QrVerificationResult { Valid = false, Error = "Geçersiz dijital imza" }, null);

            var payloadText = Encoding.UTF8.GetString(parse.payloadBytes);
            var model = System.Text.Json.JsonSerializer.Deserialize<SecurePayload>(payloadText);
            if (model == null)
                return (false, null, "Payload çözülemedi");

            // Basit süre kontrolü
            if (DateTime.TryParse(model.expires_at, out var exp) && DateTime.UtcNow > exp)
                return (true, new QrVerificationResult { Valid = false, Error = "Süresi dolmuş" }, null);

            return (true, new QrVerificationResult
            {
                Valid = true,
                MemberId = model.member_id,
                MembershipId = model.membership_id,
                Name = model.name,
                Status = model.status
            }, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Offline doğrulama hatası");
            return (false, null, ex.Message);
        }
    }

    public Task<(bool ok, QrVerificationResult? result, string? error)> VerifyOnlineAsync(string qrData, CancellationToken ct = default)
        => _backendApiService.VerifyQrAsync(qrData, ct);

    private static (bool ok, byte[]? payloadBytes, byte[]? signature, string? error) ParseSecureQr(string qrData)
    {
        try
        {
            // Normalize input
            var s = (qrData ?? string.Empty).Trim();
            if (string.IsNullOrEmpty(s)) return (false, null, null, "Boş veri");

            // If looks like HEX (no '|'), try hex->ASCII first
            bool LooksHex(string t) => t.Length % 2 == 0 && t.All(c =>
                (c >= '0' && c <= '9') || (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f'));

            string TryHexToAscii(string t)
            {
                try
                {
                    var bytes = Convert.FromHexString(t);
                    return Encoding.UTF8.GetString(bytes);
                }
                catch { return t; }
            }

            if (!s.Contains('|') && LooksHex(s))
                s = TryHexToAscii(s).Trim();

            // Strip quotes if entire string is quoted
            if ((s.StartsWith("\"") && s.EndsWith("\"")) || (s.StartsWith("'") && s.EndsWith("'")))
                s = s[1..^1];

            // Replace exotic separators and collapse whitespace
            s = s.Replace('\n', ' ').Replace('\r', ' ').Replace("‖", "|").Replace("｜", "|").Trim();

            // Attempt to extract core triplet if wrapped (e.g., url?q=...)
            int firstBar = s.IndexOf('|');
            int lastBar = s.LastIndexOf('|');
            if (firstBar > 0 && lastBar > firstBar)
                s = s.Substring(0, lastBar + 1).Substring(s.IndexOfAny(new[] { '|', '|' }) >= 0 ? 0 : 0); // noop, keep s

            var parts = s.Split('|');
            if (parts.Length != 3)
            {
                // Try URL param extraction
                try
                {
                    var uri = new Uri(s, UriKind.RelativeOrAbsolute);
                    if (uri.IsAbsoluteUri)
                    {
                        var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
                        var data = query.Get("qr") ?? query.Get("data") ?? query.Get("code");
                        if (!string.IsNullOrWhiteSpace(data))
                        {
                            s = data;
                            parts = s.Split('|');
                        }
                    }
                }
                catch { }
            }

            if (parts.Length != 3) return (false, null, null, "Parça sayısı geçersiz");

            var payloadBytes = Convert.FromBase64String(parts[0]);
            var signature = Convert.FromBase64String(parts[1]);
            return (true, payloadBytes, signature, null);
        }
        catch (Exception ex)
        {
            return (false, null, null, ex.Message);
        }
    }

    private sealed class SecurePayload
    {
        public string? member_id { get; set; }
        public string? membership_id { get; set; }
        public string? name { get; set; }
        public string? status { get; set; }
        public string? expires_at { get; set; }
    }
}


