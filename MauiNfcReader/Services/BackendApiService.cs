using System.Net.Http.Json;
using System.Linq;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;
using MauiNfcReader.ViewModels;
using Microsoft.Maui.Storage;
using MauiNfcReader.Models;

namespace MauiNfcReader.Services;

public class BackendApiService : IBackendApiService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<BackendApiService> _logger;
    private readonly string _baseUrl;

    public BackendApiService(IHttpClientFactory httpClientFactory, ILogger<BackendApiService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        // 1) Derleme türüne göre Resources/Raw içindeki env dosyasını oku
        string? baseUrlFromEnvFile = null;
        try
        {
#if DEBUG
            baseUrlFromEnvFile = TryReadEnvValue("env.development", "BACKEND_BASE_URL");
#else
            baseUrlFromEnvFile = TryReadEnvValue("env.production", "BACKEND_BASE_URL");
#endif
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Env dosyası okunamadı");
        }

        if (!string.IsNullOrWhiteSpace(baseUrlFromEnvFile))
        {
            _baseUrl = baseUrlFromEnvFile!.TrimEnd('/');
            Preferences.Default.Set("BackendBaseUrl", _baseUrl);
        }
        else
        {
            // 2) Ortam değişkeni
            var envUrl = Environment.GetEnvironmentVariable("BACKEND_BASE_URL");
            if (!string.IsNullOrWhiteSpace(envUrl))
            {
                _baseUrl = envUrl.TrimEnd('/');
            }
            else
            {
                // 3) Önceden kaydedilmiş tercih ya da son çare default
                _baseUrl = Preferences.Default.Get("BackendBaseUrl", "https://backend.anefuye.com.tr");
            }
        }
    }

    private static string? TryReadEnvValue(string fileName, string key)
    {
        using var streamTask = FileSystem.OpenAppPackageFileAsync(fileName);
        streamTask.Wait();
        using var stream = streamTask.Result;
        using var reader = new StreamReader(stream);
        string? line;
        while ((line = reader.ReadLine()) != null)
        {
            if (line.TrimStart().StartsWith('#')) continue;
            var eqIndex = line.IndexOf('=');
            if (eqIndex <= 0) continue;
            var k = line.Substring(0, eqIndex).Trim();
            var v = line.Substring(eqIndex + 1).Trim();
            if (string.Equals(k, key, StringComparison.OrdinalIgnoreCase))
            {
                return v;
            }
        }
        return null;
    }

    private HttpClient CreateClient()
    {
        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(30); // Timeout'u 30 saniyeye çıkardık
        
        // User-Agent header ekle
        client.DefaultRequestHeaders.Add("User-Agent", "MauiNfcReader/1.0");
        
        // Accept header ekle  
        client.DefaultRequestHeaders.Add("Accept", "application/json");
        
        return client;
    }

    public async Task<(bool ok, string? publicKeyPem, string? error)> GetPublicKeyAsync(CancellationToken ct = default)
    {
        try
        {
            var client = CreateClient();
            var url = $"{_baseUrl}/api/qr/public-key";
            
            _logger.LogInformation($"Backend URL: {url}");
            
            var resp = await client.GetAsync(url, ct);
            _logger.LogInformation($"HTTP Status: {resp.StatusCode}");
            
            if (!resp.IsSuccessStatusCode)
            {
                var errorContent = await resp.Content.ReadAsStringAsync(ct);
                _logger.LogError($"HTTP Error {(int)resp.StatusCode}: {errorContent}");
                return (false, null, $"HTTP {(int)resp.StatusCode}: {errorContent}");
            }

            var jsonContent = await resp.Content.ReadAsStringAsync(ct);
            _logger.LogInformation($"Raw JSON Response: {jsonContent}");
            
            // JSON'u yeniden parse etmek için stream'i başa alalım
            using var jsonStream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(jsonContent));
            var json = await System.Text.Json.JsonSerializer.DeserializeAsync<PublicKeyResponse>(jsonStream, cancellationToken: ct);
            _logger.LogInformation($"Parsed JSON - Success: {json?.success}, PublicKey: {(json?.public_key?.Length > 0 ? "Mevcut" : "Yok")}");
            
            if (json?.success == true && !string.IsNullOrEmpty(json.public_key))
                return (true, json.public_key, null);

            return (false, null, $"Geçersiz yanıt - Success: {json?.success}, PublicKey Empty: {string.IsNullOrEmpty(json?.public_key)}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Public key alınamadı - Detaylı hata");
            return (false, null, $"Exception: {ex.Message} | Inner: {ex.InnerException?.Message}");
        }
    }

    public async Task<(bool ok, QrVerificationResult? result, string? error)> VerifyQrAsync(string qrData, CancellationToken ct = default)
    {
        try
        {
            var client = CreateClient();
            var url = $"{_baseUrl}/api/qr/verify";
            var payload = new { qr_code = qrData };
            var resp = await client.PostAsJsonAsync(url, payload, ct);
            if (!resp.IsSuccessStatusCode)
                return (false, null, $"HTTP {(int)resp.StatusCode}");

            var json = await resp.Content.ReadFromJsonAsync<QrVerifyResponse>(cancellationToken: ct);
            if (json?.success == true)
            {
                return (true, new QrVerificationResult
                {
                    Valid = json.valid,
                    Error = json.error,
                    MemberId = json.member_data?.member_id,
                    MembershipId = json.member_data?.membership_id,
                    Name = json.member_data?.name,
                    Status = json.member_data?.status
                }, null);
            }

            return (false, null, json?.error ?? "Doğrulama başarısız");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "QR doğrulama hatası");
            return (false, null, ex.Message);
        }
    }

    public async Task<(bool ok, QrVerificationResult? result, string? error)> VerifyCardRawAsync(string rawText, CancellationToken ct = default)
    {
        // Ham NDEF metnini backend'e gönder ve orada doğrulat
        return await VerifyQrAsync(rawText, ct);
    }

    public async Task<(bool ok, QrVerificationResult? result, string? error)> VerifyAndReadFromServerAsync(CancellationToken ct = default)
    {
        try
        {
            var client = CreateClient();
            var url = $"{_baseUrl}/api/nfc/verify-and-read";
            var resp = await client.PostAsync(url, null, ct);
            if (!resp.IsSuccessStatusCode)
                return (false, null, $"HTTP {(int)resp.StatusCode}");

            var json = await resp.Content.ReadFromJsonAsync<NfcVerifyReadResponse>(cancellationToken: ct);
            if (json?.success == true)
            {
                return (true, new QrVerificationResult
                {
                    Valid = json.qr_verification?.valid ?? false,
                    Error = json.qr_verification?.error,
                    MemberId = json.qr_verification?.member_data?.member_id,
                    MembershipId = json.qr_verification?.member_data?.membership_id,
                    Name = json.qr_verification?.member_data?.name,
                    Status = json.qr_verification?.member_data?.status
                }, null);
            }

            return (false, null, json?.error ?? "Sunucu NFC okuma/ doğrulama başarısız");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Sunucu NFC doğrulama hatası");
            return (false, null, ex.Message);
        }
    }

    public async Task<(bool ok, List<MemberInfo> members, string? error)> SearchMembersAsync(string query, CancellationToken ct = default)
    {
        try
        {
            var client = CreateClient();
            var url = string.IsNullOrWhiteSpace(query)
                ? $"{_baseUrl}/api/members?limit=20"
                : $"{_baseUrl}/api/members/search?q={Uri.EscapeDataString(query)}&limit=20";

            var resp = await client.GetAsync(url, ct);
            if (!resp.IsSuccessStatusCode)
                return (false, new List<MemberInfo>(), $"HTTP {(int)resp.StatusCode}");

            var json = await resp.Content.ReadFromJsonAsync<MemberSearchResponse>(cancellationToken: ct);
            if (json?.success == true && json.members != null)
            {
                var list = json.members.Select(m => new MemberInfo
                {
                    MemberId = m.member_id,
                    MembershipId = m.membership_id,
                    Name = m.name,
                    Status = m.status
                }).ToList();
                return (true, list, null);
            }
            return (false, new List<MemberInfo>(), json?.error ?? "Üye aranamadı");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Üye arama hatası");
            return (false, new List<MemberInfo>(), ex.Message);
        }
    }

    public async Task<(bool ok, NfcDecryptResult? result, string? error)> DecryptNfcAsync(string encryptedData, string? deviceInfo = null, CancellationToken ct = default)
    {
        try
        {
            var client = CreateClient();
            var url = $"{_baseUrl}/api/nfc/decrypt";
            var payload = new { encryptedData, deviceInfo };
            
            var resp = await client.PostAsJsonAsync(url, payload, ct);
            if (!resp.IsSuccessStatusCode)
                return (false, null, $"HTTP {(int)resp.StatusCode}");

            var json = await resp.Content.ReadFromJsonAsync<NfcDecryptResponse>(cancellationToken: ct);
            if (json?.success == true)
            {
                var result = new NfcDecryptResult
                {
                    Valid = json.valid,
                    Error = json.error,
                    Member = json.member != null ? new MemberDetails
                    {
                        MembershipId = json.member.membershipId,
                        Name = json.member.name,
                        FullName = json.member.fullName,
                        Email = json.member.email,
                        PhoneNumber = json.member.phoneNumber,
                        Role = json.member.role,
                        Status = json.member.status,
                        MembershipType = json.member.membershipType,
                        ExpirationDate = json.member.expirationDate,
                        JoinDate = json.member.joinDate,
                        FromDatabase = json.member.fromDatabase
                    } : null,
                    VerificationTime = json.verificationTime
                };
                return (true, result, null);
            }

            return (false, null, json?.error ?? json?.message ?? "NFC şifre çözme başarısız");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NFC şifre çözme hatası");
            return (false, null, ex.Message);
        }
    }

    internal sealed class MemberSearchResponse
    {
        public bool success { get; set; }
        public string? error { get; set; }
        public List<MemberDto>? members { get; set; }

        internal sealed class MemberDto
        {
            public string? member_id { get; set; }
            public string? membership_id { get; set; }
            public string? name { get; set; }
            public string? status { get; set; }
        }
    }

    private sealed class PublicKeyResponse
    {
        public string? public_key { get; set; }
        public bool success { get; set; }
        public string? algorithm { get; set; }
        public string? key_format { get; set; }
        public string? usage { get; set; }
        public string? organization { get; set; }
    }

    private sealed class QrVerifyResponse
    {
        public bool success { get; set; }
        public bool valid { get; set; }
        public string? error { get; set; }
        public MemberData? member_data { get; set; }

        public sealed class MemberData
        {
            public string? member_id { get; set; }
            public string? membership_id { get; set; }
            public string? name { get; set; }
            public string? status { get; set; }
        }
    }

    private sealed class NfcVerifyReadResponse
    {
        public bool success { get; set; }
        public string? error { get; set; }
        public QrVerification? qr_verification { get; set; }

        public sealed class QrVerification
        {
            public bool valid { get; set; }
            public string? error { get; set; }
            public QrVerifyResponse.MemberData? member_data { get; set; }
        }
    }

    private sealed class NfcDecryptResponse
    {
        public bool success { get; set; }
        public bool valid { get; set; }
        public string? error { get; set; }
        public string? message { get; set; }
        public NfcMemberDto? member { get; set; }
        public string? verificationTime { get; set; }

        public sealed class NfcMemberDto
        {
            public string? membershipId { get; set; }
            public string? name { get; set; }
            public string? fullName { get; set; }
            public string? email { get; set; }
            public string? phoneNumber { get; set; }
            public string? role { get; set; }
            public string? status { get; set; }
            public string? membershipType { get; set; }
            public string? expirationDate { get; set; }
            public string? joinDate { get; set; }
            public bool fromDatabase { get; set; }
        }
    }
}

public class NfcDecryptResult
{
    public bool Valid { get; set; }
    public string? Error { get; set; }
    public MemberDetails? Member { get; set; }
    public string? VerificationTime { get; set; }
}

public class MemberDetails
{
    public string? MembershipId { get; set; }
    public string? Name { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Role { get; set; }
    public string? Status { get; set; }
    public string? MembershipType { get; set; }
    public string? ExpirationDate { get; set; }
    public string? JoinDate { get; set; }
    public bool FromDatabase { get; set; }
}


