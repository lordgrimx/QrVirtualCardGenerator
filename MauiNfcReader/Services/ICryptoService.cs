namespace MauiNfcReader.Services;

/// <summary>
/// Kriptografi servisi interface'i
/// AES şifreleme/şifre çözme işlemleri için
/// </summary>
public interface ICryptoService
{
    /// <summary>
    /// AES ile veri şifreler
    /// </summary>
    Task<byte[]> EncryptAsync(byte[] data, string key);
    
    /// <summary>
    /// AES ile veri şifresini çözer
    /// </summary>
    Task<byte[]> DecryptAsync(byte[] encryptedData, string key);
    
    /// <summary>
    /// String veriyi şifreler
    /// </summary>
    Task<string> EncryptStringAsync(string plainText, string key);
    
    /// <summary>
    /// String veri şifresini çözer
    /// </summary>
    Task<string> DecryptStringAsync(string encryptedText, string key);
    
    /// <summary>
    /// Rastgele AES anahtarı oluşturur
    /// </summary>
    string GenerateKey();
    
    /// <summary>
    /// Veri hash'ini hesaplar (SHA256)
    /// </summary>
    string ComputeHash(byte[] data);
}
