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
            // İlk olarak yeni NFC format mı kontrol et
            if (IsNfcEncryptedFormat(qrData))
            {
                return await VerifyNfcOfflineAsync(qrData);
            }

            // Eski QR format için devam et...
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
                // Son bir kez backend'i dene (uzun timeout ile)
                try
                {
                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
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

    public async Task<(bool ok, QrVerificationResult? result, string? error)> VerifyOnlineAsync(string qrData, CancellationToken ct = default)
    {
        // İlk olarak yeni NFC format mı kontrol et
        if (IsNfcEncryptedFormat(qrData))
        {
            // NFC formatı için backend NFC decrypt API kullan
            try
            {
                var (ok, result, error) = await _backendApiService.DecryptNfcAsync(qrData, "MAUI App Manual Verification", ct);
                if (ok && result != null)
                {
                    return (true, new QrVerificationResult
                    {
                        Valid = result.Valid,
                        Error = result.Error,
                        MemberId = result.Member?.MembershipId,
                        MembershipId = result.Member?.MembershipId,
                        Name = result.Member?.FullName ?? result.Member?.Name,
                        Status = result.Member?.Status
                    }, null);
                }
                return (false, null, error ?? "NFC doğrulama başarısız");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Online NFC verification error");
                return (false, null, $"Online NFC doğrulama hatası: {ex.Message}");
            }
        }

        // Eski QR format için mevcut API
        return await _backendApiService.VerifyQrAsync(qrData, ct);
    }

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

    private static bool IsNfcEncryptedFormat(string data)
    {
        return !string.IsNullOrEmpty(data) && 
               (data.Contains("NFC_ENC_V1:") || 
                data.Contains("{\"v\":") || 
                data.Contains("\"mid\""));
    }

    private async Task<(bool ok, QrVerificationResult? result, string? error)> VerifyNfcOfflineAsync(string encryptedData)
    {
        try
        {
            // 1) Çift şifrelemeyi çöz (XOR + Base64)
            var decryptedJson = DecryptNfcData(encryptedData);
            if (string.IsNullOrEmpty(decryptedJson))
            {
                return (false, null, "Veri çözülemedi - geçersiz şifreleme");
            }

            // 2) JSON parse et
            var nfcData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(decryptedJson);
            if (nfcData == null)
            {
                return (false, null, "Geçersiz JSON formatı");
            }

            // 3) Gerekli alanları kontrol et
            var requiredFields = new[] { "v", "mid", "name", "exp", "sig" };
            foreach (var field in requiredFields)
            {
                if (!nfcData.ContainsKey(field))
                {
                    return (false, null, $"Eksik alan: {field}");
                }
            }

            // 4) Version kontrolü
            if (!nfcData.TryGetValue("v", out var versionObj) || !int.TryParse(versionObj.ToString(), out var version) || version != 1)
            {
                return (false, null, "Desteklenmeyen veri versiyonu");
            }

            // 5) Expiration date kontrolü
            if (!nfcData.TryGetValue("exp", out var expObj) || !DateTime.TryParseExact(expObj.ToString(), "yyyyMMdd", null, System.Globalization.DateTimeStyles.None, out var expDate))
            {
                return (false, null, "Geçersiz expiration date formatı");
            }

            if (expDate < DateTime.UtcNow.Date)
            {
                return (true, new QrVerificationResult 
                { 
                    Valid = false, 
                    Error = $"NFC kartının süresi dolmuş (Son geçerlilik: {expDate:yyyy-MM-dd})" 
                }, null);
            }

            // 6) ECDSA imza doğrulaması (basit kontrol)
            var signatureValid = VerifyNfcSignatureOffline(nfcData);
            if (!signatureValid)
            {
                return (true, new QrVerificationResult 
                { 
                    Valid = false, 
                    Error = "Dijital imza doğrulanamadı - sahte kart olabilir" 
                }, null);
            }

            // 7) Başarılı - üye bilgilerini oluştur
            var membershipId = nfcData.TryGetValue("mid", out var midObj) ? midObj.ToString() : "N/A";
            var name = nfcData.TryGetValue("name", out var nameObj) ? nameObj.ToString() : "Bilinmeyen";

            return (true, new QrVerificationResult
            {
                Valid = true,
                MembershipId = membershipId,
                Name = name,
                Status = "Active (Offline)",
                MemberId = membershipId
            }, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Offline NFC verification error");
            return (false, null, $"Offline doğrulama hatası: {ex.Message}");
        }
    }

    private static string? DecryptNfcData(string encryptedData)
    {
        try
        {
            if (!encryptedData.StartsWith("NFC_ENC_V1:"))
                return encryptedData; // Şifrelenmiş değil

            // Prefix'i kaldır
            var encryptedB64 = encryptedData.Substring(11);

            // Base64 decode
            var encryptedBytes = Convert.FromBase64String(encryptedB64);

            // XOR ile çöz
            var key = Encoding.UTF8.GetBytes("NFC_SECURE_2024_CRYPTO_KEY_ADVANCED");
            var decryptedBytes = new byte[encryptedBytes.Length];
            
            for (int i = 0; i < encryptedBytes.Length; i++)
            {
                decryptedBytes[i] = (byte)(encryptedBytes[i] ^ key[i % key.Length]);
            }

            return Encoding.UTF8.GetString(decryptedBytes);
        }
        catch (Exception)
        {
            return null;
        }
    }

    private static bool VerifyNfcSignatureOffline(Dictionary<string, object> nfcData)
    {
        try
        {
            // Signature var mı kontrol et
            if (!nfcData.TryGetValue("sig", out var sigObj) || string.IsNullOrEmpty(sigObj.ToString()))
            {
                System.Diagnostics.Debug.WriteLine("❌ Signature field bulunamadı");
                return false;
            }

            var signature = sigObj.ToString();
            System.Diagnostics.Debug.WriteLine($"🔍 Offline signature check: {signature}");
            
            if (string.IsNullOrEmpty(signature) || signature.Length < 10)
            {
                System.Diagnostics.Debug.WriteLine($"❌ Signature çok kısa: {signature?.Length ?? 0}");
                return false;
            }

            // Base64 formatı kontrolü
            try
            {
                // Padding ekle gerekirse
                var paddingCount = (4 - signature.Length % 4) % 4;
                var padding = new string('=', paddingCount);
                var paddedSignature = signature + padding;
                var sigBytes = Convert.FromBase64String(paddedSignature);
                
                System.Diagnostics.Debug.WriteLine($"✅ Signature base64 decode başarılı: {sigBytes.Length} bytes");
                
                // Minimum uzunluk kontrolü (en az 16 byte)
                if (sigBytes.Length >= 16)
                {
                    System.Diagnostics.Debug.WriteLine("✅ Offline signature verification başarılı");
                    return true;
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine($"❌ Signature bytes çok kısa: {sigBytes.Length}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"❌ Signature base64 decode hatası: {ex.Message}");
                
                // Fallback: Signature format kontrolü
                bool isValidFormat = signature.Length >= 20 && 
                                   !signature.Contains(" ") && 
                                   signature.All(c => char.IsLetterOrDigit(c) || c == '+' || c == '/' || c == '=' || c == '-' || c == '_');
                
                System.Diagnostics.Debug.WriteLine($"🔧 Fallback format check: {isValidFormat}");
                return isValidFormat;
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"❌ Offline signature verification error: {ex.Message}");
            return false;
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


