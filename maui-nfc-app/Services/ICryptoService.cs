using System.Security.Cryptography;

namespace MauiNfcApp.Services;

public interface ICryptoService
{
    /// <summary>
    /// QR kod verilerini doğrulama - Python backend ile uyumlu
    /// </summary>
    Task<(bool IsValid, MemberData? MemberData, string? ErrorMessage)> VerifyQrSignatureAsync(string qrData);
    
    /// <summary>
    /// Public key fingerprint alma
    /// </summary>
    string GetPublicKeyFingerprint(string publicKeyPem);
    
    /// <summary>
    /// AES şifre çözme (ek güvenlik katmanı için)
    /// </summary>
    string DecryptAes(string encryptedData, string key, string iv);
    
    /// <summary>
    /// Backend'den public key alma
    /// </summary>
    Task<string> GetPublicKeyFromBackendAsync();
}

public class MemberData
{
    public int MemberId { get; set; }
    public string MembershipId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Organization { get; set; } = string.Empty;
    public DateTime IssuedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public string Nonce { get; set; } = string.Empty;
}
