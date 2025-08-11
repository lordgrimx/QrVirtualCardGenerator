using MauiNfcReader.ViewModels;
using MauiNfcReader.Models;

namespace MauiNfcReader.Services;

public interface IBackendApiService
{
    Task<(bool ok, string? publicKeyPem, string? error)> GetPublicKeyAsync(CancellationToken ct = default);
    Task<(bool ok, QrVerificationResult? result, string? error)> VerifyQrAsync(string qrData, CancellationToken ct = default);
    Task<(bool ok, QrVerificationResult? result, string? error)> VerifyAndReadFromServerAsync(CancellationToken ct = default);
    Task<(bool ok, QrVerificationResult? result, string? error)> VerifyCardRawAsync(string rawText, CancellationToken ct = default);

    /// <summary>
    /// Üye arama (search query boş ise ilk sayfa)
    /// </summary>
    Task<(bool ok, List<MemberInfo> members, string? error)> SearchMembersAsync(string query, CancellationToken ct = default);

    /// <summary>
    /// NFC şifrelenmiş veriyi backend'de çöz ve doğrula
    /// </summary>
    Task<(bool ok, NfcDecryptResult? result, string? error)> DecryptNfcAsync(string encryptedData, string? deviceInfo = null, CancellationToken ct = default);
}


