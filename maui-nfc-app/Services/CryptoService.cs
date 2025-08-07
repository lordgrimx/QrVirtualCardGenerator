using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Net.Http.Json;

namespace MauiNfcApp.Services;

public class CryptoService : ICryptoService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<CryptoService> _logger;
    private RSA? _publicKey;
    private string? _cachedPublicKeyPem;

    public CryptoService(HttpClient httpClient, ILogger<CryptoService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<(bool IsValid, MemberData? MemberData, string? ErrorMessage)> VerifyQrSignatureAsync(string qrData)
    {
        try
        {
            _logger.LogInformation("QR kod doğrulaması başlatılıyor...");

            // QR veriyi parse et - Python backend ile aynı format
            var parts = qrData.Split('|');
            if (parts.Length != 3)
            {
                return (false, null, "Geçersiz QR kod formatı");
            }

            var payloadB64 = parts[0];
            var signatureB64 = parts[1];
            var metadataB64 = parts[2];

            // Base64 decode
            var payloadBytes = Convert.FromBase64String(payloadB64);
            var signature = Convert.FromBase64String(signatureB64);
            var metadataBytes = Convert.FromBase64String(metadataB64);

            // Metadata parse et
            var metadataJson = Encoding.UTF8.GetString(metadataBytes);
            var metadata = JsonSerializer.Deserialize<QrMetadata>(metadataJson);

            if (metadata == null)
            {
                return (false, null, "Geçersiz metadata");
            }

            // Public key'i al (cache'den veya backend'den)
            await EnsurePublicKeyLoadedAsync();
            
            if (_publicKey == null)
            {
                return (false, null, "Public key alınamadı");
            }

            // Key fingerprint kontrolü
            var expectedFingerprint = GetPublicKeyFingerprint(_cachedPublicKeyPem!);
            if (metadata.KeyId != expectedFingerprint)
            {
                return (false, null, "Geçersiz anahtar ID");
            }

            // Dijital imzayı doğrula (Python backend ile aynı algoritma)
            var isSignatureValid = _publicKey.VerifyData(
                payloadBytes,
                signature,
                HashAlgorithmName.SHA256,
                RSASignaturePadding.Pss);

            if (!isSignatureValid)
            {
                return (false, null, "Geçersiz dijital imza");
            }

            // Payload'ı decode et
            var payloadJson = Encoding.UTF8.GetString(payloadBytes);
            var memberData = JsonSerializer.Deserialize<MemberData>(payloadJson);

            if (memberData == null)
            {
                return (false, null, "Geçersiz member data");
            }

            // Expiration kontrolü
            if (DateTime.UtcNow > memberData.ExpiresAt)
            {
                return (false, null, "QR kod süresi dolmuş");
            }

            _logger.LogInformation($"QR kod başarıyla doğrulandı: {memberData.Name}");
            return (true, memberData, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "QR kod doğrulama hatası");
            return (false, null, $"Doğrulama hatası: {ex.Message}");
        }
    }

    public async Task<string> GetPublicKeyFromBackendAsync()
    {
        try
        {
            var response = await _httpClient.GetFromJsonAsync<PublicKeyResponse>("/api/qr/public-key");
            
            if (response?.Success == true && !string.IsNullOrEmpty(response.PublicKey))
            {
                _cachedPublicKeyPem = response.PublicKey;
                return response.PublicKey;
            }

            throw new Exception("Backend'den public key alınamadı");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Backend'den public key alma hatası");
            throw;
        }
    }

    public string GetPublicKeyFingerprint(string publicKeyPem)
    {
        try
        {
            using var rsa = RSA.Create();
            rsa.ImportFromPem(publicKeyPem);
            
            var publicKeyBytes = rsa.ExportSubjectPublicKeyInfo();
            using var sha256 = SHA256.Create();
            var hash = sha256.ComputeHash(publicKeyBytes);
            
            return Convert.ToHexString(hash)[..16].ToLowerInvariant();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Public key fingerprint oluşturma hatası");
            throw;
        }
    }

    public string DecryptAes(string encryptedData, string key, string iv)
    {
        try
        {
            using var aes = Aes.Create();
            aes.Key = Convert.FromBase64String(key);
            aes.IV = Convert.FromBase64String(iv);
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            var encryptedBytes = Convert.FromBase64String(encryptedData);
            
            using var decryptor = aes.CreateDecryptor();
            var decryptedBytes = decryptor.TransformFinalBlock(encryptedBytes, 0, encryptedBytes.Length);
            
            return Encoding.UTF8.GetString(decryptedBytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AES şifre çözme hatası");
            throw;
        }
    }

    private async Task EnsurePublicKeyLoadedAsync()
    {
        if (_publicKey != null && !string.IsNullOrEmpty(_cachedPublicKeyPem))
            return;

        try
        {
            var publicKeyPem = await GetPublicKeyFromBackendAsync();
            _publicKey = RSA.Create();
            _publicKey.ImportFromPem(publicKeyPem);
            
            _logger.LogInformation("Public key başarıyla yüklendi");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Public key yükleme hatası");
            throw;
        }
    }

    public void Dispose()
    {
        _publicKey?.Dispose();
    }
}

// Helper classes
public class QrMetadata
{
    public string Version { get; set; } = string.Empty;
    public string Algorithm { get; set; } = string.Empty;
    public string KeyId { get; set; } = string.Empty;
}

public class PublicKeyResponse
{
    public string PublicKey { get; set; } = string.Empty;
    public string Algorithm { get; set; } = string.Empty;
    public string KeyFormat { get; set; } = string.Empty;
    public string Usage { get; set; } = string.Empty;
    public string Organization { get; set; } = string.Empty;
    public bool Success { get; set; }
}
