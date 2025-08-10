using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;

namespace MauiNfcReader.Services;

/// <summary>
/// AES tabanlı kriptografi servisi implementasyonu
/// </summary>
public class CryptoService : ICryptoService
{
    private readonly ILogger<CryptoService> _logger;

    public CryptoService(ILogger<CryptoService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// AES ile veri şifreler
    /// </summary>
    public async Task<byte[]> EncryptAsync(byte[] data, string key)
    {
        try
        {
            using var aes = Aes.Create();
            var keyBytes = Encoding.UTF8.GetBytes(key.PadRight(32).Substring(0, 32)); // 256-bit key
            aes.Key = keyBytes;
            aes.GenerateIV();

            using var encryptor = aes.CreateEncryptor();
            using var msEncrypt = new MemoryStream();
            
            // IV'yi başa ekle
            await msEncrypt.WriteAsync(aes.IV, 0, aes.IV.Length);
            
            using (var csEncrypt = new CryptoStream(msEncrypt, encryptor, CryptoStreamMode.Write))
            {
                await csEncrypt.WriteAsync(data, 0, data.Length);
            }

            return msEncrypt.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Veri şifreleme hatası");
            throw;
        }
    }

    /// <summary>
    /// AES ile veri şifresini çözer
    /// </summary>
    public async Task<byte[]> DecryptAsync(byte[] encryptedData, string key)
    {
        try
        {
            using var aes = Aes.Create();
            var keyBytes = Encoding.UTF8.GetBytes(key.PadRight(32).Substring(0, 32)); // 256-bit key
            aes.Key = keyBytes;

            // IV'yi al (ilk 16 byte)
            var iv = new byte[16];
            Array.Copy(encryptedData, 0, iv, 0, 16);
            aes.IV = iv;

            // Şifrelenmiş veriyi al (16. byte'tan sonrası)
            var cipherText = new byte[encryptedData.Length - 16];
            Array.Copy(encryptedData, 16, cipherText, 0, cipherText.Length);

            using var decryptor = aes.CreateDecryptor();
            using var msDecrypt = new MemoryStream(cipherText);
            using var csDecrypt = new CryptoStream(msDecrypt, decryptor, CryptoStreamMode.Read);
            using var msPlaintext = new MemoryStream();
            
            await csDecrypt.CopyToAsync(msPlaintext);
            return msPlaintext.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Veri şifre çözme hatası");
            throw;
        }
    }

    /// <summary>
    /// String veriyi şifreler ve Base64 döner
    /// </summary>
    public async Task<string> EncryptStringAsync(string plainText, string key)
    {
        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        var encryptedBytes = await EncryptAsync(plainBytes, key);
        return Convert.ToBase64String(encryptedBytes);
    }

    /// <summary>
    /// Base64 string şifresini çözer
    /// </summary>
    public async Task<string> DecryptStringAsync(string encryptedText, string key)
    {
        var encryptedBytes = Convert.FromBase64String(encryptedText);
        var decryptedBytes = await DecryptAsync(encryptedBytes, key);
        return Encoding.UTF8.GetString(decryptedBytes);
    }

    /// <summary>
    /// 256-bit rastgele AES anahtarı oluşturur
    /// </summary>
    public string GenerateKey()
    {
        using var rng = RandomNumberGenerator.Create();
        var keyBytes = new byte[32]; // 256-bit
        rng.GetBytes(keyBytes);
        return Convert.ToBase64String(keyBytes);
    }

    /// <summary>
    /// SHA256 hash hesaplar
    /// </summary>
    public string ComputeHash(byte[] data)
    {
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(data);
        return Convert.ToHexString(hashBytes);
    }
}
