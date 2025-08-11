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
                _baseUrl = Preferences.Default.Get("BackendBaseUrl", "https://qrvirtualcardgenerator.onrender.com");
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
        client.Timeout = TimeSpan.FromSeconds(10);
        return client;
    }

    public async Task<(bool ok, string? publicKeyPem, string? error)> GetPublicKeyAsync(CancellationToken ct = default)
    {
        try
        {
            var client = CreateClient();
            var url = $"{_baseUrl}/api/qr/public-key";
            var resp = await client.GetAsync(url, ct);
            if (!resp.IsSuccessStatusCode)
                return (false, null, $"HTTP {(int)resp.StatusCode}");

            var json = await resp.Content.ReadFromJsonAsync<PublicKeyResponse>(cancellationToken: ct);
            if (json?.success == true && !string.IsNullOrEmpty(json.public_key))
                return (true, json.public_key, null);

            return (false, null, "Geçersiz yanıt");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Public key alınamadı");
            return (false, null, ex.Message);
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
}


