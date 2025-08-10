namespace MauiNfcReader.Models;

/// <summary>
/// NFC kart verilerini temsil eden model
/// </summary>
public class NfcCardData
{
    /// <summary>
    /// Kartın benzersiz kimliği (UID)
    /// </summary>
    public byte[] Uid { get; set; } = Array.Empty<byte>();
    
    /// <summary>
    /// UID'nin hex string formatı
    /// </summary>
    public string UidHex => Convert.ToHexString(Uid);
    
    /// <summary>
    /// Kart türü (MIFARE Classic, Ultralight, vb.)
    /// </summary>
    public string CardType { get; set; } = string.Empty;
    
    /// <summary>
    /// ATQA (Answer to Request Type A) değeri
    /// </summary>
    public byte[] Atqa { get; set; } = Array.Empty<byte>();
    
    /// <summary>
    /// SAK (Select Acknowledge) değeri
    /// </summary>
    public byte Sak { get; set; }
    
    /// <summary>
    /// Ham kart verisi (şifrelenmiş olabilir)
    /// </summary>
    public byte[] RawData { get; set; } = Array.Empty<byte>();
    
    /// <summary>
    /// Şifre çözülmüş veri (varsa)
    /// </summary>
    public string? DecryptedData { get; set; }
    
    /// <summary>
    /// Okuma zamanı
    /// </summary>
    public DateTime ReadAt { get; set; } = DateTime.Now;
    
    /// <summary>
    /// Okuyucu adı
    /// </summary>
    public string ReaderName { get; set; } = string.Empty;
    
    /// <summary>
    /// Başarılı okuma durumu
    /// </summary>
    public bool IsSuccess { get; set; }
    
    /// <summary>
    /// Hata mesajı (varsa)
    /// </summary>
    public string? ErrorMessage { get; set; }
    
    /// <summary>
    /// Kart bilgilerinin özet gösterimi
    /// </summary>
    public override string ToString()
    {
        return $"UID: {UidHex}, Type: {CardType}, Reader: {ReaderName}";
    }
}

public sealed class MemberInfo
{
    public string? MemberId { get; set; }
    public string? MembershipId { get; set; }
    public string? Name { get; set; }
    public string? Status { get; set; }

    public override string ToString() => $"{Name} ({MembershipId})";
}

/// <summary>
/// Desteklenen NFC kart türleri
/// </summary>
public enum NfcCardType
{
    Unknown,
    MifareClassic1K,
    MifareClassic4K,
    MifareUltralight,
    MifareUltralightC,
    NTAG213,
    NTAG215,
    NTAG216,
    ISO14443TypeA,
    ISO14443TypeB
}
